import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import * as Crypto from "expo-crypto";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
  where,
} from "firebase/firestore/lite";
import { db } from "../credenciales";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  idToken: string | null;
};

export type FamilySummary = {
  id: string;
  name: string;
  role: "owner" | "member";
};

export type BootstrapData = {
  families: FamilySummary[];
};

export type FamilyWorkspace = {
  familyId: string;
  familyName: string;
  role: "owner" | "member";
};

export type DashboardData = {
  templates: string[];
  summary: {
    pendingItems: number;
    completedThisWeek: number;
  };
};

export type CreateFamilyMemberInput = {
  name: string;
  emailMember: string;
  bank: string;
  contract: string;
  state: "ACTIVE" | "INACTIVE";
};

export type CreateFamilyPeriodInput = {
  periodId: string;
  name: string;
};

export type CreateFamilyPocketInput = {
  name: string;
  bank: string;
  contract: string;
  typeRule: "$" | "%" | "-";
  valueRule: number;
  category: "GASTO" | "AHORRO";
};

export type CreateFamilyCommitmentInput = {
  commitmentOriginType: "BOLSA" | "MIEMBRO";
  originId: string;
  commitmentConcept: string;
  reference: string;
  estimatedValue: number;
  endedDate: string | null;
  period: "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICO";
};

export type UpdateFamilyCommitmentInput = Partial<CreateFamilyCommitmentInput>;
export type UpdateFamilyPocketInput = Partial<CreateFamilyPocketInput>;

export type CreateFamilyPocketBalanceInput = {
  periodId: string;
  pocketId: string;
  balanceValue: number;
};

export type CreateFamilyMovementInput = {
  periodId: string;
  movementConcept: string;
  movementType: "INGRESO" | "COMPROMISO" | "RESERVADO" | "GASTO";
  value: number;
  originType: "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO";
  referenceOrigin: string;
  destinationType: "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO";
  referenceDestination: string;
};

export type CreateFamilyInitialIncomeInput = {
  memberId: string;
  realValue: number;
};

type FamilyViewName = "inicio" | "bolsas" | "movimientos" | "historial";

const WEB_CLIENT_ID = "825372275802-fb4ov3ivbkkkndlvrmsv8iono3q76bon.apps.googleusercontent.com";

let isGoogleConfigured = false;

function ensureGoogleConfigured() {
  if (isGoogleConfigured) return;

  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
  });

  isGoogleConfigured = true;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function mapRoleFromDb(rawRole: unknown): "owner" | "member" {
  const value = String(rawRole || "").toUpperCase();
  if (value === "OWNER" || value === "CREADOR" || value === "ADMIN") {
    return "owner";
  }
  return "member";
}

function resolveUserId(user: AuthenticatedUser) {
  const id = String(user.id || "").trim();
  if (id) return id;
  return String(user.email || "").trim().toLowerCase();
}

function normalizePeriodId(periodIdRaw: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(String(periodIdRaw || "").trim());
  if (!match) {
    throw new Error("INVALID_PERIOD_ID");
  }

  return `${match[1]}-${match[2]}`;
}

function getCycleStateUpper(data: Record<string, unknown>) {
  const directState = String(data.state || "").trim();
  const nestedIdCycle = data.id_cycle as { state?: unknown } | undefined;
  const nestedIdCycleAlt = data.idCycle as { state?: unknown } | undefined;
  const nestedState = String(nestedIdCycle?.state || nestedIdCycleAlt?.state || "").trim();
  return String(directState || nestedState).toUpperCase();
}

async function ensureUserProfile(user: AuthenticatedUser): Promise<string> {
  const userId = resolveUserId(user);
  if (!userId) {
    throw new Error("USER_ID_REQUIRED");
  }

  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);

  const base = {
    email: user.email,
    displayName: user.name,
    state: "ACTIVE",
    updatedAt: serverTimestamp(),
  };

  if (userSnap.exists()) {
    await setDoc(userRef, base, { merge: true });
  } else {
    await setDoc(userRef, {
      ...base,
      createdAt: serverTimestamp(),
    });
  }

  return userId;
}

async function getFamilySummaryById(familyId: string, role: "owner" | "member"): Promise<FamilySummary | null> {
  const ref = doc(db, "families", familyId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    return null;
  }

  const data = snap.data();
  const name = String(data.name || data.nombreFamilia || "").trim();

  if (!name) {
    return null;
  }

  if (String(data.state || data.status || data.estado || "ACTIVA").toUpperCase() !== "ACTIVE") {
    return null;
  }

  return {
    id: familyId,
    name,
    role,
  };
}

async function getActiveDocsByState(
  familyId: string,
  subcollection: "members" | "pockets"
) {
  const ref = collection(db, "families", familyId, subcollection);
  const snap = subcollection === "members"
    ? await getDocs(query(ref, where("state", "==", "ACTIVE")))
    : await getDocs(ref);
  return snap.docs;
}

async function getPendingCommitmentsDocs(familyId: string) {
  const ref = collection(db, "families", familyId, "commitments");
  const q = query(ref, where("state", "in", ["PENDIENTE", "RESERVADO"]));
  const snap = await getDocs(q);
  return snap.docs;
}

