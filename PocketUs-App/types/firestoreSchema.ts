export type FirestoreTimestamp = string;

export type UserFamilyRole = "OWNER" | "MEMBER";
export type UserState = "ACTIVE" | "INACTIVE";
export type FamilyState = "ACTIVE" | "INACTIVE";
export type MemberState = "ACTIVE" | "INACTIVE";
export type CommitmentState = "PENDIENTE" | "PAGADO" | "CANCELADO";
export type CycleState = "PLANIFICADO" | "ABIERTO" | "CERRADO";
export type PlanningState = "PLANIFICADO" | "CERRADO";
export type PocketCategory = "GASTO" | "AHORRO" | "DEUDA";
export type PocketRuleType = "$" | "%" | "-";
export type CommitmentOriginType = "BOLSA" | "MIEMBRO";
export type PartyType = "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO";
export type MovementType = "INGRESO" | "COMPROMISO" | "RESERVADO" | "GASTO";
export type CommitmentPeriod = "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICO";
export type TaskType = "CLOSE_MEMBER_PLANNING" | "MOVE_MONEY" | "PAY_COMMITMENT" | "REVIEW_CYCLE";
export type TaskVisibility = "USER" | "FAMILY";
export type TaskPriority = "LOW" | "NORMAL" | "HIGH";
export type TaskState = "PENDING" | "COMPLETED" | "CANCELLED";
export type NotificationState = "PENDING" | "READ";

export type FirestoreUserFamily = {
  familyId: string;
  role: UserFamilyRole;
  state: FamilyState;
  joinedAt?: FirestoreTimestamp;
};

export type FirestoreNotification = {
  familyId: string;
  taskId?: string | null;
  type: TaskType | string;
  title: string;
  message: string;
  state: NotificationState;
  createdAt?: FirestoreTimestamp;
  readAt?: FirestoreTimestamp | null;
};

export type FirestoreUser = {
  email: string;
  displayName: string;
  state: UserState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  families?: Record<string, FirestoreUserFamily>;
  notifications?: Record<string, FirestoreNotification>;
};

export type FirestoreFamilyUser = {
  userId: string;
  email: string;
  role: UserFamilyRole;
  state: UserState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestoreFamily = {
  name: string;
  mainUserId: string;
  state: FamilyState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestoreMember = {
  userId?: string | null;
  name: string;
  emailMember: string;
  bank: string;
  contract: string;
  state: MemberState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestorePocket = {
  name: string;
  bank: string;
  contract: string;
  typeRule: PocketRuleType;
  valueRule: number;
  category: PocketCategory;
  priority: number;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestoreCommitment = {
  commitmentOriginType: CommitmentOriginType;
  originId: string;
  commitmentConcept: string;
  reference: string;
  estimatedValue: number;
  realValue: number;
  endedDate: string | null;
  period: CommitmentPeriod;
  lastPayDate: string | null;
  state: CommitmentState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestoreIncome = {
  memberId: string;
  realValue: number;
  pocketsValue: number;
  planningState: PlanningState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestorePocketBalance = {
  pocketId: string;
  balanceValue: number;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestoreTask = {
  type: TaskType;
  visibility: TaskVisibility;
  targetUserId?: string | null;
  taskMemberId?: string | null;
  taskOriginType: PartyType;
  taskReferenceOrigin: string;
  taskDestinationType: PartyType;
  taskReferenceDestination: string;
  taskValue: number;
  title: string;
  message: string;
  priority: TaskPriority;
  state: TaskState;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  completedAt?: FirestoreTimestamp | null;
};

export type FirestoreMovement = {
  movementConcept: string;
  movementType: MovementType;
  value: number;
  originType: PartyType;
  referenceOrigin: string;
  destinationType: PartyType;
  referenceDestination: string;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
};

export type FirestoreCycle = {
  name: string;
  state: CycleState;
  expectedTotalIncome: number;
  realTotalIncome: number;
  createdAt?: FirestoreTimestamp;
  updatedAt?: FirestoreTimestamp;
  incomes?: Record<string, FirestoreIncome>;
  pocketBalances?: Record<string, FirestorePocketBalance>;
  tasks?: Record<string, FirestoreTask>;
  movements?: Record<string, FirestoreMovement>;
};

export type FirestoreFamilyNode = FirestoreFamily & {
  familyUsers?: Record<string, FirestoreFamilyUser>;
  members?: Record<string, FirestoreMember>;
  pockets?: Record<string, FirestorePocket>;
  commitments?: Record<string, FirestoreCommitment>;
  cycles?: Record<string, FirestoreCycle>;
};

export type FirestoreDatabaseSchema = {
  users: Record<string, FirestoreUser>;
  families: Record<string, FirestoreFamilyNode>;
};