async function getCycleMovementsDocs(familyId: string, periodId: string) {
  const ref = collection(db, "families", familyId, "cycles", periodId, "movements");
  const q = query(ref, orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs;
}

async function getCyclesDocs(familyId: string) {
  const ref = collection(db, "families", familyId, "cycles");
  const q = query(ref, orderBy("createdAt", "desc"), limit(24));
  const snap = await getDocs(q);
  return snap.docs;
}

async function getCycleIncomesDocs(familyId: string, periodId: string) {
  const ref = collection(db, "families", familyId, "cycles", periodId, "incomes");
  const q = query(ref, orderBy("createdAt", "desc"), limit(200));
  const snap = await getDocs(q);
  return snap.docs;
}

async function getCyclePocketBalancesDocs(familyId: string, periodId: string) {
  const ref = collection(db, "families", familyId, "cycles", periodId, "pocketBalances");
  const q = query(ref, orderBy("createdAt", "desc"), limit(300));
  const snap = await getDocs(q);
  return snap.docs;
}

// Compatibilidad con naming de GAS para mantener el modelo de vistas/modales.
export async function getFamilyDashboard(familyId: string): Promise<DashboardData> {
  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);

  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const familyData = familySnap.data();
  const familyName = String(familyData.name || "").trim() || "Familia";

  const [, pockets, commitments, periods] = await Promise.all([
    getActiveDocsByState(familyId, "members"),
    getActiveDocsByState(familyId, "pockets"),
    getPendingCommitmentsDocs(familyId),
    getCyclesDocs(familyId),
  ]);

  const plannedCycle = periods.find(
    (row) => String(row.data().state || "").toUpperCase() === "PLANIFICADO"
  );
  const activeCycle = periods.find((row) => {
    const state = String(row.data().state || "").toUpperCase();
    return state === "ABIERTO";
  });
  const currentCycle = activeCycle ?? plannedCycle;
  if (currentCycle) {
    await removeInitializationIncomeMovements(familyId, currentCycle.id);
  }
  const movements = currentCycle ? await getCycleMovementsDocs(familyId, currentCycle.id) : [];

  const templates = pockets.slice(0, 3).map((docSnap) => {
    const row = docSnap.data();
    return String(row.name || row.nombre || `Bolsa ${docSnap.id}`);
  });

  return {
    templates: templates.length > 0
      ? templates
      : [`${familyName} - Plantilla base`, `${familyName} - Flujo mensual`],
    summary: {
      pendingItems: commitments.length,
      completedThisWeek: Math.max(0, movements.length - commitments.length),
    },
  };
}

// Compatibilidad con naming de GAS. Devuelve payload base por vista/tab.
export async function getFamilyViewData(familyId: string, viewName: FamilyViewName) {
  const [members, pockets, commitments, periods] = await Promise.all([
    getActiveDocsByState(familyId, "members"),
    getActiveDocsByState(familyId, "pockets"),
    getPendingCommitmentsDocs(familyId),
    getCyclesDocs(familyId),
  ]);

  const plannedCycle = periods.find(
    (row) => String(row.data().state || "").toUpperCase() === "PLANIFICADO"
  );
  const activeCycle = periods.find((row) => {
    const state = String(row.data().state || "").toUpperCase();
    return state === "ABIERTO";
  });
  const currentCycle = activeCycle ?? plannedCycle;
  if (currentCycle) {
    await removeInitializationIncomeMovements(familyId, currentCycle.id);
  }
  const movements = currentCycle ? await getCycleMovementsDocs(familyId, currentCycle.id) : [];
  const incomes = currentCycle ? await getCycleIncomesDocs(familyId, currentCycle.id) : [];
  const pocketBalances = currentCycle ? await getCyclePocketBalancesDocs(familyId, currentCycle.id) : [];

  if (viewName === "bolsas") {
    return {
      members: members.map((d) => ({ id: d.id, ...d.data() })),
      pockets: pockets.map((d) => ({ id: d.id, ...d.data() })),
      commitments: commitments.map((d) => ({ id: d.id, ...d.data() })),
      periods: periods.map((d) => ({ id: d.id, ...d.data() })),
      incomes: incomes.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", ...d.data() })),
      pocketBalances: pocketBalances.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", ...d.data() })),
    };
  }

  if (viewName === "movimientos" || viewName === "historial") {
    return {
      movements: movements.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", periodId: currentCycle?.id || "", ...d.data() })),
      members: members.map((d) => ({ id: d.id, ...d.data() })),
      pockets: pockets.map((d) => ({ id: d.id, ...d.data() })),
      periods: periods.map((d) => ({ id: d.id, ...d.data() })),
      incomes: incomes.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", ...d.data() })),
      pocketBalances: pocketBalances.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", ...d.data() })),
    };
  }

  return {
    members: members.map((d) => ({ id: d.id, ...d.data() })),
    pockets: pockets.map((d) => ({ id: d.id, ...d.data() })),
    commitments: commitments.map((d) => ({ id: d.id, ...d.data() })),
    movements: movements.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", periodId: currentCycle?.id || "", ...d.data() })),
    periods: periods.map((d) => ({ id: d.id, ...d.data() })),
    incomes: incomes.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", ...d.data() })),
    pocketBalances: pocketBalances.map((d) => ({ id: d.id, cycleId: currentCycle?.id || "", ...d.data() })),
  };
}

export async function loginWithGoogle(): Promise<AuthenticatedUser> {
  ensureGoogleConfigured();

  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const response = await GoogleSignin.signIn();

    if (response.type !== "success") {
      throw new Error("LOGIN_CANCELLED");
    }

    const { user, idToken } = response.data;

    return {
      id: user.id,
      name: user.name ?? "Sin nombre",
      email: user.email,
      idToken: idToken ?? null,
    };
  } catch (error: unknown) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const err = error as { code: string };

      if (err.code === statusCodes.IN_PROGRESS) {
        throw new Error("LOGIN_IN_PROGRESS");
      }

      if (err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error("PLAY_SERVICES_NOT_AVAILABLE");
      }
    }

    throw error;
  }
}

export async function getV1Bootstrap(_user: AuthenticatedUser): Promise<BootstrapData> {
  const userId = await ensureUserProfile(_user);
  const membershipsRef = collection(db, "users", userId, "families");
  const membershipsSnap = await getDocs(membershipsRef);

  const families: FamilySummary[] = [];
  for (const membershipDoc of membershipsSnap.docs) {
    const membership = membershipDoc.data();
    const state = String(membership.state || "ACTIVE").toUpperCase();
    if (state !== "ACTIVE") {
      continue;
    }

    const familyId = String(membership.familyId || membershipDoc.id || "").trim();
    if (!familyId) {
      continue;
    }

    const role = mapRoleFromDb(membership.role);
    const summary = await getFamilySummaryById(familyId, role);
    if (summary) {
      families.push(summary);
    }
  }

  return { families };
}

// Equivalente inicial de enterFamily desde GAS.
export async function enterFamily(user: AuthenticatedUser, familyId: string): Promise<FamilyWorkspace> {
  return accessFamily(user, familyId);
}

export async function accessFamily(
  user: AuthenticatedUser,
  familyId: string
): Promise<FamilyWorkspace> {
  const bootstrap = await getV1Bootstrap(user);
  const family = bootstrap.families.find((item) => item.id === familyId);

  if (!family) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  await delay(250);

  return {
    familyId: family.id,
    familyName: family.name,
    role: family.role,
  };
}

export async function createFamilyTemplate(
  user: AuthenticatedUser,
  templateName: string
): Promise<FamilySummary> {
  const userId = await ensureUserProfile(user);
  const familyRef = doc(collection(db, "families"));
  const familyId = familyRef.id;
  const now = serverTimestamp();
  const safeName = String(templateName || "").trim() || `Plantilla de ${user.name}`;

  const userFamilyRef = doc(db, "users", userId, "families", familyId);
  const familyUserRef = doc(db, "families", familyId, "familyUsers", userId);
  const batch = writeBatch(db);

  batch.set(familyRef, {
    name: safeName,
    mainUserId: userId,
    state: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });

  batch.set(userFamilyRef, {
    familyId,
    role: "OWNER",
    state: "ACTIVE",
    joinedAt: now,
  }, { merge: true });

  batch.set(familyUserRef, {
    userId,
    email: user.email,
    role: "OWNER",
    state: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  await batch.commit();

  return {
    id: familyId,
    name: safeName,
    role: "owner",
  };
}

export async function joinExistingFamily(user: AuthenticatedUser, familyIdRaw: string): Promise<FamilySummary> {
  const userId = await ensureUserProfile(user);
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const summary = await getFamilySummaryById(familyId, "member");
  if (!summary) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const now = serverTimestamp();
  const userFamilyRef = doc(db, "users", userId, "families", familyId);
  const familyUserRef = doc(db, "families", familyId, "familyUsers", userId);
  const batch = writeBatch(db);

  batch.set(userFamilyRef, {
    familyId,
    role: "MEMBER",
    state: "ACTIVE",
    joinedAt: now,
  }, { merge: true });

  batch.set(familyUserRef, {
    userId,
    email: user.email,
    role: "MEMBER",
    state: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  }, { merge: true });

  await batch.commit();

  return summary;
}

export async function createFamilyMember(
  familyIdRaw: string,
  input: CreateFamilyMemberInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const name = String(input.name || "").trim();
  const emailMember = String(input.emailMember || "").trim().toLowerCase();
  const bank = String(input.bank || "").trim();
  const contract = String(input.contract || "").trim();
  const state = input.state === "INACTIVE" ? "INACTIVE" : "ACTIVE";

  if (!name || !emailMember || !bank || !contract) {
    throw new Error("MEMBER_FIELDS_REQUIRED");
  }

  const memberId = Crypto.randomUUID();
  const now = serverTimestamp();
  const memberRef = doc(db, "families", familyId, "members", memberId);
  const userByEmailQuery = query(collection(db, "users"), where("email", "==", emailMember), limit(1));
  const userByEmailSnap = await getDocs(userByEmailQuery);
  const resolvedUserId = userByEmailSnap.empty ? null : String(userByEmailSnap.docs[0].id || "").trim() || null;

  await setDoc(memberRef, {
    userId: resolvedUserId,
    name,
    emailMember,
    bank,
    contract,
    state,
    createdAt: now,
    updatedAt: now,
  });

  return memberId;
}

export type UpdateFamilyMemberInput = Partial<Pick<CreateFamilyMemberInput, "name" | "emailMember" | "bank" | "contract" | "state">>;

export async function updateFamilyMember(
  familyIdRaw: string,
  memberIdRaw: string,
  input: UpdateFamilyMemberInput
): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const memberId = String(memberIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }
  if (!memberId) {
    throw new Error("MEMBER_ID_REQUIRED");
  }

  const memberRef = doc(db, "families", familyId, "members", memberId);
  await setDoc(memberRef, input, { merge: true });
}

export async function createFamilyPeriod(
  familyIdRaw: string,
  input: CreateFamilyPeriodInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const normalizedPeriodId = normalizePeriodId(input.periodId);
  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("PERIOD_NAME_REQUIRED");
  }

  const periodRef = doc(db, "families", familyId, "cycles", normalizedPeriodId);
  const periodSnap = await getDoc(periodRef);
  if (periodSnap.exists()) {
    throw new Error("PERIOD_ALREADY_EXISTS");
  }

  const now = serverTimestamp();
  await setDoc(periodRef, {
    name,
    state: "PLANIFICADO",
    expectedTotalIncome: 0,
    realTotalIncome: 0,
    createdAt: now,
    updatedAt: now,
  });

  return normalizedPeriodId;
}

export async function createFamilyPocket(
  familyIdRaw: string,
  input: CreateFamilyPocketInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const name = String(input.name || "").trim();
  const bank = String(input.bank || "").trim();
  const contract = String(input.contract || "").trim();
  const typeRule = input.typeRule;
  const inputValueRule = Number(input.valueRule);
  const category = input.category;

  if (!name || !bank || !contract) {
    throw new Error("POCKET_FIELDS_REQUIRED");
  }

  const pocketsSnap = await getDocs(collection(db, "families", familyId, "pockets"));
  const activePockets = pocketsSnap.docs.map((row) => row.data());

  const hasExistingRemainingPocket = activePockets.some((row) => String(row.typeRule || "") === "-");
  if (typeRule === "-" && hasExistingRemainingPocket) {
    throw new Error("ONLY_ONE_REMAINING_POCKET_ALLOWED");
  }

  let valueRule = inputValueRule;
  if (typeRule === "-") {
    const cyclesSnap = await getDocs(collection(db, "families", familyId, "cycles"));
    const plannedCycle = cyclesSnap.docs.find(
      (row) => String(row.data().state || "").toUpperCase() === "PLANIFICADO"
    );

    if (!plannedCycle) {
      throw new Error("PLANNED_CYCLE_REQUIRED_FOR_REMAINING_POCKET");
    }

    const expectedTotalIncome = Number(plannedCycle.data().expectedTotalIncome || 0);
    if (!Number.isFinite(expectedTotalIncome) || expectedTotalIncome <= 0) {
      throw new Error("EXPECTED_TOTAL_INCOME_REQUIRED");
    }

    const distributed = activePockets.reduce((acc, row) => {
      const rowTypeRule = String(row.typeRule || "");
      const rowValueRule = Number(row.valueRule || 0);

      if (!Number.isFinite(rowValueRule) || rowTypeRule === "-") {
        return acc;
      }

      if (rowTypeRule === "%") {
        return acc + (expectedTotalIncome * rowValueRule) / 100;
      }

      return acc + rowValueRule;
    }, 0);

    const calculatedRemaining = expectedTotalIncome - distributed;
    valueRule = Number.isFinite(calculatedRemaining) ? Math.max(0, calculatedRemaining) : 0;
  } else if (!Number.isFinite(valueRule)) {
    throw new Error("POCKET_FIELDS_REQUIRED");
  } else {
    valueRule = Math.max(0, valueRule);
  }

  const pocketId = Crypto.randomUUID();
  const now = serverTimestamp();
  const pocketRef = doc(db, "families", familyId, "pockets", pocketId);

  await setDoc(pocketRef, {
    name,
    bank,
    contract,
    typeRule,
    valueRule,
    category,
    priority: 0,
    createdAt: now,
    updatedAt: now,
  });

  return pocketId;
}

export async function createFamilyCommitment(
  familyIdRaw: string,
  input: CreateFamilyCommitmentInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const commitmentOriginType = input.commitmentOriginType;
  const originId = String(input.originId || "").trim();
  const commitmentConcept = String(input.commitmentConcept || "").trim();
  const reference = String(input.reference || "").trim();
  const estimatedValue = Number(input.estimatedValue);
  const endedDate = input.endedDate ? String(input.endedDate).trim() : null;
  const period = input.period;

  if (!originId || !commitmentConcept || !reference || !Number.isFinite(estimatedValue)) {
    throw new Error("COMMITMENT_FIELDS_REQUIRED");
  }

  const commitmentId = Crypto.randomUUID();
  const now = serverTimestamp();
  const commitmentRef = doc(db, "families", familyId, "commitments", commitmentId);

  await setDoc(commitmentRef, {
    commitmentOriginType,
    originId,
    commitmentConcept,
    reference,
    estimatedValue,
    realValue: 0,
    endedDate,
    period,
    lastPayDate: null,
    state: "PENDIENTE",
    createdAt: now,
    updatedAt: now,
  });

  if (commitmentOriginType === "MIEMBRO") {
    const periodId = await resolveBudgetCycleIdForCommitmentImpact(familyId);
    await applyMemberCommitmentDeltaToIncome(familyId, periodId, originId, -estimatedValue);
    await finalizeCommitmentIncomeImpact(familyId, periodId);
  }

  return commitmentId;
}

async function assertPlannedCycleForAction(familyId: string, periodIdRaw: string) {
  const periodId = normalizePeriodId(periodIdRaw);
  const periodRef = doc(db, "families", familyId, "cycles", periodId);
  const periodSnap = await getDoc(periodRef);
  if (!periodSnap.exists()) {
    throw new Error("PERIOD_NOT_FOUND");
  }

  const state = getCycleStateUpper(periodSnap.data() as Record<string, unknown>);
  if (state !== "PLANIFICADO") {
    throw new Error("ONLY_PLANNED_CYCLE_ALLOWS_DELETE_OR_UPDATE");
  }

  return periodId;
}

export async function updateFamilyCommitment(
  familyIdRaw: string,
  commitmentIdRaw: string,
  periodIdRaw: string,
  input: UpdateFamilyCommitmentInput
): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const commitmentId = String(commitmentIdRaw || "").trim();
  if (!familyId) throw new Error("FAMILY_ID_REQUIRED");
  if (!commitmentId) throw new Error("COMMITMENT_ID_REQUIRED");

  if (String(periodIdRaw || "").trim()) {
    normalizePeriodId(String(periodIdRaw || ""));
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.commitmentOriginType) payload.commitmentOriginType = input.commitmentOriginType;
  if (input.originId !== undefined) payload.originId = String(input.originId || "").trim();
  if (input.commitmentConcept !== undefined) payload.commitmentConcept = String(input.commitmentConcept || "").trim();
  if (input.reference !== undefined) payload.reference = String(input.reference || "").trim();
  if (input.estimatedValue !== undefined) {
    const value = Number(input.estimatedValue);
    if (!Number.isFinite(value)) throw new Error("COMMITMENT_FIELDS_REQUIRED");
    payload.estimatedValue = value;
  }
  if (input.endedDate !== undefined) {
    payload.endedDate = input.endedDate ? String(input.endedDate).trim() : null;
  }
  if (input.period) payload.period = input.period;

  const commitmentRef = doc(db, "families", familyId, "commitments", commitmentId);
  const commitmentSnap = await getDoc(commitmentRef);
  if (!commitmentSnap.exists()) {
    throw new Error("COMMITMENT_NOT_FOUND");
  }

  const currentCommitment = commitmentSnap.data();
  const currentOriginType = String(currentCommitment.commitmentOriginType || "").toUpperCase();
  const currentOriginId = String(currentCommitment.originId || "").trim();
  const currentEstimatedValue = Number(currentCommitment.estimatedValue || 0);

  const nextOriginType = String(
    input.commitmentOriginType !== undefined
      ? input.commitmentOriginType
      : currentCommitment.commitmentOriginType || ""
  ).toUpperCase();
  const nextOriginId = String(
    input.originId !== undefined ? input.originId : currentCommitment.originId || ""
  ).trim();
  const nextEstimatedValue = Number(
    input.estimatedValue !== undefined ? input.estimatedValue : currentCommitment.estimatedValue || 0
  );

  await setDoc(commitmentRef, payload, { merge: true });

  const requiresIncomeAdjustment = currentOriginType === "MIEMBRO" || nextOriginType === "MIEMBRO";
  if (requiresIncomeAdjustment) {
    const periodId = await resolveBudgetCycleIdForCommitmentImpact(familyId);

    if (currentOriginType === "MIEMBRO" && currentOriginId) {
      await applyMemberCommitmentDeltaToIncome(
        familyId,
        periodId,
        currentOriginId,
        Math.max(0, Number.isFinite(currentEstimatedValue) ? currentEstimatedValue : 0)
      );
    }

    if (nextOriginType === "MIEMBRO" && nextOriginId) {
      await applyMemberCommitmentDeltaToIncome(
        familyId,
        periodId,
        nextOriginId,
        -Math.max(0, Number.isFinite(nextEstimatedValue) ? nextEstimatedValue : 0)
      );
    }

    await finalizeCommitmentIncomeImpact(familyId, periodId);
  }
}

export async function deleteFamilyCommitment(
  familyIdRaw: string,
  commitmentIdRaw: string,
  periodIdRaw: string
): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const commitmentId = String(commitmentIdRaw || "").trim();
  if (!familyId) throw new Error("FAMILY_ID_REQUIRED");
  if (!commitmentId) throw new Error("COMMITMENT_ID_REQUIRED");

  await assertPlannedCycleForAction(familyId, periodIdRaw);

  const commitmentRef = doc(db, "families", familyId, "commitments", commitmentId);
  const commitmentSnap = await getDoc(commitmentRef);
  if (!commitmentSnap.exists()) {
    throw new Error("COMMITMENT_NOT_FOUND");
  }

  const commitmentData = commitmentSnap.data();
  const commitmentOriginType = String(commitmentData.commitmentOriginType || "").toUpperCase();
  const commitmentOriginId = String(commitmentData.originId || "").trim();
  const commitmentEstimatedValue = Number(commitmentData.estimatedValue || 0);

  await deleteDoc(commitmentRef);

  if (commitmentOriginType === "MIEMBRO" && commitmentOriginId) {
    const periodId = await resolveBudgetCycleIdForCommitmentImpact(familyId);
    await applyMemberCommitmentDeltaToIncome(
      familyId,
      periodId,
      commitmentOriginId,
      Math.max(0, Number.isFinite(commitmentEstimatedValue) ? commitmentEstimatedValue : 0)
    );
    await finalizeCommitmentIncomeImpact(familyId, periodId);
  }
}

export async function updateFamilyPocket(
  familyIdRaw: string,
  pocketIdRaw: string,
  periodIdRaw: string,
  input: UpdateFamilyPocketInput
): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const pocketId = String(pocketIdRaw || "").trim();
  if (!familyId) throw new Error("FAMILY_ID_REQUIRED");
  if (!pocketId) throw new Error("POCKET_ID_REQUIRED");

  if (String(periodIdRaw || "").trim()) {
    normalizePeriodId(String(periodIdRaw || ""));
  }

  const payload: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (input.name !== undefined) payload.name = String(input.name || "").trim();
  if (input.bank !== undefined) payload.bank = String(input.bank || "").trim();
  if (input.contract !== undefined) payload.contract = String(input.contract || "").trim();
  if (input.typeRule) payload.typeRule = input.typeRule;
  if (input.valueRule !== undefined) {
    const value = Number(input.valueRule);
    if (!Number.isFinite(value)) throw new Error("POCKET_FIELDS_REQUIRED");
    payload.valueRule = Math.max(0, value);
  }
  if (input.category) payload.category = input.category;

  const pocketRef = doc(db, "families", familyId, "pockets", pocketId);
  const pocketSnap = await getDoc(pocketRef);
  if (!pocketSnap.exists()) {
    throw new Error("POCKET_NOT_FOUND");
  }

  await setDoc(pocketRef, payload, { merge: true });
}

export async function deleteFamilyPocketCascade(
  familyIdRaw: string,
  pocketIdRaw: string,
  periodIdRaw: string
): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const pocketId = String(pocketIdRaw || "").trim();
  if (!familyId) throw new Error("FAMILY_ID_REQUIRED");
  if (!pocketId) throw new Error("POCKET_ID_REQUIRED");

  await assertPlannedCycleForAction(familyId, periodIdRaw);

  const pocketRef = doc(db, "families", familyId, "pockets", pocketId);
  const pocketSnap = await getDoc(pocketRef);
  if (!pocketSnap.exists()) {
    throw new Error("POCKET_NOT_FOUND");
  }

  const commitmentsRef = collection(db, "families", familyId, "commitments");
  const commitmentsQuery = query(
    commitmentsRef,
    where("commitmentOriginType", "==", "BOLSA"),
    where("originId", "==", pocketId)
  );
  const commitmentsSnap = await getDocs(commitmentsQuery);

  const batch = writeBatch(db);
  for (const commitmentDoc of commitmentsSnap.docs) {
    batch.delete(commitmentDoc.ref);
  }
  batch.delete(pocketRef);

  await batch.commit();
}

export async function createFamilyPocketBalance(
  familyIdRaw: string,
  input: CreateFamilyPocketBalanceInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const periodId = normalizePeriodId(input.periodId);
  const pocketId = String(input.pocketId || "").trim();
  const balanceValue = Number(input.balanceValue);

  if (!pocketId || !Number.isFinite(balanceValue)) {
    throw new Error("BALANCE_FIELDS_REQUIRED");
  }

  const periodRef = doc(db, "families", familyId, "cycles", periodId);
  const periodSnap = await getDoc(periodRef);
  if (!periodSnap.exists()) {
    throw new Error("PERIOD_NOT_FOUND");
  }

  const balanceId = Crypto.randomUUID();
  const now = serverTimestamp();
  const balanceRef = doc(db, "families", familyId, "cycles", periodId, "pocketBalances", balanceId);

  await setDoc(balanceRef, {
    pocketId,
    balanceValue,
    createdAt: now,
    updatedAt: now,
  });

  return balanceId;
}

async function recalculateRemainingPocketForExpectedIncome(
  familyId: string,
  expectedTotalIncome: number
): Promise<void> {
  if (!Number.isFinite(expectedTotalIncome) || expectedTotalIncome < 0) {
    throw new Error("EXPECTED_TOTAL_INCOME_REQUIRED");
  }

  const pocketsSnap = await getDocs(collection(db, "families", familyId, "pockets"));
  const activePockets = pocketsSnap.docs;

  const remainingPocketDoc = activePockets.find((row) => String(row.data().typeRule || "") === "-");
  if (!remainingPocketDoc) {
    return;
  }

  const distributed = activePockets.reduce((acc, row) => {
    const rowTypeRule = String(row.data().typeRule || "");
    const rowValueRule = Number(row.data().valueRule || 0);

    if (rowTypeRule === "-" || !Number.isFinite(rowValueRule)) {
      return acc;
    }

    if (rowTypeRule === "%") {
      return acc + (expectedTotalIncome * rowValueRule) / 100;
    }

    return acc + rowValueRule;
  }, 0);

  const remainingValue = expectedTotalIncome - distributed;
  const safeRemainingValue = Number.isFinite(remainingValue)
    ? Math.max(0, remainingValue)
    : 0;

  await setDoc(
    remainingPocketDoc.ref,
    {
      valueRule: safeRemainingValue,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function recalculateExpectedTotalIncomeFromIncomes(
  familyId: string,
  periodId: string
): Promise<number> {
  const incomesRef = collection(db, "families", familyId, "cycles", periodId, "incomes");
  const incomesSnap = await getDocs(incomesRef);

  const nextExpectedTotalIncome = incomesSnap.docs.reduce((acc, incomeDoc) => {
    const pocketsValue = Number(incomeDoc.data().pocketsValue ?? 0);
    if (!Number.isFinite(pocketsValue)) return acc;
    return acc + Math.max(0, pocketsValue);
  }, 0);

  const cycleRef = doc(db, "families", familyId, "cycles", periodId);
  await setDoc(
    cycleRef,
    {
      expectedTotalIncome: nextExpectedTotalIncome,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return nextExpectedTotalIncome;
}

async function removeInitializationIncomeMovements(
  familyId: string,
  periodId: string,
  memberId?: string
): Promise<void> {
  const movementsRef = collection(db, "families", familyId, "cycles", periodId, "movements");
  const movementsSnap = await getDocs(query(movementsRef, orderBy("createdAt", "desc"), limit(500)));

  const rowsToDelete = movementsSnap.docs.filter((row) => {
    const data = row.data();
    const movementType = String(data.movementType || "").trim().toUpperCase();
    const originType = String(data.originType || "").trim().toUpperCase();
    const referenceDestination = String(data.referenceDestination || "").trim().toUpperCase();
    const referenceOrigin = String(data.referenceOrigin || "").trim();
    const concept = String(data.movementConcept || "").trim().toUpperCase();

    const isInitializationIncome =
      movementType === "INGRESO" &&
      originType === "MIEMBRO" &&
      (referenceDestination === "INICIALIZACION" || concept === "INGRESO INICIAL");

    if (!isInitializationIncome) return false;
    if (!memberId) return true;
    return referenceOrigin === memberId;
  });

  if (rowsToDelete.length === 0) return;

  const batch = writeBatch(db);
  for (const row of rowsToDelete) {
    batch.delete(row.ref);
  }
  await batch.commit();
}

export async function createFamilyMovement(
  familyIdRaw: string,
  input: CreateFamilyMovementInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const familySnap = await getDoc(familyRef);
  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const movementConcept = String(input.movementConcept || "").trim();
  const periodId = normalizePeriodId(input.periodId);
  const movementType = String(input.movementType || "").trim().toUpperCase();
  const value = Number(input.value);
  const originType = input.originType;
  const referenceOrigin = String(input.referenceOrigin || "").trim();
  const destinationType = input.destinationType;
  const referenceDestination = String(input.referenceDestination || "").trim();

  if (!movementConcept || !Number.isFinite(value) || !referenceOrigin || !referenceDestination) {
    throw new Error("MOVEMENT_FIELDS_REQUIRED");
  }

  if (movementType !== "INGRESO" && movementType !== "COMPROMISO" && movementType !== "RESERVADO" && movementType !== "GASTO") {
    throw new Error("MOVEMENT_TYPE_NOT_ALLOWED");
  }

  const periodRef = doc(db, "families", familyId, "cycles", periodId);
  const periodSnap = await getDoc(periodRef);
  if (!periodSnap.exists()) {
    throw new Error("PERIOD_NOT_FOUND");
  }

  const periodState = getCycleStateUpper(periodSnap.data() as Record<string, unknown>);
  if (periodState === "PLANIFICADO") {
    throw new Error("PLANNED_CYCLE_BLOCKS_MOVEMENTS");
  }

  const movementId = Crypto.randomUUID();
  const now = serverTimestamp();
  const movementRef = doc(db, "families", familyId, "cycles", periodId, "movements", movementId);

  const batch = writeBatch(db);

  batch.set(movementRef, {
    movementConcept,
    movementType,
    value,
    originType,
    referenceOrigin,
    destinationType,
    referenceDestination,
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  return movementId;
}

export async function createFamilyInitialIncome(
  familyIdRaw: string,
  periodIdRaw: string,
  input: CreateFamilyInitialIncomeInput
): Promise<string> {
  const familyId = String(familyIdRaw || "").trim();
  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const periodId = normalizePeriodId(periodIdRaw);
  const memberId = String(input.memberId || "").trim();
  const realValue = Number(input.realValue);

  if (!memberId || !Number.isFinite(realValue)) {
    throw new Error("INCOME_FIELDS_REQUIRED");
  }

  const familyRef = doc(db, "families", familyId);
  const cycleRef = doc(db, "families", familyId, "cycles", periodId);
  const memberRef = doc(db, "families", familyId, "members", memberId);

  const [familySnap, cycleSnap, memberSnap] = await Promise.all([
    getDoc(familyRef),
    getDoc(cycleRef),
    getDoc(memberRef),
  ]);

  if (!familySnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }
  if (!cycleSnap.exists()) {
    throw new Error("PERIOD_NOT_FOUND");
  }
  if (!memberSnap.exists()) {
    throw new Error("MEMBER_NOT_FOUND");
  }

  const incomeId = Crypto.randomUUID();
  const now = serverTimestamp();

  const incomeRef = doc(db, "families", familyId, "cycles", periodId, "incomes", incomeId);
  const batch = writeBatch(db);

  batch.set(incomeRef, {
    memberId,
    realValue,
    pocketsValue: realValue,
    planningState: "PLANIFICADO",
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();

  const nextExpectedTotalIncome = await recalculateExpectedTotalIncomeFromIncomes(familyId, periodId);
  await recalculateRemainingPocketForExpectedIncome(familyId, nextExpectedTotalIncome);
  await removeInitializationIncomeMovements(familyId, periodId, memberId);

  return incomeId;
}

export async function updateFamilyInitialIncome(
  familyIdRaw: string,
  periodIdRaw: string,
  memberIdRaw: string,
  newRealValueRaw: number
): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const periodId = normalizePeriodId(String(periodIdRaw || ""));
  const memberId = String(memberIdRaw || "").trim();
  const newRealValue = Number(newRealValueRaw);

  if (!familyId) throw new Error("FAMILY_ID_REQUIRED");
  if (!periodId) throw new Error("PERIOD_ID_REQUIRED");
  if (!memberId) throw new Error("MEMBER_ID_REQUIRED");
  if (!Number.isFinite(newRealValue)) throw new Error("INVALID_VALUE");

  const cycleRef = doc(db, "families", familyId, "cycles", periodId);
  const cycleSnap = await getDoc(cycleRef);
  if (!cycleSnap.exists()) throw new Error("PERIOD_NOT_FOUND");

  const incomesRef = collection(db, "families", familyId, "cycles", periodId, "incomes");
  const incomeQuery = query(incomesRef, where("memberId", "==", memberId), limit(1));
  const incomeSnap = await getDocs(incomeQuery);
  const incomeDoc = incomeSnap.empty ? null : incomeSnap.docs[0];
  const currentReal = incomeDoc ? Number(incomeDoc.data().realValue || 0) : 0;
  const delta = newRealValue - currentReal;

  const batch = writeBatch(db);
  const now = serverTimestamp();

  if (incomeDoc) {
    batch.set(incomeDoc.ref, {
      realValue: newRealValue,
      pocketsValue: newRealValue,
      planningState: "PLANIFICADO",
      updatedAt: now,
    }, { merge: true });
  } else {
    const incomeId = Crypto.randomUUID();
    const incomeRef = doc(db, "families", familyId, "cycles", periodId, "incomes", incomeId);
    batch.set(incomeRef, {
      memberId,
      realValue: newRealValue,
      pocketsValue: newRealValue,
      planningState: "PLANIFICADO",
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();

  await removeInitializationIncomeMovements(familyId, periodId, memberId);

  if (delta !== 0) {
    const nextExpected = await recalculateExpectedTotalIncomeFromIncomes(familyId, periodId);
    await recalculateRemainingPocketForExpectedIncome(familyId, nextExpected);
  }
}

async function resolveBudgetCycleIdForCommitmentImpact(familyId: string): Promise<string> {
  const cyclesSnap = await getDocs(collection(db, "families", familyId, "cycles"));
  const planned = cyclesSnap.docs.find((row) => String(row.data().state || "").toUpperCase() === "PLANIFICADO");
  const active = cyclesSnap.docs.find((row) => {
    const state = String(row.data().state || "").toUpperCase();
    return state === "ABIERTO";
  });

  const cycle = planned ?? active;
  if (!cycle) {
    throw new Error("PERIOD_NOT_FOUND");
  }

  return cycle.id;
}

async function applyMemberCommitmentDeltaToIncome(
  familyId: string,
  periodId: string,
  memberId: string,
  deltaValue: number
): Promise<void> {
  const safeDelta = Number(deltaValue);
  if (!memberId) {
    throw new Error("MEMBER_ID_REQUIRED");
  }
  if (!Number.isFinite(safeDelta) || safeDelta === 0) {
    return;
  }

  const incomesRef = collection(db, "families", familyId, "cycles", periodId, "incomes");
  const incomeQuery = query(incomesRef, where("memberId", "==", memberId), limit(1));
  const incomeSnap = await getDocs(incomeQuery);

  if (incomeSnap.empty) {
    throw new Error("MEMBER_INCOME_NOT_FOUND");
  }

  const incomeDoc = incomeSnap.docs[0];
  const currentPocketsValue = Number(incomeDoc.data().pocketsValue || 0);
  const nextPocketsValue = Math.max(0, currentPocketsValue + safeDelta);

  await setDoc(incomeDoc.ref, {
    pocketsValue: nextPocketsValue,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

async function finalizeCommitmentIncomeImpact(familyId: string, periodId: string): Promise<void> {
  const nextExpectedTotalIncome = await recalculateExpectedTotalIncomeFromIncomes(familyId, periodId);
  await recalculateRemainingPocketForExpectedIncome(familyId, nextExpectedTotalIncome);
}

export async function deleteFamilyMemberCascade(familyIdRaw: string, memberIdRaw: string): Promise<void> {
  const familyId = String(familyIdRaw || "").trim();
  const memberId = String(memberIdRaw || "").trim();
  if (!familyId) throw new Error("FAMILY_ID_REQUIRED");
  if (!memberId) throw new Error("MEMBER_ID_REQUIRED");

  const cyclesSnap = await getDocs(collection(db, "families", familyId, "cycles"));

  for (const cycleDoc of cyclesSnap.docs) {
    const periodId = cycleDoc.id;
    // remove incomes for member
    const incomesRef = collection(db, "families", familyId, "cycles", periodId, "incomes");
    const incomeQuery = query(incomesRef, where("memberId", "==", memberId));
    const incomeSnap = await getDocs(incomeQuery);
    const batch = writeBatch(db);

    for (const inc of incomeSnap.docs) {
      batch.delete(inc.ref);
    }

    // remove movements referencing member
    const movementsRef = collection(db, "families", familyId, "cycles", periodId, "movements");
    const movQuery1 = query(movementsRef, where("originType", "==", "MIEMBRO"));
    const movSnap1 = await getDocs(movQuery1);
    for (const m of movSnap1.docs) {
      if (String(m.data().referenceOrigin || "") === memberId) {
        batch.delete(m.ref);
      }
    }
    const movQuery2 = query(movementsRef, where("destinationType", "==", "MIEMBRO"));
    const movSnap2 = await getDocs(movQuery2);
    for (const m of movSnap2.docs) {
      if (String(m.data().referenceDestination || "") === memberId) {
        batch.delete(m.ref);
      }
    }

    // delete commitments for member
    const commitmentsRef = collection(db, "families", familyId, "commitments");
    const commitQuery = query(commitmentsRef, where("commitmentOriginType", "==", "MIEMBRO"), where("originId", "==", memberId));
    const commitSnap = await getDocs(commitQuery);
    for (const c of commitSnap.docs) {
      batch.delete(c.ref);
    }

    await batch.commit();

    const nextExpected = await recalculateExpectedTotalIncomeFromIncomes(familyId, periodId);
    await recalculateRemainingPocketForExpectedIncome(familyId, nextExpected);
  }

  // finally delete member doc
  const memberRef = doc(db, "families", familyId, "members", memberId);
  await deleteDoc(memberRef).catch(() => {});
}

async function deleteDirectSubcollectionDocs(familyId: string, subcollectionName: string) {
  const ref = collection(db, "families", familyId, subcollectionName);
  const snap = await getDocs(ref);

  for (const row of snap.docs) {
    await deleteDoc(row.ref);
  }
}

async function deleteCyclesTree(familyId: string) {
  const cyclesRef = collection(db, "families", familyId, "cycles");
  const cyclesSnap = await getDocs(cyclesRef);

  for (const cycleDoc of cyclesSnap.docs) {
    for (const childName of ["incomes", "pocketBalances", "movements"]) {
      const childRef = collection(db, "families", familyId, "cycles", cycleDoc.id, childName);
      const childSnap = await getDocs(childRef);
      for (const childDoc of childSnap.docs) {
        await deleteDoc(childDoc.ref);
      }
    }

    await deleteDoc(cycleDoc.ref);
  }
}

export async function deleteFamilyTemplate(user: AuthenticatedUser, familyIdRaw: string): Promise<void> {
  const userId = await ensureUserProfile(user);
  const familyId = String(familyIdRaw || "").trim();

  if (!familyId) {
    throw new Error("FAMILY_ID_REQUIRED");
  }

  const ownershipRef = doc(db, "users", userId, "families", familyId);
  const ownershipSnap = await getDoc(ownershipRef);

  if (!ownershipSnap.exists()) {
    throw new Error("FAMILY_NOT_FOUND");
  }

  const ownership = ownershipSnap.data();
  if (String(ownership.role || "").toUpperCase() !== "OWNER") {
    throw new Error("ONLY_OWNER_CAN_DELETE_FAMILY");
  }

  const usersRef = collection(db, "families", familyId, "familyUsers");
  const usersSnap = await getDocs(usersRef);

  for (const userDoc of usersSnap.docs) {
    const row = userDoc.data();
    const memberUserId = String(row.userId || userDoc.id || "").trim();

    if (memberUserId) {
      const userFamilyRef = doc(db, "users", memberUserId, "families", familyId);
      await deleteDoc(userFamilyRef).catch(() => {});
    }

    await deleteDoc(userDoc.ref);
  }

  for (const subcollectionName of ["members", "pockets", "commitments", "movements"]) {
    await deleteDirectSubcollectionDocs(familyId, subcollectionName);
  }

  await deleteCyclesTree(familyId);

  const familyRef = doc(db, "families", familyId);
  await deleteDoc(familyRef);
}

export async function loadFamilyViewData(
  workspace: FamilyWorkspace
): Promise<DashboardData> {
  await delay(200);
  return getFamilyDashboard(workspace.familyId);
}
