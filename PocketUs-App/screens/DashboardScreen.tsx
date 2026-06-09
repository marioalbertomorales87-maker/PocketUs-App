import { useEffect, useMemo, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useColorScheme } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Appbar,
  Button,
  Card,
  Checkbox,
  Divider,
  Icon,
  IconButton,
  Surface,
  Text as PaperText,
  TextInput,
  useTheme,
} from "react-native-paper";
import TopLoadingBar from "../components/TopLoadingBar";
import {
  createFamilyCommitment,
  createFamilyInitialIncome,
  createFamilyMember,
  createFamilyMovement,
  createFamilyPocket,
  createFamilyPocketBalance,
  createFamilyPeriod,
  deleteFamilyCommitment,
  updateFamilyMember,
  updateFamilyCommitment,
  updateFamilyPocket,
  deleteFamilyPocketCascade,
  updateFamilyInitialIncome,
  deleteFamilyMemberCascade,
  DashboardData,
  FamilyWorkspace,
  getFamilyViewData,
  loadFamilyViewData,
} from "../services/AuthService";

type DashboardScreenProps = {
  workspace: FamilyWorkspace;
  onBackToFamilies: () => void;
};

type DashboardTab = "inicio" | "bolsas" | "movimientos" | "historial";
type MovementListFilter = "TODOS" | "ENTRADAS" | "SALIDAS";
type ModalKey =
  | "quickActions"
  | "detailMember"
  | "detailBag"
  | "detailMovement"
  | "detailCommitment"
  | "detailPeriod"
  | "formEditIncome"
  | "formNewMember"
  | "formNewPeriod"
  | "formConfigureBag"
  | "formNewCommitment"
  | "formRegisterBalance"
  | "formRegisterMovement"
  | "confirmDeleteMember"
  | "wizardInitialization";

type MovementPartyType = "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO";

export default function DashboardScreen({ workspace, onBackToFamilies }: DashboardScreenProps) {
  const theme = useTheme();
  const colorScheme = useColorScheme();
  const isDarkMode = theme.dark || colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const uiColors = useMemo(
    () => ({
      cardBackground: theme.colors.elevation.level2,
      cardBorder: theme.colors.outlineVariant,
      mutedText: theme.colors.onSurfaceVariant,
      onSurface: theme.colors.onSurface,
      metricBackground: theme.colors.surfaceVariant,
      metricBorder: theme.colors.outlineVariant,
      navBackground: theme.colors.surface,
      navBorder: theme.colors.outlineVariant,
      memberIconBackground: theme.colors.secondaryContainer,
      icon: theme.colors.onSurfaceVariant,
      successText: theme.dark ? "#6EE7B7" : "#059669",
      warningText: theme.dark ? "#FDBA74" : "#C2410C",
      memberAccent: "#059669",
      periodAccent: "#1D4ED8",
      pocketAccent: "#0891B2",
      commitmentAccent: "#EA580C",
    }),
    [theme]
  );
  const modalTextInputTheme = useMemo(
    () => ({
      ...theme,
      colors: {
        ...theme.colors,
        background: isDarkMode ? "#111827" : theme.colors.elevation.level2,
        surface: isDarkMode ? "#111827" : theme.colors.elevation.level2,
        onSurface: isDarkMode ? "#F9FAFB" : theme.colors.onSurface,
        onSurfaceVariant: isDarkMode ? "#CBD5E1" : theme.colors.onSurfaceVariant,
        outline: isDarkMode ? "#94A3B8" : theme.colors.outline,
      },
    }),
    [isDarkMode, theme]
  );
  const modalInputFieldStyle = useMemo(
    () => [styles.inputField, { backgroundColor: isDarkMode ? "#111827" : theme.colors.elevation.level2 }],
    [isDarkMode, theme.colors.elevation.level2]
  );
  const selectorFieldStyle = useMemo(
    () => [styles.selectorField, { backgroundColor: isDarkMode ? "#111827" : theme.colors.elevation.level2, borderColor: isDarkMode ? "#94A3B8" : theme.colors.outline }],
    [isDarkMode, theme.colors.elevation.level2, theme.colors.outline]
  );
  const selectorTextStyle = useMemo(
    () => [styles.selectorText, { color: isDarkMode ? "#F9FAFB" : theme.colors.onSurface }],
    [isDarkMode, theme.colors.onSurface]
  );
  const dropdownListStyle = useMemo(
    () => [styles.dropdownList, { backgroundColor: isDarkMode ? "#111827" : theme.colors.elevation.level3, borderColor: isDarkMode ? "#94A3B8" : theme.colors.outline }],
    [isDarkMode, theme.colors.elevation.level3, theme.colors.outline]
  );
  const dropdownItemStyle = useMemo(
    () => [styles.dropdownItem, { backgroundColor: isDarkMode ? "#111827" : theme.colors.elevation.level3, borderBottomColor: isDarkMode ? "#334155" : theme.colors.outlineVariant }],
    [isDarkMode, theme.colors.elevation.level3, theme.colors.outlineVariant]
  );
  const dropdownItemTextStyle = useMemo(
    () => [styles.dropdownItemText, { color: isDarkMode ? "#F9FAFB" : theme.colors.onSurface }],
    [isDarkMode, theme.colors.onSurface]
  );
  const dropdownItemDisabledStyle = useMemo(
    () => [styles.dropdownItemDisabled, { backgroundColor: isDarkMode ? "#1F2937" : theme.colors.surfaceVariant, borderBottomColor: isDarkMode ? "#334155" : theme.colors.outlineVariant }],
    [isDarkMode, theme.colors.surfaceVariant, theme.colors.outlineVariant]
  );
  const dropdownItemDisabledTextColor = isDarkMode ? "#94A3B8" : theme.colors.onSurfaceVariant;
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("inicio");
  const [movementListFilter, setMovementListFilter] = useState<MovementListFilter>("TODOS");
  const [activeModal, setActiveModal] = useState<ModalKey | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [wizardIncomeByMemberId, setWizardIncomeByMemberId] = useState<Record<string, string>>({});
  const [wizardError, setWizardError] = useState<string | null>(null);
  const [isSavingWizardIncomes, setIsSavingWizardIncomes] = useState(false);
  const [hasShownAutoInitialization, setHasShownAutoInitialization] = useState(false);
  const [returnToWizardStep, setReturnToWizardStep] = useState<number | null>(null);
  const [movementType, setMovementType] = useState<"" | "INGRESO" | "COMPROMISO" | "RESERVADO" | "GASTO">("");
  const [movementTypeMenuVisible, setMovementTypeMenuVisible] = useState(false);
  const [movementOrigin, setMovementOrigin] = useState<"" | MovementPartyType>("");
  const [movementOriginMenuVisible, setMovementOriginMenuVisible] = useState(false);
  const [movementOriginReferenceMenuVisible, setMovementOriginReferenceMenuVisible] = useState(false);
  const [movementOriginReferenceId, setMovementOriginReferenceId] = useState("");
  const [movementOriginReferenceLabel, setMovementOriginReferenceLabel] = useState("Seleccione referencia origen");
  const [movementOriginReferenceText, setMovementOriginReferenceText] = useState("");
  const [movementDestination, setMovementDestination] = useState<"" | MovementPartyType>("");
  const [movementDestinationMenuVisible, setMovementDestinationMenuVisible] = useState(false);
  const [movementDestinationReferenceMenuVisible, setMovementDestinationReferenceMenuVisible] = useState(false);
  const [movementDestinationReferenceId, setMovementDestinationReferenceId] = useState("");
  const [movementDestinationReferenceLabel, setMovementDestinationReferenceLabel] = useState("Seleccione referencia destino");
  const [movementDestinationReferenceText, setMovementDestinationReferenceText] = useState("");
  const [movementPeriodId, setMovementPeriodId] = useState("");
  const [movementPeriodLabel, setMovementPeriodLabel] = useState("Sin ciclo ACTIVO o PLANIFICADO");
  const [movementValue, setMovementValue] = useState("");
  const [movementConcept, setMovementConcept] = useState("");
  const [movementSubmitError, setMovementSubmitError] = useState<string | null>(null);
  const [isSavingMovement, setIsSavingMovement] = useState(false);
  const [memberActive, setMemberActive] = useState(true);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberBank, setMemberBank] = useState("");
  const [memberContract, setMemberContract] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [memberSubmitError, setMemberSubmitError] = useState<string | null>(null);
  const [periodSubmitError, setPeriodSubmitError] = useState<string | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);
  const [editIncomeValue, setEditIncomeValue] = useState("");
  const [editIncomeId, setEditIncomeId] = useState<string | null>(null);
  const [isSavingEditIncome, setIsSavingEditIncome] = useState(false);

  const [pocketName, setPocketName] = useState("");
  const [pocketBank, setPocketBank] = useState("");
  const [pocketContract, setPocketContract] = useState("");
  const [pocketValueRule, setPocketValueRule] = useState("");
  const [isSavingPocket, setIsSavingPocket] = useState(false);
  const [pocketSubmitError, setPocketSubmitError] = useState<string | null>(null);

  const [bagCategory, setBagCategory] = useState<"Gasto" | "Ahorro">("Gasto");
  const [bagRuleType, setBagRuleType] = useState<"Valor" | "Porcentaje" | "Restante">("Valor");

  const [commitmentConcept, setCommitmentConcept] = useState("");
  const [commitmentReference, setCommitmentReference] = useState("");
  const [commitmentEstimatedValue, setCommitmentEstimatedValue] = useState("");
  const [commitmentEndedDate, setCommitmentEndedDate] = useState("");
  const [commitmentEndedDatePickerVisible, setCommitmentEndedDatePickerVisible] = useState(false);
  const [commitmentEndedDateValue, setCommitmentEndedDateValue] = useState(new Date());
  const [commitmentPeriodicidad, setCommitmentPeriodicidad] = useState("Selecciona tipo origen");
  const [commitmentPeriodMenuVisible, setCommitmentPeriodMenuVisible] = useState(false);
  const [commitmentAccountType, setCommitmentAccountType] = useState<"" | "BOLSA" | "MIEMBRO">("");
  const [commitmentAccountMenuVisible, setCommitmentAccountMenuVisible] = useState(false);
  const [commitmentOriginValue, setCommitmentOriginValue] = useState("Seleccione un Origen");
  const [commitmentOriginId, setCommitmentOriginId] = useState("");
  const [commitmentOriginMenuVisible, setCommitmentOriginMenuVisible] = useState(false);
  const [isSavingCommitment, setIsSavingCommitment] = useState(false);
  const [commitmentSubmitError, setCommitmentSubmitError] = useState<string | null>(null);

  const [balancePocketMenuVisible, setBalancePocketMenuVisible] = useState(false);
  const [balancePocketLabel, setBalancePocketLabel] = useState("Selecciona una bolsa");
  const [balancePocketId, setBalancePocketId] = useState("");
  const [balancePeriodLabel, setBalancePeriodLabel] = useState("Selecciona un periodo");
  const [balancePeriodId, setBalancePeriodId] = useState("");
  const [balanceValue, setBalanceValue] = useState("");
  const [isSavingBalance, setIsSavingBalance] = useState(false);
  const [balanceSubmitError, setBalanceSubmitError] = useState<string | null>(null);

  const [viewData, setViewData] = useState<{
    members?: Array<Record<string, unknown> & { id: string }>;
    pockets?: Array<Record<string, unknown> & { id: string }>;
    pocketBalances?: Array<Record<string, unknown> & { id: string }>;
    commitments?: Array<Record<string, unknown> & { id: string }>;
    movements?: Array<Record<string, unknown> & { id: string }>;
    periods?: Array<Record<string, unknown> & { id: string }>;
    incomes?: Array<Record<string, unknown> & { id: string }>;
  } | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [selectedCommitmentId, setSelectedCommitmentId] = useState<string | null>(null);
  const [selectedPocketId, setSelectedPocketId] = useState<string | null>(null);
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(null);
  const [selectedMovementSnapshot, setSelectedMovementSnapshot] = useState<(Record<string, unknown> & { id?: string }) | null>(null);
  const [movementReturnModal, setMovementReturnModal] = useState<ModalKey | null>(null);
  const selectedMember = useMemo(() => {
    const members = viewData?.members ?? [];
    if (!selectedMemberId) {
      return members.length > 0 ? members[0] : null;
    }
    return members.find((item) => String(item.id || "") === selectedMemberId) ?? null;
  }, [selectedMemberId, viewData?.members]);

  const selectedCommitment = useMemo(() => {
    const commitments = viewData?.commitments ?? [];
    if (!selectedCommitmentId) return null;
    return commitments.find((item) => String(item.id || "") === selectedCommitmentId) ?? null;
  }, [selectedCommitmentId, viewData?.commitments]);

  const selectedPocket = useMemo(() => {
    const pockets = viewData?.pockets ?? [];
    if (!selectedPocketId) return null;
    return pockets.find((item) => String(item.id || "") === selectedPocketId) ?? null;
  }, [selectedPocketId, viewData?.pockets]);

  const selectedMovement = useMemo(() => {
    if (selectedMovementSnapshot) {
      const snapshotId = String(selectedMovementSnapshot.id || "");
      const movements = viewData?.movements ?? [];
      if (snapshotId) {
        const latest = movements.find((item) => String(item.id || "") === snapshotId);
        return latest ?? selectedMovementSnapshot;
      }
      return selectedMovementSnapshot;
    }
    const movements = viewData?.movements ?? [];
    if (!selectedMovementId) return null;
    return movements.find((item) => String(item.id || "") === selectedMovementId) ?? null;
  }, [selectedMovementId, selectedMovementSnapshot, viewData?.movements]);

  const [memberDetailSaveError, setMemberDetailSaveError] = useState<string | null>(null);
  const [isSavingMemberDetail, setIsSavingMemberDetail] = useState(false);
  const [isSavingCommitmentDetail, setIsSavingCommitmentDetail] = useState(false);
  const [commitmentDetailError, setCommitmentDetailError] = useState<string | null>(null);
  const [isSavingPocketDetail, setIsSavingPocketDetail] = useState(false);
  const [pocketDetailError, setPocketDetailError] = useState<string | null>(null);

  const currentCycle = useMemo(() => {
    const periods = viewData?.periods ?? [];
    const planned = periods.find((row) => String(row.state || "").toUpperCase() === "PLANIFICADO");
    const active = periods.find((row) => {
      const state = String(row.state || "").toUpperCase();
      return state === "ACTIVO" || state === "ABIERTO";
    });
    return active ?? planned ?? null;
  }, [viewData?.periods]);

  const detailMemberMovements = useMemo(() => {
    const memberId = selectedMemberId;
    const movements = viewData?.movements ?? [];
    if (!memberId || movements.length === 0) {
      return [];
    }

    return movements.filter((movement) => {
      const originMatch = String(movement.originType || "").toUpperCase() === "MIEMBRO" && String(movement.referenceOrigin || "") === memberId;
      return originMatch;
    });
  }, [selectedMemberId, viewData?.movements]);

  const selectedPocketCommitments = useMemo(() => {
    if (!selectedPocketId) return [];
    return (viewData?.commitments ?? []).filter(
      (item) => String(item.commitmentOriginType || "").toUpperCase() === "BOLSA" && String(item.originId || "") === selectedPocketId
    );
  }, [selectedPocketId, viewData?.commitments]);

  const selectedPocketMovements = useMemo(() => {
    if (!selectedPocketId) return [];
    return (viewData?.movements ?? []).filter((movement) => {
      const originMatch = String(movement.originType || "").toUpperCase() === "BOLSA" && String(movement.referenceOrigin || "") === selectedPocketId;
      const destinationMatch = String(movement.destinationType || "").toUpperCase() === "BOLSA" && String(movement.referenceDestination || "") === selectedPocketId;
      return originMatch || destinationMatch;
    });
  }, [selectedPocketId, viewData?.movements]);

  const filteredMovements = useMemo(() => {
    const movements = viewData?.movements ?? [];
    if (movementListFilter === "ENTRADAS") {
      return movements.filter((movement) => String(movement.movementType || movement.type || "").toUpperCase() === "INGRESO");
    }
    if (movementListFilter === "SALIDAS") {
      return movements.filter((movement) => String(movement.movementType || movement.type || "").toUpperCase() !== "INGRESO");
    }
    return movements;
  }, [movementListFilter, viewData?.movements]);

  const selectedMemberCommitments = useMemo(() => {
    if (!selectedMemberId) return [];
    return (viewData?.commitments ?? []).filter(
      (item) => String(item.commitmentOriginType || "").toUpperCase() === "MIEMBRO" && String(item.originId || "") === selectedMemberId
    );
  }, [selectedMemberId, viewData?.commitments]);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      try {
        setIsLoading(true);
        const nextData = await loadFamilyViewData(workspace);
        if (!isActive) return;
        setData(nextData);
      } catch (error) {
        if (!isActive) return;
        console.error("Dashboard loadFamilyViewData error:", error);
      } finally {
        if (!isActive) return;
        setIsLoading(false);
      }
    };

    run();

    return () => {
      isActive = false;
    };
  }, [workspace]);

  useEffect(() => {
    let isMounted = true;

    const loadViewData = async () => {
      try {
        const next = await getFamilyViewData(workspace.familyId, activeTab);
        if (!isMounted) return;
        setViewData(next);
      } catch {
        if (!isMounted) return;
        setViewData(null);
      }
    };

    loadViewData();

    return () => {
      isMounted = false;
    };
  }, [activeTab, workspace.familyId]);

  const initializationMembers = viewData?.members ?? [];
  const initializationPeriods = viewData?.periods ?? [];
  const initializationIncomes = viewData?.incomes ?? [];

  const roundToTwoDecimals = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round(value * 100) / 100;
  };

  const normalizeNumericInput = (value: string) => {
    const sanitized = String(value || "")
      .replace(/[^\d.,]/g, "")
      .replace(/,/g, ".");

    if (!sanitized) return "";

    const [integerPartRaw, ...decimalRest] = sanitized.split(".");
    const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";
    const decimalPart = decimalRest.join("").slice(0, 2);

    if (sanitized.endsWith(".") && decimalPart.length === 0) {
      return `${integerPart}.`;
    }

    return decimalPart.length > 0 ? `${integerPart}.${decimalPart}` : integerPart;
  };

  const parseNumericInput = (value: string) => {
    const normalized = normalizeNumericInput(value);
    if (!normalized || normalized === ".") return NaN;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? roundToTwoDecimals(parsed) : NaN;
  };

  const formatNumericInput = (value: string) => {
    const normalized = normalizeNumericInput(value);
    if (!normalized) return "";

    const hasTrailingDot = normalized.endsWith(".");
    const [integerPartRaw, decimalPartRaw = ""] = normalized.split(".");
    const integerNumber = Number(integerPartRaw || "0");
    const integerFormatted = Number.isFinite(integerNumber)
      ? integerNumber.toLocaleString("es-CO", { maximumFractionDigits: 0 })
      : "0";

    if (hasTrailingDot) {
      return `${integerFormatted},`;
    }

    return decimalPartRaw ? `${integerFormatted},${decimalPartRaw}` : integerFormatted;
  };

  const formatCurrencyInput = (value: string) => {
    const formatted = formatNumericInput(value);
    return formatted ? `$ ${formatted}` : "";
  };

  const formatPercentInput = (value: string) => {
    const formatted = formatNumericInput(value);
    return formatted ? `% ${formatted}` : "";
  };

  const toCurrency = (value: number) => {
    const safe = Number.isFinite(value) ? roundToTwoDecimals(value) : 0;
    return safe.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const formatMovementDateTime = (movement: Record<string, unknown>) => {
    const rawDate = movement.date || movement.createdAt || movement.timestamp || movement.dateTime;
    let dateObj: Date | null = null;

    if (typeof rawDate === "string") {
      dateObj = new Date(rawDate);
    } else if (typeof rawDate === "number") {
      dateObj = new Date(rawDate);
    } else if (rawDate && typeof (rawDate as any).toDate === "function") {
      dateObj = (rawDate as any).toDate();
    } else if (rawDate && typeof (rawDate as any).seconds === "number") {
      dateObj = new Date((rawDate as any).seconds * 1000);
    }

    if (!dateObj || Number.isNaN(dateObj.getTime())) {
      return {
        dateLabel: String(movement.date || "Sin fecha"),
        timeLabel: String(movement.time || ""),
      };
    }

    const dateLabel = `${String(dateObj.getDate()).padStart(2, "0")}/${String(dateObj.getMonth() + 1).padStart(2, "0")}/${dateObj.getFullYear()}`;
    const timeLabel = `${String(dateObj.getHours()).padStart(2, "0")}:${String(dateObj.getMinutes()).padStart(2, "0")}`;
    return { dateLabel, timeLabel };
  };

  const toPercent = (value: number) => {
    const safe = Number.isFinite(value) ? roundToTwoDecimals(value) : 0;
    return `${safe.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  const getPocketAssignedValue = (pocket: Record<string, unknown>, expectedTotalIncome: number) => {
    const typeRule = String(pocket.typeRule || "");
    const valueRule = Number(pocket.valueRule || 0);

    if (!Number.isFinite(valueRule)) {
      return 0;
    }

    if (typeRule === "%") {
      return roundToTwoDecimals((expectedTotalIncome * valueRule) / 100);
    }

    return roundToTwoDecimals(valueRule);
  };

  const hasMembers = initializationMembers.length > 0;
  const plannedCycle = initializationPeriods.find(
    (item) => String(item.state || "").toUpperCase() === "PLANIFICADO"
  );
  const activeCycle = initializationPeriods.find((item) => {
    const state = String(item.state || "").toUpperCase();
    return state === "ACTIVO" || state === "ABIERTO";
  });
  const initializationCycle = plannedCycle ?? activeCycle;
  const hasCycle = Boolean(initializationCycle);
  const hasIncomes = initializationIncomes.length > 0;

  const budgetCycle = activeCycle ?? plannedCycle;
  const expectedTotalIncome = roundToTwoDecimals(Number(budgetCycle?.expectedTotalIncome || 0));

  const activePockets = (viewData?.pockets ?? []).filter(
    (item) => String(item.state || "ACTIVE").toUpperCase() === "ACTIVE"
  );
  const hasExistingRemainingPocket = activePockets.some((item) => String(item.typeRule || "") === "-");
  const distributedWithoutRemaining = activePockets.reduce((acc, item) => {
    if (String(item.typeRule || "") === "-") {
      return acc;
    }
    return roundToTwoDecimals(acc + getPocketAssignedValue(item, expectedTotalIncome));
  }, 0);
  const computedRemainingPocketValue = roundToTwoDecimals(expectedTotalIncome - distributedWithoutRemaining);
  const getEffectivePocketAssignedValue = (pocket: Record<string, unknown>) => {
    if (String(pocket.typeRule || "") === "-") {
      return roundToTwoDecimals(Math.max(0, computedRemainingPocketValue));
    }
    return getPocketAssignedValue(pocket, expectedTotalIncome);
  };

  const distributedTotal = activePockets.reduce(
    (acc, item) => roundToTwoDecimals(acc + getEffectivePocketAssignedValue(item)),
    0
  );

  const savingsTotal = activePockets
    .filter((item) => String(item.category || "").toUpperCase() === "AHORRO")
    .reduce((acc, item) => roundToTwoDecimals(acc + getEffectivePocketAssignedValue(item)), 0);

  const expensesTotal = activePockets
    .filter((item) => String(item.category || "").toUpperCase() === "GASTO")
    .reduce((acc, item) => roundToTwoDecimals(acc + getEffectivePocketAssignedValue(item)), 0);

  const monthlyProgress = expectedTotalIncome > 0
    ? roundToTwoDecimals(Math.max(0, Math.min(100, (distributedTotal / expectedTotalIncome) * 100)))
    : 0;

  const pendingCommitments = (viewData?.commitments ?? []).filter((item) => {
    const state = String(item.state || "").toUpperCase();
    return state === "PENDIENTE" || state === "RESERVADO";
  });
  const createdCommitments = viewData?.commitments ?? [];
  const pendingCommitmentsTotal = pendingCommitments.reduce((acc, item) => {
    const value = Number(item.estimatedValue || 0);
    return roundToTwoDecimals(acc + (Number.isFinite(value) ? value : 0));
  }, 0);
  const nextCommitment = [...pendingCommitments]
    .filter((item) => String(item.endedDate || "").trim())
    .sort((a, b) => String(a.endedDate || "").localeCompare(String(b.endedDate || "")))[0];

  const incomeByMemberId = new Map(
    (viewData?.incomes ?? []).map((income) => [String(income.memberId || ""), Number(income.pocketsValue || 0)])
  );

  useEffect(() => {
    if (activeTab !== "inicio") return;
    if (activeModal !== null) return;
    if (isLoading) return;
    if (!viewData) return;
    if (hasShownAutoInitialization) return;

    const shouldOpenWizard = !hasMembers || !hasCycle || !hasIncomes;
    if (!shouldOpenWizard) {
      setHasShownAutoInitialization(true);
      return;
    }

    const nextStep = !hasMembers ? 0 : !hasCycle ? 1 : 2;
    setWizardStep(nextStep);
    setWizardError(null);
    setHasShownAutoInitialization(true);
    openModal("wizardInitialization");
  }, [
    activeModal,
    activeTab,
    hasCycle,
    hasIncomes,
    hasMembers,
    hasShownAutoInitialization,
    isLoading,
    viewData,
  ]);

  const quickActionSections = useMemo(
    () => [
      {
        title: "Personas",
        actions: [
          {
            label: "Crear miembro",
            target: "formNewMember" as ModalKey,
            icon: "account-outline",
            accent: "#059669",
            background: "#ECFDF5",
          },
          {
            label: "Crear periodo",
            target: "formNewPeriod" as ModalKey,
            icon: "calendar-month-outline",
            accent: "#1D4ED8",
            background: "#EFF6FF",
          },
        ],
      },
      {
        title: "Finanzas",
        actions: [
          {
            label: "Configurar bolsa",
            target: "formConfigureBag" as ModalKey,
            icon: "briefcase-outline",
            accent: "#0891B2",
            background: "#ECFEFF",
          },
          {
            label: "Crear compromiso",
            target: "formNewCommitment" as ModalKey,
            icon: "clipboard-text-outline",
            accent: "#EA580C",
            background: "#FFF7ED",
          },
          {
            label: "Ingresar saldo bolsa",
            target: "formRegisterBalance" as ModalKey,
            icon: "cash-plus",
            accent: "#CA8A04",
            background: "#FEFCE8",
          },
        ],
      },
      {
        title: "Operaciones",
        actions: [
          {
            label: "Registrar movimiento",
            target: "formRegisterMovement" as ModalKey,
            icon: "swap-horizontal",
            accent: "#4F46E5",
            background: "#EEF2FF",
          },
        ],
      },
    ],
    []
  );

  const openModal = (modal: ModalKey) => {
    if (modal === "formNewMember") {
      setMemberName("");
      setMemberEmail("");
      setMemberBank("");
      setMemberContract("");
      setMemberActive(true);
      setMemberSubmitError(null);
    }

    if (modal === "formNewPeriod") {
      setPeriodId("");
      setPeriodSubmitError(null);
    }

    if (modal === "formConfigureBag") {
      setPocketName("");
      setPocketBank("");
      setPocketContract("");
      setPocketValueRule("");
      setBagCategory("Gasto");
      setBagRuleType("Valor");
      setPocketSubmitError(null);
    }

    if (modal === "formNewCommitment") {
      setCommitmentAccountType("");
      setCommitmentOriginId("");
      setCommitmentOriginValue("Seleccione un Origen");
      setCommitmentAccountMenuVisible(false);
      setCommitmentOriginMenuVisible(false);
      setCommitmentConcept("");
      setCommitmentReference("");
      setCommitmentEstimatedValue("");
      setCommitmentEndedDate("");
      setCommitmentEndedDatePickerVisible(false);
      setCommitmentEndedDateValue(new Date());
      setCommitmentPeriodicidad("Selecciona tipo origen");
      setCommitmentSubmitError(null);
    }

    if (modal === "formRegisterBalance") {
      const plannedPeriod = (viewData?.periods ?? []).find(
        (item) => String(item.state || "").toUpperCase() === "PLANIFICADO"
      );

      setBalancePocketId("");
      setBalancePocketLabel("Selecciona una bolsa");
      setBalancePeriodId(plannedPeriod ? String(plannedPeriod.id || "") : "");
      setBalancePeriodLabel(plannedPeriod ? String(plannedPeriod.name || plannedPeriod.id || "") : "Sin periodo PLANIFICADO");
      setBalancePocketMenuVisible(false);
      setBalanceValue("");
      setBalanceSubmitError(null);
    }

    if (modal === "formRegisterMovement") {
      const activeCycle = (viewData?.periods ?? []).find((item) => {
        const state = String(item.state || "").toUpperCase();
        return state === "ACTIVO" || state === "ABIERTO";
      });

      const plannedCycle = (viewData?.periods ?? []).find(
        (item) => String(item.state || "").toUpperCase() === "PLANIFICADO"
      );

      const selectedCycle = activeCycle ?? plannedCycle;

      setMovementType("");
      setMovementOrigin("");
      setMovementDestination("");
      setMovementTypeMenuVisible(false);
      setMovementOriginMenuVisible(false);
      setMovementDestinationMenuVisible(false);
      setMovementOriginReferenceMenuVisible(false);
      setMovementDestinationReferenceMenuVisible(false);
      setMovementOriginReferenceId("");
      setMovementDestinationReferenceId("");
      setMovementOriginReferenceLabel("Seleccione referencia origen");
      setMovementDestinationReferenceLabel("Seleccione referencia destino");
      setMovementOriginReferenceText("");
      setMovementDestinationReferenceText("");
      setMovementValue("");
      setMovementConcept("");
      setMovementSubmitError(null);
      setMovementPeriodId(selectedCycle ? String(selectedCycle.id || "") : "");
      setMovementPeriodLabel(
        selectedCycle ? String(selectedCycle.name || selectedCycle.id || "") : "Sin ciclo ACTIVO o PLANIFICADO"
      );
    }

    if (modal === "wizardInitialization") {
      setWizardError(null);
    }
    setActiveModal(modal);
  };

  const handleQuickActionSelect = (target: ModalKey) => {
    setActiveModal(null);
    setTimeout(() => openModal(target), 80);
  };

  const handleOpenMemberDetail = (memberId: string) => {
    const member = (viewData?.members ?? []).find((item) => String(item.id || "") === memberId) ?? null;
    setSelectedMemberId(memberId);
    setMemberActive(String(member?.state || "").toUpperCase() === "ACTIVE");
    setMemberDetailSaveError(null);
    // preload income info for edit
    const income = (viewData?.incomes || []).find((inc) => String(inc.memberId || "") === memberId) ?? null;
    setEditIncomeId(income ? String(income.id || "") : null);
    setEditIncomeValue(income ? normalizeNumericInput(String(roundToTwoDecimals(Number(income.realValue || income.pocketsValue || 0)))) : "");
    openModal("detailMember");
  };

  const handleOpenCommitmentDetail = (commitmentId: string) => {
    const commitment = (viewData?.commitments ?? []).find((item) => String(item.id || "") === commitmentId) ?? null;
    if (!commitment) return;

    const originType = String(commitment.commitmentOriginType || "").toUpperCase();
    const originId = String(commitment.originId || "");
    const originLabel =
      originType === "BOLSA"
        ? String((viewData?.pockets ?? []).find((item) => String(item.id || "") === originId)?.name || "Seleccione una bolsa")
        : originType === "MIEMBRO"
          ? String((viewData?.members ?? []).find((item) => String(item.id || "") === originId)?.name || "Seleccione un miembro")
          : "Seleccione un Origen";

    setSelectedCommitmentId(commitmentId);
    setCommitmentAccountType(originType === "BOLSA" || originType === "MIEMBRO" ? (originType as "BOLSA" | "MIEMBRO") : "");
    setCommitmentOriginId(originId);
    setCommitmentOriginValue(originLabel);
    setCommitmentConcept(String(commitment.commitmentConcept || ""));
    setCommitmentReference(String(commitment.reference || ""));
    setCommitmentEstimatedValue(normalizeNumericInput(String(roundToTwoDecimals(Number(commitment.estimatedValue || 0)))));
    setCommitmentEndedDate(String(commitment.endedDate || ""));
    if (String(commitment.endedDate || "").trim()) {
      const nextDate = new Date(String(commitment.endedDate));
      if (!Number.isNaN(nextDate.getTime())) {
        setCommitmentEndedDateValue(nextDate);
      }
    }
    setCommitmentPeriodicidad(String(commitment.period || "MENSUAL"));
    setCommitmentAccountMenuVisible(false);
    setCommitmentOriginMenuVisible(false);
    setCommitmentPeriodMenuVisible(false);
    setCommitmentEndedDatePickerVisible(false);
    setCommitmentDetailError(null);
    openModal("detailCommitment");
  };

  const handleOpenBagDetail = (pocketId: string) => {
    const pocket = (viewData?.pockets ?? []).find((item) => String(item.id || "") === pocketId) ?? null;
    if (!pocket) return;

    const typeRule = String(pocket.typeRule || "");
    const category = String(pocket.category || "GASTO").toUpperCase();
    setSelectedPocketId(pocketId);
    setPocketName(String(pocket.name || ""));
    setPocketBank(String(pocket.bank || ""));
    setPocketContract(String(pocket.contract || ""));
    setPocketValueRule(normalizeNumericInput(String(roundToTwoDecimals(Number(pocket.valueRule || 0)))));
    setBagCategory(category === "AHORRO" ? "Ahorro" : "Gasto");
    setBagRuleType(typeRule === "%" ? "Porcentaje" : typeRule === "-" ? "Restante" : "Valor");
    setPocketDetailError(null);
    openModal("detailBag");
  };

  const resolveMovementReferenceLabel = (typeRaw: string, referenceRaw: string) => {
    const type = String(typeRaw || "").toUpperCase();
    const reference = String(referenceRaw || "").trim();
    if (!reference) return "Sin referencia";

    if (type === "OTRO") {
      return reference;
    }

    if (type === "MIEMBRO") {
      const member = (viewData?.members ?? []).find((item) => String(item.id || "") === reference);
      return String(member?.name || reference);
    }

    if (type === "BOLSA") {
      const pocket = (viewData?.pockets ?? []).find((item) => String(item.id || "") === reference);
      return String(pocket?.name || reference);
    }

    if (type === "COMPROMISO") {
      const commitment = (viewData?.commitments ?? []).find((item) => String(item.id || "") === reference);
      return String(commitment?.commitmentConcept || commitment?.reference || reference);
    }

    return reference;
  };

  const handleOpenMovementDetail = (movement: Record<string, unknown> & { id?: string }) => {
    const previousModal = activeModal === "detailMember" || activeModal === "detailBag" ? activeModal : null;
    setMovementReturnModal(previousModal);
    setSelectedMovementSnapshot(movement);
    setSelectedMovementId(String(movement.id || "") || null);
    setActiveModal("detailMovement");
  };

  const handleSaveCommitmentDetail = async () => {
    if (!selectedCommitmentId || !currentCycle) return;

    const isAccountSelected = commitmentAccountType === "BOLSA" || commitmentAccountType === "MIEMBRO";
    if (!isAccountSelected || !commitmentOriginId || !commitmentConcept.trim() || !commitmentReference.trim() || !commitmentEstimatedValue.trim()) {
      setCommitmentDetailError("Completa los campos requeridos del compromiso.");
      return;
    }

    try {
      setIsSavingCommitmentDetail(true);
      setCommitmentDetailError(null);
      await updateFamilyCommitment(workspace.familyId, selectedCommitmentId, String(currentCycle.id || ""), {
        commitmentOriginType: commitmentAccountType,
        originId: commitmentOriginId,
        commitmentConcept: commitmentConcept.trim(),
        reference: commitmentReference.trim(),
        estimatedValue: roundToTwoDecimals(parseNumericInput(commitmentEstimatedValue)),
        endedDate: commitmentEndedDate.trim() ? commitmentEndedDate.trim() : null,
        period: commitmentPeriodicidad as "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICO",
      });
      await refreshDashboard();
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("COMMITMENT_FIELDS_REQUIRED")) {
        setCommitmentDetailError("Datos del compromiso invalidos. Revisa los campos.");
      } else {
        setCommitmentDetailError("No se pudo guardar el compromiso. Intenta nuevamente.");
      }
    } finally {
      setIsSavingCommitmentDetail(false);
    }
  };

  const handleDeleteCommitmentDetail = async () => {
    if (!selectedCommitmentId || !currentCycle) return;
    try {
      setIsSavingCommitmentDetail(true);
      setCommitmentDetailError(null);
      await deleteFamilyCommitment(workspace.familyId, selectedCommitmentId, String(currentCycle.id || ""));
      await refreshDashboard();
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ONLY_PLANNED_CYCLE_ALLOWS_DELETE_OR_UPDATE")) {
        setCommitmentDetailError("Solo puedes eliminar compromisos en ciclo PLANIFICADO.");
      } else {
        setCommitmentDetailError("No se pudo eliminar el compromiso.");
      }
    } finally {
      setIsSavingCommitmentDetail(false);
    }
  };

  const handleSavePocketDetail = async () => {
    if (!selectedPocketId || !currentCycle) return;
    try {
      setIsSavingPocketDetail(true);
      setPocketDetailError(null);

      const typeRuleMap: Record<typeof bagRuleType, "$" | "%" | "-"> = {
        Valor: "$",
        Porcentaje: "%",
        Restante: "-",
      };
      const categoryMap: Record<typeof bagCategory, "GASTO" | "AHORRO"> = {
        Gasto: "GASTO",
        Ahorro: "AHORRO",
      };

      await updateFamilyPocket(workspace.familyId, selectedPocketId, String(currentCycle.id || ""), {
        name: pocketName.trim(),
        bank: pocketBank.trim(),
        contract: pocketContract.trim(),
        typeRule: typeRuleMap[bagRuleType],
        valueRule: bagRuleType === "Restante" ? roundToTwoDecimals(Math.max(0, computedRemainingPocketValue)) : roundToTwoDecimals(parseNumericInput(pocketValueRule)),
        category: categoryMap[bagCategory],
      });
      await refreshDashboard();
      closeModal();
    } catch (error) {
      setPocketDetailError("No se pudo guardar la bolsa. Revisa los datos.");
    } finally {
      setIsSavingPocketDetail(false);
    }
  };

  const handleDeletePocketDetail = async () => {
    if (!selectedPocketId || !currentCycle) return;
    try {
      setIsSavingPocketDetail(true);
      setPocketDetailError(null);
      await deleteFamilyPocketCascade(workspace.familyId, selectedPocketId, String(currentCycle.id || ""));
      await refreshDashboard();
      closeModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ONLY_PLANNED_CYCLE_ALLOWS_DELETE_OR_UPDATE")) {
        setPocketDetailError("Solo puedes eliminar bolsas en ciclo PLANIFICADO.");
      } else {
        setPocketDetailError("No se pudo eliminar la bolsa.");
      }
    } finally {
      setIsSavingPocketDetail(false);
    }
  };

  const handleSaveMemberDetail = async () => {
    if (!selectedMemberId) {
      return;
    }
    try {
      setIsSavingMemberDetail(true);
      setMemberDetailSaveError(null);
      await updateFamilyMember(workspace.familyId, selectedMemberId, {
        state: memberActive ? "ACTIVE" : "INACTIVE",
      });
      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Dashboard update member detail error:", error);
      setMemberDetailSaveError("No se pudieron guardar los cambios del miembro. Intenta de nuevo.");
    } finally {
      setIsSavingMemberDetail(false);
    }
  };

  const handleSaveEditedIncome = async () => {
    if (!selectedMemberId || !budgetCycle) return;
    try {
      setIsSavingEditIncome(true);
      const valueNum = parseNumericInput(editIncomeValue || "");
      if (!Number.isFinite(valueNum)) throw new Error("INVALID_VALUE");
      await updateFamilyInitialIncome(workspace.familyId, String(budgetCycle.id || budgetCycle?.id || ""), selectedMemberId, roundToTwoDecimals(valueNum));
      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Error updating income:", error);
    } finally {
      setIsSavingEditIncome(false);
    }
  };

  const handleDeleteMember = async () => {
    if (!selectedMemberId) return;
    try {
      setIsSavingMemberDetail(true);
      await deleteFamilyMemberCascade(workspace.familyId, selectedMemberId);
      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Error deleting member:", error);
      Alert.alert("Error", "No se pudo eliminar el miembro.");
    } finally {
      setIsSavingMemberDetail(false);
    }
  };

  const closeModal = () => {
    if (activeModal === "detailMovement" && movementReturnModal) {
      setActiveModal(movementReturnModal);
      setMovementReturnModal(null);
      return;
    }
    if (activeModal === "detailMovement") {
      setSelectedMovementId(null);
      setSelectedMovementSnapshot(null);
      setMovementReturnModal(null);
    }
    setActiveModal(null);
  };

  const refreshDashboard = async () => {
    const [nextData, nextViewData] = await Promise.all([
      loadFamilyViewData(workspace),
      getFamilyViewData(workspace.familyId, activeTab),
    ]);

    setData(nextData);
    setViewData(nextViewData);
  };

  const handlePullToRefresh = async () => {
    if (activeModal !== null) return;
    if (isRefreshing) return;
    try {
      setIsRefreshing(true);
      await refreshDashboard();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateMember = async () => {
    try {
      setIsSavingMember(true);
      setMemberSubmitError(null);

      await createFamilyMember(workspace.familyId, {
        name: memberName,
        emailMember: memberEmail,
        bank: memberBank,
        contract: memberContract,
        state: memberActive ? "ACTIVE" : "INACTIVE",
      });

      await refreshDashboard();
      if (returnToWizardStep !== null) {
        setWizardStep(returnToWizardStep);
        setReturnToWizardStep(null);
        setActiveModal("wizardInitialization");
      } else {
        closeModal();
      }
    } catch (error) {
      console.error("Dashboard create member error:", error);
      setMemberSubmitError("No se pudo guardar el miembro. Revisa los datos e intenta de nuevo.");
    } finally {
      setIsSavingMember(false);
    }
  };

  const handleCreatePeriod = async () => {
    try {
      setIsSavingPeriod(true);
      setPeriodSubmitError(null);

      await createFamilyPeriod(workspace.familyId, {
        periodId,
        name: formatPeriodName(periodId),
      });

      await refreshDashboard();
      if (returnToWizardStep !== null) {
        setWizardStep(returnToWizardStep);
        setReturnToWizardStep(null);
        setActiveModal("wizardInitialization");
      } else {
        closeModal();
      }
    } catch (error) {
      console.error("Dashboard create period error:", error);
      setPeriodSubmitError("No se pudo guardar el periodo. Verifica el ID e intenta de nuevo.");
    } finally {
      setIsSavingPeriod(false);
    }
  };

  const handleCreatePocket = async () => {
    const isRemainingPocket = bagRuleType === "Restante";

    if (isRemainingPocket && hasExistingRemainingPocket) {
      setPocketSubmitError("Solo se permite una bolsa tipo Restante.");
      return;
    }

    if (isRemainingPocket && (!Number.isFinite(expectedTotalIncome) || expectedTotalIncome <= 0)) {
      setPocketSubmitError("Debes tener un ciclo PLANIFICADO con ingreso esperado mayor a 0.");
      return;
    }

    const resolvedValueRule = isRemainingPocket ? roundToTwoDecimals(computedRemainingPocketValue) : roundToTwoDecimals(parseNumericInput(pocketValueRule));
    if (!Number.isFinite(resolvedValueRule) || resolvedValueRule < 0) {
      setPocketSubmitError("El valor calculado para Restante no es valido.");
      return;
    }

    try {
      setIsSavingPocket(true);
      setPocketSubmitError(null);

      const typeRuleMap: Record<typeof bagRuleType, "$" | "%" | "-"> = {
        Valor: "$",
        Porcentaje: "%",
        Restante: "-",
      };

      const categoryMap: Record<typeof bagCategory, "GASTO" | "AHORRO"> = {
        Gasto: "GASTO",
        Ahorro: "AHORRO",
      };

      await createFamilyPocket(workspace.familyId, {
        name: pocketName,
        bank: pocketBank,
        contract: pocketContract,
        typeRule: typeRuleMap[bagRuleType],
        valueRule: resolvedValueRule,
        category: categoryMap[bagCategory],
      });

      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Dashboard create pocket error:", error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ONLY_ONE_REMAINING_POCKET_ALLOWED")) {
        setPocketSubmitError("Solo se permite una bolsa tipo Restante.");
      } else if (message.includes("PLANNED_CYCLE_REQUIRED_FOR_REMAINING_POCKET") || message.includes("EXPECTED_TOTAL_INCOME_REQUIRED")) {
        setPocketSubmitError("Debes tener un ciclo PLANIFICADO con ingreso esperado para calcular Restante.");
      } else if (message.includes("INVALID_REMAINING_POCKET_VALUE")) {
        setPocketSubmitError("La distribucion supera el ingreso esperado. Ajusta tus bolsas antes de crear Restante.");
      } else {
        setPocketSubmitError("No se pudo guardar la bolsa. Revisa los datos e intenta de nuevo.");
      }
    } finally {
      setIsSavingPocket(false);
    }
  };

  const handleCreateCommitment = async () => {
    if (commitmentAccountType !== "BOLSA" && commitmentAccountType !== "MIEMBRO") {
      setCommitmentSubmitError("Selecciona una cuenta origen para continuar.");
      return;
    }

    try {
      setIsSavingCommitment(true);
      setCommitmentSubmitError(null);

      await createFamilyCommitment(workspace.familyId, {
        commitmentOriginType: commitmentAccountType,
        originId: commitmentOriginId,
        commitmentConcept: commitmentConcept,
        reference: commitmentReference,
        estimatedValue: roundToTwoDecimals(parseNumericInput(commitmentEstimatedValue)),
        endedDate: commitmentEndedDate.trim() ? commitmentEndedDate.trim() : null,
        period: commitmentPeriodicidad as "MENSUAL" | "BIMESTRAL" | "TRIMESTRAL" | "SEMESTRAL" | "ANUAL" | "UNICO",
      });

      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Dashboard create commitment error:", error);
      setCommitmentSubmitError("No se pudo guardar el compromiso. Revisa los datos e intenta de nuevo.");
    } finally {
      setIsSavingCommitment(false);
    }
  };

  const handleCreatePocketBalance = async () => {
    try {
      setIsSavingBalance(true);
      setBalanceSubmitError(null);

      await createFamilyPocketBalance(workspace.familyId, {
        periodId: balancePeriodId,
        pocketId: balancePocketId,
        balanceValue: roundToTwoDecimals(parseNumericInput(balanceValue)),
      });

      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Dashboard create pocket balance error:", error);
      setBalanceSubmitError("No se pudo registrar el saldo inicial. Revisa los datos e intenta de nuevo.");
    } finally {
      setIsSavingBalance(false);
    }
  };

  const handleCommitmentDateValueChange = (_event: unknown, selectedDate: Date) => {
    if (!selectedDate) {
      return;
    }

    if (Platform.OS === "android") {
      setCommitmentEndedDatePickerVisible(false);
    }

    setCommitmentEndedDateValue(selectedDate);
    setCommitmentEndedDate(formatDateForStorage(selectedDate));
  };

  const handleCommitmentDateDismiss = () => {
    if (Platform.OS === "android") {
      setCommitmentEndedDatePickerVisible(false);
    }
  };

  const handleCreateMovement = async () => {
    const referenceOrigin = movementOrigin === "OTRO"
      ? movementOriginReferenceText.trim()
      : movementOriginReferenceId.trim();

    const referenceDestination = movementDestination === "OTRO"
      ? movementDestinationReferenceText.trim()
      : movementDestinationReferenceId.trim();

    if (!referenceOrigin || !referenceDestination) {
      setMovementSubmitError("Completa Referencia Origen y Referencia Destino para continuar.");
      return;
    }

    const selectedCycle = (viewData?.periods ?? []).find(
      (period) => String(period.id || "") === movementPeriodId
    );
    const selectedCycleState = String(selectedCycle?.state || "").toUpperCase();
    if ((movementType === "INGRESO" || movementType === "RESERVADO") && selectedCycleState !== "PLANIFICADO") {
      setMovementSubmitError("Solo puedes registrar INGRESO o RESERVADO en ciclos PLANIFICADOS.");
      return;
    }

    try {
      setIsSavingMovement(true);
      setMovementSubmitError(null);

      await createFamilyMovement(workspace.familyId, {
        periodId: movementPeriodId,
        movementConcept: movementConcept.trim(),
        movementType: movementType as "INGRESO" | "COMPROMISO" | "RESERVADO" | "GASTO",
        value: roundToTwoDecimals(parseNumericInput(movementValue)),
        originType: movementOrigin as "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO",
        referenceOrigin,
        destinationType: movementDestination as "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO",
        referenceDestination,
      });

      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Dashboard create movement error:", error);
      const message = error instanceof Error ? error.message : "";
      if (message.includes("ONLY_PLANNED_CYCLE_ALLOWS_INGRESO_OR_RESERVADO")) {
        setMovementSubmitError("Solo puedes registrar INGRESO o RESERVADO en ciclos PLANIFICADOS.");
      } else {
        setMovementSubmitError("No se pudo guardar el movimiento. Revisa los datos e intenta de nuevo.");
      }
    } finally {
      setIsSavingMovement(false);
    }
  };

  const openInitializationAction = (target: "formNewMember" | "formNewPeriod", step: number) => {
    setReturnToWizardStep(step);
    openModal(target);
  };

  const handleInitializationContinue = async () => {
    setWizardError(null);

    if (wizardStep === 0) {
      if ((viewData?.members ?? []).length === 0) {
        setWizardError("Aun no tienes participantes registrados.");
        return;
      }
      setWizardStep(1);
      return;
    }

    if (wizardStep === 1) {
      const hasPeriod = (viewData?.periods ?? []).some((item) => {
        const state = String(item.state || "").toUpperCase();
        return state === "PLANIFICADO" || state === "ACTIVO" || state === "ABIERTO";
      });

      if (!hasPeriod) {
        setWizardError("Debes crear un ciclo antes de continuar.");
        return;
      }
      setWizardStep(2);
    }
  };

  const handleInitializationRefresh = async () => {
    setWizardError(null);
    await refreshDashboard();
  };

  const handleInitializationIncomeChange = (memberId: string, value: string) => {
    const normalized = normalizeNumericInput(value);
    setWizardIncomeByMemberId((prev) => ({
      ...prev,
      [memberId]: normalized,
    }));
  };

  const handleSaveInitialIncomes = async () => {
    const planned = (viewData?.periods ?? []).find(
      (item) => String(item.state || "").toUpperCase() === "PLANIFICADO"
    );

    if (!planned) {
      setWizardError("Debes tener un ciclo PLANIFICADO para registrar ingresos iniciales.");
      return;
    }

    const members = viewData?.members ?? [];
    const existingMemberIncomes = new Set(
      (viewData?.incomes ?? []).map((income) => String(income.memberId || "")).filter(Boolean)
    );
    const pending = members.filter((member) => {
      const memberId = String(member.id || "");
      if (existingMemberIncomes.has(memberId)) {
        return false;
      }
      const value = parseNumericInput(wizardIncomeByMemberId[String(member.id || "")] || "");
      return !Number.isFinite(value) || value <= 0;
    });

    if (pending.length > 0) {
      setWizardError(`Pendientes por ingreso: ${pending.length} participante(s).`);
      return;
    }

    try {
      setIsSavingWizardIncomes(true);
      setWizardError(null);

      for (const member of members) {
        const memberId = String(member.id || "");
        if (existingMemberIncomes.has(memberId)) {
          continue;
        }
        const value = parseNumericInput(wizardIncomeByMemberId[memberId] || "");
        await createFamilyInitialIncome(workspace.familyId, String(planned.id || ""), {
          memberId,
          realValue: roundToTwoDecimals(value),
        });
      }

      await refreshDashboard();
      closeModal();
    } catch (error) {
      console.error("Dashboard create initial incomes error:", error);
      setWizardError("No se pudieron guardar los ingresos iniciales. Intenta nuevamente.");
    } finally {
      setIsSavingWizardIncomes(false);
    }
  };

  const getMovementReferencePlaceholder = (kind: "origen" | "destino", type: "" | MovementPartyType) => {
    if (!type) return kind === "origen" ? "Seleccione referencia origen" : "Seleccione referencia destino";
    if (type === "MIEMBRO") return "Seleccione un miembro";
    if (type === "BOLSA") return "Seleccione una bolsa";
    if (type === "COMPROMISO") return "Seleccione un compromiso";
    return kind === "origen" ? "Escriba referencia origen" : "Escriba referencia destino";
  };

  const getMovementReferenceOptions = (type: "" | MovementPartyType) => {
    if (type === "MIEMBRO") {
      return (viewData?.members ?? []).map((item, index) => ({
        id: String(item.id || ""),
        label: String(item.name || `Miembro ${index + 1}`),
      }));
    }

    if (type === "BOLSA") {
      return (viewData?.pockets ?? []).map((item, index) => ({
        id: String(item.id || ""),
        label: String(item.name || `Bolsa ${index + 1}`),
      }));
    }

    if (type === "COMPROMISO") {
      return (viewData?.commitments ?? []).map((item, index) => ({
        id: String(item.id || ""),
        label: String(item.name || item.commitmentConcept || item.reference || `Compromiso ${index + 1}`),
      }));
    }

    return [];
  };

  const renderModalBody = () => {
    if (!activeModal) return null;

    if (activeModal === "quickActions") {
      return (
        <>
          <View style={styles.quickActionsGroupedList}>
            {quickActionSections.map((section, sectionIndex) => (
              <View key={section.title} style={styles.quickActionsSectionBlock}>
                {sectionIndex > 0 ? <Divider style={styles.quickActionsSectionDivider} /> : null}
                <PaperText style={[styles.quickActionsSectionTitle, { color: uiColors.mutedText }]}>{section.title}</PaperText>
                {section.actions.map((action) => (
                  <Pressable
                    key={action.label}
                    style={[styles.quickActionRow, { borderColor: action.accent, backgroundColor: action.background }]}
                    onPress={() => handleQuickActionSelect(action.target)}
                  >
                    <View style={[styles.quickActionIconWrap, { backgroundColor: "#FFFFFF" }]}>
                      <Icon source={action.icon} size={20} color={action.accent} />
                    </View>
                    <PaperText style={[styles.quickActionLabel, { color: action.accent }]}>{action.label}</PaperText>
                    <Icon source="chevron-right" size={20} color={action.accent} />
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </>
      );
    }

    if (activeModal === "detailMember") {
      const member = selectedMember ?? {
        name: "Sin definir",
        emailMember: "Sin definir",
        bank: "Sin definir",
        contract: "Sin definir",
        state: "INACTIVE",
      };
      const memberEmail = String((member as any).emailMember || (member as any).email || "Sin definir");
      const memberStateCycle = String((member as any).stateCycle || "Sin definir").trim().toUpperCase();
      const memberStateCycleStyles = memberStateCycle === "PLANIFICADO"
        ? { backgroundColor: "#DBEAFE", color: "#1D4ED8" }
        : memberStateCycle === "CERRADO"
          ? { backgroundColor: "#DCFCE7", color: "#059669" }
          : { backgroundColor: theme.colors.surfaceVariant, color: uiColors.onSurface };

      return (
        <>
          <View style={styles.memberDetailAvatarContainer}>
            <View style={styles.memberDetailAvatar}>
              <Icon source="account-circle" size={48} color={uiColors.memberAccent} />
            </View>
          </View>

          
                    <TextInput mode="outlined" theme={modalTextInputTheme}
            label="Nombre"
            value={String(member.name || "Sin definir")}
            editable={false}
                      style={[modalInputFieldStyle, styles.memberDetailFirstField]}
          />

                    <TextInput
                      mode="outlined"
                      theme={modalTextInputTheme}
                      label="Correo Miembro"
                      value={memberEmail}
                      editable={false}
                      style={modalInputFieldStyle}
                    />
          
                    <TextInput mode="outlined" theme={modalTextInputTheme}
            label="Banco"
            value={String(member.bank || "Sin definir")}
            editable={false}
            style={modalInputFieldStyle}
          />
          
                    <TextInput mode="outlined" theme={modalTextInputTheme}
            label="Contrato ingresos"
            value={String(member.contract || "Sin definir")}
            editable={false}
            style={modalInputFieldStyle}
          />

          <Pressable style={styles.checkboxRow} onPress={() => setMemberActive((value) => !value)}>
            <Checkbox status={memberActive ? "checked" : "unchecked"} />
            <View style={styles.checkboxTextBlock}>
              <PaperText style={styles.checkboxText}>Miembro activo</PaperText>
              <PaperText style={[styles.helperText, styles.checkboxHelperText]}>Indica que el miembro se encuentra habilitado dentro del sistema.</PaperText>
            </View>
          </Pressable>

          <View style={styles.detailGroup}>
            <View style={styles.memberStateRow}>
              <PaperText variant="labelLarge" style={[styles.formLabel, styles.memberStateLabel, { color: uiColors.onSurface }]} numberOfLines={1}>Estado presupuesto:</PaperText>
              <PaperText style={[styles.memberStateValue, { color: memberStateCycleStyles.color }]} numberOfLines={1}>{memberStateCycle}</PaperText>
            </View>
          </View>

          <Divider style={styles.divider} />

          <PaperText variant="titleSmall">Compromisos asociados</PaperText>
          {selectedMemberCommitments.length === 0 ? (
            <PaperText style={styles.helperText}>No hay compromisos atados a este miembro.</PaperText>
          ) : (
            <Card mode="elevated" style={[styles.miniCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}> 
              <Card.Content>
                {selectedMemberCommitments.map((item, index) => (
                  <Pressable key={String(item.id || `member-commitment-${index}`)} style={styles.entityRow} onPress={() => handleOpenCommitmentDetail(String(item.id || ""))}>
                    <View style={styles.pendingIconWrap}>
                      <Icon source="file-document-outline" size={20} color={uiColors.commitmentAccent} />
                    </View>
                    <View style={styles.pendingInfo}>
                      <PaperText style={styles.pendingName}>{String(item.commitmentConcept || item.reference || `Compromiso ${index + 1}`)}</PaperText>
                      <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>Fecha: {String(item.endedDate || "Sin fecha")}</PaperText>
                    </View>
                    <PaperText style={styles.pendingAmount}>{toCurrency(Number(item.estimatedValue || 0))}</PaperText>
                  </Pressable>
                ))}
              </Card.Content>
            </Card>
          )}

          <PaperText variant="titleSmall">Historial de movimientos</PaperText>
          {detailMemberMovements.length === 0 ? (
            <PaperText style={styles.helperText}>No hay movimientos para el ciclo abierto o planificado.</PaperText>
          ) : (
            <Card mode="elevated" style={[styles.movementCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}> 
              <Card.Content>
                <PaperText variant="titleMedium">Movimientos de {String(currentCycle?.name || currentCycle?.id || "este ciclo")}</PaperText>
                {detailMemberMovements.map((movement) => {
                  const { dateLabel, timeLabel } = formatMovementDateTime(movement as Record<string, unknown>);
                  const movementTypeLabel = String(movement.movementType || movement.type || "").toUpperCase();
                  const isIncomeMovement = movementTypeLabel === "INGRESO";
                  const movementColor = isIncomeMovement ? (theme.dark ? "#6EE7B7" : "#059669") : (theme.dark ? "#FB7185" : "#DC2626");
                  const movementIcon = isIncomeMovement ? "arrow-down-circle" : "arrow-up-circle";
                  const concept = String(movement.movementConcept || movement.concept || "Sin concepto");
                  const value = movement.value != null ? toCurrency(Number(movement.value)) : String(movement.amount || "0");

                  return (
                    <Pressable
                      key={String(movement.id || `${concept}-${movement.createdAt || movement.date}`)}
                      style={styles.movementRow}
                      onPress={() => handleOpenMovementDetail(movement as Record<string, unknown> & { id?: string })}
                    >
                      <View style={styles.movementInfo}>
                            <View style={styles.movementDetailRow}>
                              <PaperText style={[styles.movementMeta, { color: movementColor, flex: 1 }]}>{dateLabel}</PaperText>
                              <PaperText style={[styles.movementMeta, { color: movementColor, textAlign: "right" }]}>{timeLabel}</PaperText>
                        </View>
                        <View style={styles.movementDetailRow}>
                              <View style={styles.movementConceptInline}>
                                <Icon source={movementIcon} size={16} color={movementColor} />
                                <PaperText style={[styles.movementLabel, { color: uiColors.onSurface, flex: 1 }]} numberOfLines={1}>{concept}</PaperText>
                              </View>
                              <PaperText style={[styles.movementValue, { color: movementColor, textAlign: "right" }]}>{value}</PaperText>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </Card.Content>
            </Card>
          )}

          {memberDetailSaveError ? <PaperText style={styles.errorText}>{memberDetailSaveError}</PaperText> : null}

          <View style={styles.modalActions}>
            {String(currentCycle?.state || "").toUpperCase() === "PLANIFICADO" ? (
              <Button mode="outlined" onPress={() => openModal("formEditIncome")}>Editar ingreso</Button>
            ) : null}
            <Button mode="contained" loading={isSavingMemberDetail} disabled={isSavingMemberDetail} onPress={handleSaveMemberDetail}>Guardar cambios</Button>
            {String(currentCycle?.state || "").toUpperCase() === "PLANIFICADO" ? (
              <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} onPress={() => openModal("confirmDeleteMember")}>Eliminar miembro</Button>
            ) : null}
          </View>
        </>
      );
    }

    if (activeModal === "formEditIncome") {
      const memberName = String(selectedMember?.name || "Miembro");
      const currentIncome = (viewData?.incomes ?? []).find((income) => String(income.memberId || "") === String(selectedMemberId || "")) ?? null;
      const currentIncomeValue = Number(currentIncome?.realValue || currentIncome?.pocketsValue || 0);
      const parsedIncomeValue = parseNumericInput(editIncomeValue || "");
      const isIncomeSaveDisabled =
        isSavingEditIncome ||
        !editIncomeValue.trim() ||
        !Number.isFinite(parsedIncomeValue) ||
        parsedIncomeValue < 0;

      return (
        <>
          <View style={styles.sheetHandle} />

          <PaperText variant="titleMedium" style={{ color: uiColors.onSurface }}>{`Editar ingreso de ${memberName}`}</PaperText>
          <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>{`Valor actual: ${toCurrency(currentIncomeValue)}`}</PaperText>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Nuevo valor</PaperText>
            <TextInput
              mode="outlined"
              theme={modalTextInputTheme}
              style={modalInputFieldStyle}
              keyboardType="numeric"
              value={editIncomeValue}
              onChangeText={(value) => setEditIncomeValue(normalizeNumericInput(value))}
              placeholder="Ejemplo: 1500000"
            />
          </View>

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={closeModal}>Cancelar</Button>
            <Button mode="contained" loading={isSavingEditIncome} disabled={isIncomeSaveDisabled} onPress={handleSaveEditedIncome}>Guardar ingreso</Button>
          </View>
        </>
      );
    }

    if (activeModal === "detailBag") {
      const pocket = selectedPocket ?? null;
      const isPlannedCycle = String(currentCycle?.state || "").toUpperCase() === "PLANIFICADO";
      const isRemainingPocket = bagRuleType === "Restante";
      const pocketBalances = (viewData?.pocketBalances ?? []).filter(
        (item) => String(item.pocketId || "") === String(pocket?.id || "")
      );
      const pocketInitialBalance = pocketBalances.length > 0 ? Number(pocketBalances[0].balanceValue || 0) : 0;
      const isPocketSaveDisabled =
        isSavingPocketDetail ||
        !pocketName.trim() ||
        !pocketBank.trim() ||
        !pocketContract.trim() ||
        (isRemainingPocket ? false : !pocketValueRule.trim() || !Number.isFinite(parseNumericInput(pocketValueRule)));

      return (
        <>
          <View style={styles.memberDetailAvatarContainer}>
            <Icon source={getPocketIconName(String(pocket?.name || "Bolsa"))} size={54} color={uiColors.pocketAccent} />
            <PaperText variant="titleMedium" style={{ marginTop: 8, color: uiColors.onSurface }}>{String(pocket?.name || "Bolsa")}</PaperText>
          </View>

          <Card mode="elevated" style={[styles.miniCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}> 
            <Card.Content>
              <PaperText variant="titleSmall">Saldo inicial</PaperText>
              <PaperText variant="titleMedium" style={{ color: uiColors.onSurface }}>{toCurrency(Number.isFinite(pocketInitialBalance) ? pocketInitialBalance : 0)}</PaperText>
            </Card.Content>
          </Card>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Nombre bolsa</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} value={pocketName} onChangeText={setPocketName} style={modalInputFieldStyle} />
          </View>
          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Tipo categoria</PaperText>
            <View style={styles.segmentRow}>
              {(["Gasto", "Ahorro"] as const).map((item) => (
                <Button
                  key={item}
                  mode={bagCategory === item ? "contained" : "outlined"}
                  style={styles.segmentButton}
                  contentStyle={styles.segmentButtonContent}
                  buttonColor={bagCategory === item ? theme.colors.primary : undefined}
                  textColor={bagCategory === item ? theme.colors.onPrimary : theme.colors.onSurface}
                  onPress={() => setBagCategory(item)}
                >
                  {item}
                </Button>
              ))}
            </View>
          </View>
          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Banco</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} value={pocketBank} onChangeText={setPocketBank} style={modalInputFieldStyle} />
          </View>
          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Contrato</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} value={pocketContract} onChangeText={setPocketContract} style={modalInputFieldStyle} />
          </View>
          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Tipo regla</PaperText>
            <View style={styles.segmentRow}>
              {(["Valor", "Porcentaje", "Restante"] as const).map((item) => (
                <Button
                  key={item}
                  mode={bagRuleType === item ? "contained" : "outlined"}
                  style={styles.segmentButton}
                  contentStyle={styles.segmentButtonContent}
                  buttonColor={bagRuleType === item ? theme.colors.primary : undefined}
                  textColor={bagRuleType === item ? theme.colors.onPrimary : theme.colors.onSurface}
                  onPress={() => setBagRuleType(item)}
                >
                  {item}
                </Button>
              ))}
            </View>
          </View>
          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Valor regla</PaperText>
            
                    <TextInput mode="outlined" theme={modalTextInputTheme}
              style={modalInputFieldStyle}
              keyboardType="numeric"
              value={
                isRemainingPocket
                  ? toCurrency(Math.max(0, computedRemainingPocketValue))
                          : pocketValueRule
              }
              onChangeText={(value) => setPocketValueRule(normalizeNumericInput(value))}
              editable={!isRemainingPocket}
            />
          </View>

          <PaperText variant="titleSmall">Compromisos asociados</PaperText>
          {selectedPocketCommitments.length === 0 ? (
            <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay compromisos asociados.</PaperText>
          ) : (
            <Card mode="elevated" style={[styles.miniCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}> 
              <Card.Content>
                {selectedPocketCommitments.map((item, index) => (
                  <Pressable key={String(item.id || `bag-commitment-${index}`)} style={styles.entityRow} onPress={() => handleOpenCommitmentDetail(String(item.id || ""))}>
                    <View style={styles.pendingIconWrap}>
                      <Icon source="file-document-outline" size={20} color={uiColors.commitmentAccent} />
                    </View>
                    <View style={styles.pendingInfo}>
                      <PaperText style={styles.pendingName}>{String(item.commitmentConcept || item.reference || `Compromiso ${index + 1}`)}</PaperText>
                      <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>Fecha: {String(item.endedDate || "Sin fecha")}</PaperText>
                    </View>
                    <PaperText style={styles.pendingAmount}>{toCurrency(Number(item.estimatedValue || 0))}</PaperText>
                  </Pressable>
                ))}
              </Card.Content>
            </Card>
          )}

          <PaperText variant="titleSmall">Movimientos asociados</PaperText>
          {selectedPocketMovements.length === 0 ? (
            <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay movimientos asociados.</PaperText>
          ) : (
            selectedPocketMovements.map((movement, index) => {
              const movType = String(movement.movementType || movement.type || "").toUpperCase();
              const isIncome = movType === "INGRESO";
              const movColor = isIncome ? (theme.dark ? "#6EE7B7" : "#059669") : (theme.dark ? "#FB7185" : "#DC2626");
              const movIcon = isIncome ? "arrow-down-circle" : "arrow-up-circle";
              const { dateLabel, timeLabel } = formatMovementDateTime(movement as Record<string, unknown>);
              return (
                <Pressable
                  key={String(movement.id || `bag-mov-${index}`)}
                  onPress={() => handleOpenMovementDetail(movement as Record<string, unknown> & { id?: string })}
                >
                  <Card mode="elevated" style={[styles.movementCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
                    <Card.Content>
                      <View style={styles.movementRowHeader}>
                        <View style={styles.movementConceptRow}>
                          <Icon source={movIcon} size={18} color={movColor} />
                          <PaperText style={[styles.movementConcept, { color: uiColors.onSurface }]}>{String(movement.movementConcept || movement.concept || "Sin concepto")}</PaperText>
                        </View>
                        <PaperText style={[styles.movementValueText, { color: movColor }]}>{toCurrency(Number(movement.value || 0))}</PaperText>
                      </View>
                      <View style={styles.movementRowFooter}>
                        <PaperText variant="bodySmall" style={[styles.movementDateTime, { color: movColor }]}>{`${dateLabel} ${timeLabel}`}</PaperText>
                        <PaperText variant="bodySmall" style={[styles.movementType, { color: movColor }]}>{movType || "--"}</PaperText>
                      </View>
                    </Card.Content>
                  </Card>
                </Pressable>
              );
            })
          )}

          {pocketDetailError ? <PaperText style={styles.errorText}>{pocketDetailError}</PaperText> : null}

          <View style={styles.modalActions}>
            <Button mode="contained" buttonColor={theme.colors.primary} loading={isSavingPocketDetail} disabled={isPocketSaveDisabled} onPress={handleSavePocketDetail}>Guardar cambios</Button>
            <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} loading={isSavingPocketDetail} disabled={!isPlannedCycle || isSavingPocketDetail} onPress={handleDeletePocketDetail}>Eliminar bolsa</Button>
            {!isPlannedCycle ? <PaperText style={[styles.helperText, { color: uiColors.warningText }]}>Solo puedes eliminar la bolsa con ciclo PLANIFICADO.</PaperText> : null}
          </View>
        </>
      );
    }

    if (activeModal === "detailCommitment") {
      const commitmentSourceOptions = commitmentAccountType === "BOLSA"
        ? (viewData?.pockets ?? []).map((item, index) => ({
          id: String(item.id || ""),
          label: String(item.name || `Bolsa ${index + 1}`),
        }))
        : commitmentAccountType === "MIEMBRO"
          ? (viewData?.members ?? []).map((item, index) => ({
          id: String(item.id || ""),
          label: String(item.name || `Miembro ${index + 1}`),
          }))
          : [];

      const isAccountSelected = commitmentAccountType === "BOLSA" || commitmentAccountType === "MIEMBRO";
      const isPlannedCycle = String(currentCycle?.state || "").toUpperCase() === "PLANIFICADO";
      const isCommitmentSaveDisabled =
        isSavingCommitmentDetail ||
        !isAccountSelected ||
        !commitmentOriginId ||
        !commitmentConcept.trim() ||
        !commitmentReference.trim() ||
        !commitmentEstimatedValue.trim() ||
        !Number.isFinite(parseNumericInput(commitmentEstimatedValue)) ||
        !["MENSUAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "UNICO"].includes(commitmentPeriodicidad);

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.memberDetailAvatarContainer}>
            <Icon source="file-document-edit-outline" size={54} color="#F97316" />
            <PaperText variant="titleMedium" style={{ marginTop: 8, color: uiColors.onSurface, textAlign: "center" }}>
              {String(commitmentConcept || commitmentReference || "Compromiso")}
            </PaperText>
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Cuenta Origen</PaperText>
            <Pressable style={selectorFieldStyle} onPress={() => setCommitmentAccountMenuVisible((prev) => !prev)}>
              <PaperText style={selectorTextStyle}>{isAccountSelected ? commitmentAccountType : "Seleccione una cuenta origen"}</PaperText>
              <Icon source={commitmentAccountMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentAccountMenuVisible && (
              <View style={dropdownListStyle}>
                <Pressable style={dropdownItemStyle} onPress={() => { setCommitmentAccountType("BOLSA"); setCommitmentOriginId(""); setCommitmentOriginValue("Seleccione una bolsa"); setCommitmentAccountMenuVisible(false); }}>
                  <PaperText style={dropdownItemTextStyle}>BOLSA</PaperText>
                </Pressable>
                <Pressable style={dropdownItemStyle} onPress={() => { setCommitmentAccountType("MIEMBRO"); setCommitmentOriginId(""); setCommitmentOriginValue("Seleccione un miembro"); setCommitmentAccountMenuVisible(false); }}>
                  <PaperText style={dropdownItemTextStyle}>MIEMBRO</PaperText>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Origen</PaperText>
            <Pressable
              style={[selectorFieldStyle, !isAccountSelected && { opacity: 0.6 }]}
              onPress={() => {
                if (!isAccountSelected) return;
                setCommitmentOriginMenuVisible((prev) => !prev);
              }}
            >
              <PaperText style={selectorTextStyle}>{commitmentOriginValue}</PaperText>
              <Icon source={commitmentOriginMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentOriginMenuVisible && (
              <View style={dropdownListStyle}>
                {commitmentSourceOptions.map((option) => (
                  <Pressable key={option.id} style={dropdownItemStyle} onPress={() => { setCommitmentOriginId(option.id); setCommitmentOriginValue(option.label); setCommitmentOriginMenuVisible(false); }}>
                    <PaperText style={dropdownItemTextStyle}>{option.label}</PaperText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Concepto</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} style={modalInputFieldStyle} value={commitmentConcept} onChangeText={setCommitmentConcept} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Referencia pago</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} style={modalInputFieldStyle} value={commitmentReference} onChangeText={setCommitmentReference} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Valor pensado</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} style={modalInputFieldStyle} keyboardType="numeric" value={commitmentEstimatedValue} onChangeText={(value) => setCommitmentEstimatedValue(normalizeNumericInput(value))} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Periodicidad</PaperText>
            <Pressable style={selectorFieldStyle} onPress={() => setCommitmentPeriodMenuVisible((prev) => !prev)}>
              <PaperText style={selectorTextStyle}>{commitmentPeriodicidad}</PaperText>
              <Icon source={commitmentPeriodMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentPeriodMenuVisible && (
              <View style={dropdownListStyle}>
                {(["MENSUAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "UNICO"] as const).map((option) => (
                  <Pressable key={option} style={dropdownItemStyle} onPress={() => { setCommitmentPeriodicidad(option); setCommitmentPeriodMenuVisible(false); }}>
                    <PaperText style={dropdownItemTextStyle}>{option}</PaperText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Fecha vencimiento</PaperText>
            <Pressable style={selectorFieldStyle} onPress={() => setCommitmentEndedDatePickerVisible(true)}>
              <PaperText style={selectorTextStyle}>{commitmentEndedDate || "Seleccione una fecha"}</PaperText>
              <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentEndedDatePickerVisible ? (
              <DateTimePicker
                value={commitmentEndedDateValue}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onValueChange={handleCommitmentDateValueChange}
                onDismiss={handleCommitmentDateDismiss}
              />
            ) : null}
          </View>

          {commitmentDetailError ? <PaperText style={styles.errorText}>{commitmentDetailError}</PaperText> : null}

          <View style={styles.modalActions}>
            <Button mode="contained" buttonColor="#F97316" textColor="#FFFFFF" loading={isSavingCommitmentDetail} disabled={isCommitmentSaveDisabled} onPress={handleSaveCommitmentDetail}>Guardar cambios</Button>
            <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} loading={isSavingCommitmentDetail} disabled={!isPlannedCycle || isSavingCommitmentDetail} onPress={handleDeleteCommitmentDetail}>Eliminar compromiso</Button>
            {!isPlannedCycle ? <PaperText style={[styles.helperText, { color: uiColors.warningText }]}>Solo puedes eliminar compromisos en ciclo PLANIFICADO.</PaperText> : null}
          </View>
        </>
      );
    }

    if (activeModal === "detailPeriod") {
      const cycle = budgetCycle ?? null;
      const state = String(cycle?.state || "PLANIFICADO").toUpperCase();
      const periodId = String(cycle?.id || "");
      const periodName = String(cycle?.name || formatPeriodName(periodId) || "");

      return (
        <>
          <View style={styles.sheetHandle} />

          <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder, marginTop: 8 }]}> 
            <Card.Content>
              <PaperText variant="titleSmall" style={{ color: uiColors.onSurface }}>{periodName}</PaperText>
              <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>ID: {periodId}</PaperText>
              <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>Estado: <PaperText style={{ color: state === "PLANIFICADO" ? theme.colors.primary : uiColors.onSurface }}>{state}</PaperText></PaperText>
            </Card.Content>
          </Card>

          <View style={{ marginTop: 12 }}>
            <View style={styles.metricsRow}>
              <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}> 
                <PaperText style={[styles.metricLabel, { color: uiColors.mutedText }]}>Ingreso esperado</PaperText>
                <PaperText style={[styles.metricValueStrong, { color: uiColors.onSurface }]}>{toCurrency(Number(cycle?.expectedTotalIncome || 0))}</PaperText>
              </View>
              <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}> 
                <PaperText style={[styles.metricLabel, { color: uiColors.mutedText }]}>Ingreso real</PaperText>
                <PaperText style={[styles.metricValueStrong, { color: uiColors.onSurface }]}>{toCurrency(Number(cycle?.realTotalIncome || 0))}</PaperText>
              </View>
            </View>
          </View>

          <View style={styles.modalActions}>
            <Button mode="contained" onPress={() => undefined}>Cerrar planeacion</Button>
          </View>
        </>
      );
    }

    if (activeModal === "confirmDeleteMember") {
      return (
        <>
          <PaperText style={[styles.helperText, { marginTop: 8 }]}>¿Estás seguro de que deseas eliminar este miembro y todos sus registros asociados? Esta acción no se puede deshacer.</PaperText>
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => closeModal()}>Cancelar</Button>
            <Button mode="contained" buttonColor={theme.colors.error} textColor={theme.colors.onError} loading={isSavingMemberDetail} disabled={isSavingMemberDetail} onPress={handleDeleteMember}>Eliminar miembro</Button>
          </View>
        </>
      );
    }

    if (activeModal === "formNewMember") {
      const isMemberSaveDisabled =
        isSavingMember ||
        !memberName.trim() ||
        !memberEmail.trim() ||
        !memberBank.trim() ||
        !memberContract.trim();

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Nombre</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Nombre del participante" style={modalInputFieldStyle} value={memberName} onChangeText={setMemberName} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Correo Miembro</PaperText>
            <TextInput
              mode="outlined"
              theme={modalTextInputTheme}
              placeholder="Ejemplo: nombre@correo.com"
              style={modalInputFieldStyle}
              keyboardType="email-address"
              autoCapitalize="none"
              value={memberEmail}
              onChangeText={setMemberEmail}
            />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Banco</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Entidad financiera" style={modalInputFieldStyle} value={memberBank} onChangeText={setMemberBank} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Contrato ingresos</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Contrato referencial" style={modalInputFieldStyle} value={memberContract} onChangeText={setMemberContract} />
          </View>

          <Pressable style={styles.checkboxRow} onPress={() => setMemberActive((value) => !value)}>
            <Checkbox status={memberActive ? "checked" : "unchecked"} />
            <PaperText style={[styles.checkboxText, { color: uiColors.onSurface }]}>Miembro activo</PaperText>
          </Pressable>

          {memberSubmitError ? <PaperText style={styles.errorText}>{memberSubmitError}</PaperText> : null}

          <Button mode="contained" style={styles.primarySheetButton} contentStyle={styles.sheetButtonContent} disabled={isMemberSaveDisabled} onPress={handleCreateMember}>
            {isSavingMember ? "Guardando..." : "Guardar miembro"}
          </Button>
        </>
      );
    }

    if (activeModal === "formNewPeriod") {
      const periodName = formatPeriodName(periodId);
      const isPeriodSaveDisabled = isSavingPeriod || !periodName;

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>ID periodo</PaperText>
            
                    <TextInput mode="outlined" theme={modalTextInputTheme}
              placeholder="Formato: AAAA-MM"
              style={modalInputFieldStyle}
              value={periodId}
              onChangeText={setPeriodId}
            />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>MES</PaperText>
            
                    <TextInput mode="outlined" theme={modalTextInputTheme}
              placeholder="Nombre generado automaticamente"
              value={periodName}
              editable={false}
              style={modalInputFieldStyle}
            />
          </View>

          {periodSubmitError ? <PaperText style={styles.errorText}>{periodSubmitError}</PaperText> : null}

          <Button mode="contained" style={styles.primarySheetButton} contentStyle={styles.sheetButtonContent} disabled={isPeriodSaveDisabled} onPress={handleCreatePeriod}>
            {isSavingPeriod ? "Guardando..." : "Guardar periodo"}
          </Button>
        </>
      );
    }

    if (activeModal === "formConfigureBag") {
      const isRemainingPocket = bagRuleType === "Restante";
      const hasRemainingValueConflict = isRemainingPocket && computedRemainingPocketValue < 0;
      const isPocketSaveDisabled =
        isSavingPocket ||
        !pocketName.trim() ||
        !pocketBank.trim() ||
        !pocketContract.trim() ||
        (isRemainingPocket
          ? hasExistingRemainingPocket || expectedTotalIncome <= 0 || hasRemainingValueConflict
          : !pocketValueRule.trim() || !Number.isFinite(parseNumericInput(pocketValueRule)));

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Nombre bolsa</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Nombre de bolsa" style={modalInputFieldStyle} value={pocketName} onChangeText={setPocketName} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Tipo categoria</PaperText>
            <View style={styles.segmentRow}>
              {(["Gasto", "Ahorro"] as const).map((item) => (
                <Button
                  key={item}
                  mode={bagCategory === item ? "contained" : "outlined"}
                  style={styles.segmentButton}
                  contentStyle={styles.segmentButtonContent}
                  buttonColor={bagCategory === item ? theme.colors.primary : undefined}
                  textColor={bagCategory === item ? theme.colors.onPrimary : theme.colors.onSurface}
                  onPress={() => setBagCategory(item)}
                >
                  {item}
                </Button>
              ))}
            </View>
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Banco</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Entidad financiera" style={modalInputFieldStyle} value={pocketBank} onChangeText={setPocketBank} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Contrato</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Contrato referencial" style={modalInputFieldStyle} value={pocketContract} onChangeText={setPocketContract} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Tipo regla</PaperText>
            <View style={styles.segmentRow}>
              {(["Valor", "Porcentaje", "Restante"] as const).map((item) => (
                <Button
                  key={item}
                  mode={bagRuleType === item ? "contained" : "outlined"}
                  style={styles.segmentButton}
                  contentStyle={styles.segmentButtonContent}
                  buttonColor={bagRuleType === item ? theme.colors.primary : undefined}
                  textColor={bagRuleType === item ? theme.colors.onPrimary : theme.colors.onSurface}
                  onPress={() => {
                    setBagRuleType(item);
                    if (item === "Restante") {
                      setPocketValueRule(normalizeNumericInput(String(roundToTwoDecimals(Math.max(0, computedRemainingPocketValue)))));
                    } else {
                      setPocketValueRule("");
                    }
                  }}
                >
                  {item}
                </Button>
              ))}
            </View>
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Valor regla</PaperText>
            
                    <TextInput mode="outlined" theme={modalTextInputTheme}
              placeholder={isRemainingPocket ? "Calculado automaticamente" : "Ejemplo: Valor numerico"}
              style={modalInputFieldStyle}
              keyboardType="numeric"
              value={
                isRemainingPocket
                  ? toCurrency(Math.max(0, computedRemainingPocketValue))
                          : pocketValueRule
              }
              onChangeText={(value) => setPocketValueRule(normalizeNumericInput(value))}
              editable={!isRemainingPocket}
            />
            {isRemainingPocket && hasExistingRemainingPocket ? (
              <PaperText style={styles.errorText}>Ya existe una bolsa tipo Restante activa.</PaperText>
            ) : null}
            {isRemainingPocket && expectedTotalIncome <= 0 ? (
              <PaperText style={styles.errorText}>Necesitas un ciclo PLANIFICADO con ingreso esperado para usar Restante.</PaperText>
            ) : null}
            {isRemainingPocket && hasRemainingValueConflict ? (
              <PaperText style={styles.errorText}>La suma de bolsas actuales supera el ingreso esperado.</PaperText>
            ) : null}
          </View>

          {pocketSubmitError ? <PaperText style={styles.errorText}>{pocketSubmitError}</PaperText> : null}

          <Button mode="contained" style={styles.primarySheetButton} contentStyle={styles.sheetButtonContent} disabled={isPocketSaveDisabled} onPress={handleCreatePocket}>
            {isSavingPocket ? "Guardando..." : "Guardar bolsa"}
          </Button>
        </>
      );
    }

    if (activeModal === "formNewCommitment") {
      const commitmentSourceOptions = commitmentAccountType === "BOLSA"
        ? (viewData?.pockets ?? []).map((item, index) => ({
          id: String(item.id || ""),
          label: String(item.name || `Bolsa ${index + 1}`),
        }))
        : commitmentAccountType === "MIEMBRO"
          ? (viewData?.members ?? []).map((item, index) => ({
          id: String(item.id || ""),
          label: String(item.name || `Miembro ${index + 1}`),
          }))
          : [];

      const commitmentSourcePlaceholder = commitmentAccountType === "BOLSA"
        ? "Seleccione una bolsa"
        : commitmentAccountType === "MIEMBRO"
          ? "Seleccione un miembro"
          : "Seleccione un Origen";

      const commitmentAccountPlaceholder = "Seleccione una cuenta origen";
      const isAccountSelected = commitmentAccountType === "BOLSA" || commitmentAccountType === "MIEMBRO";

      const isCommitmentSaveDisabled =
        isSavingCommitment ||
        !isAccountSelected ||
        !commitmentOriginId ||
        !commitmentConcept.trim() ||
        !commitmentReference.trim() ||
        !commitmentEstimatedValue.trim() ||
        !Number.isFinite(parseNumericInput(commitmentEstimatedValue)) ||
        !["MENSUAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "UNICO"].includes(commitmentPeriodicidad);

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Cuenta Origen</PaperText>
            <Pressable style={selectorFieldStyle} onPress={() => setCommitmentAccountMenuVisible((prev) => !prev)}>
              <PaperText style={selectorTextStyle}>{isAccountSelected ? commitmentAccountType : commitmentAccountPlaceholder}</PaperText>
              <Icon source={commitmentAccountMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentAccountMenuVisible && (
              <View style={dropdownListStyle}>
                <Pressable
                  style={dropdownItemStyle}
                  onPress={() => {
                    setCommitmentAccountType("BOLSA");
                    setCommitmentOriginId("");
                    setCommitmentOriginValue("Seleccione una bolsa");
                    setCommitmentOriginMenuVisible(false);
                    setCommitmentAccountMenuVisible(false);
                  }}
                >
                  <PaperText style={dropdownItemTextStyle}>BOLSA</PaperText>
                </Pressable>
                <Pressable
                  style={dropdownItemStyle}
                  onPress={() => {
                    setCommitmentAccountType("MIEMBRO");
                    setCommitmentOriginId("");
                    setCommitmentOriginValue("Seleccione un miembro");
                    setCommitmentOriginMenuVisible(false);
                    setCommitmentAccountMenuVisible(false);
                  }}
                >
                  <PaperText style={dropdownItemTextStyle}>MIEMBRO</PaperText>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Origen</PaperText>
            <Pressable
              style={[selectorFieldStyle, !isAccountSelected && { opacity: 0.6 }]}
              onPress={() => {
                if (!isAccountSelected) return;
                setCommitmentOriginMenuVisible((prev) => !prev);
              }}
            >
              <PaperText style={selectorTextStyle}>{commitmentOriginValue}</PaperText>
              <Icon
                source={commitmentOriginMenuVisible ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
            {commitmentOriginMenuVisible && (
              <View style={dropdownListStyle}>
                {commitmentSourceOptions.length === 0 ? (
                  <View style={dropdownItemStyle}>
                    <PaperText style={dropdownItemTextStyle}>{commitmentSourcePlaceholder}</PaperText>
                  </View>
                ) : (
                  commitmentSourceOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      style={dropdownItemStyle}
                      onPress={() => {
                        setCommitmentOriginId(option.id);
                        setCommitmentOriginValue(option.label);
                        setCommitmentOriginMenuVisible(false);
                      }}
                    >
                      <PaperText style={dropdownItemTextStyle}>{option.label}</PaperText>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Concepto</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Concepto del compromiso" style={modalInputFieldStyle} value={commitmentConcept} onChangeText={setCommitmentConcept} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Referencia pago</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Referencia descriptiva" style={modalInputFieldStyle} value={commitmentReference} onChangeText={setCommitmentReference} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Valor pensado</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Valor numerico" style={modalInputFieldStyle} keyboardType="numeric" value={commitmentEstimatedValue} onChangeText={(value) => setCommitmentEstimatedValue(normalizeNumericInput(value))} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Periodicidad</PaperText>
            <Pressable style={selectorFieldStyle} onPress={() => setCommitmentPeriodMenuVisible((prev) => !prev)}>
              <PaperText style={selectorTextStyle}>{commitmentPeriodicidad}</PaperText>
              <Icon source={commitmentPeriodMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentPeriodMenuVisible && (
              <View style={dropdownListStyle}>
                {(["MENSUAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "UNICO"] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={dropdownItemStyle}
                    onPress={() => {
                      setCommitmentPeriodicidad(option);
                      setCommitmentPeriodMenuVisible(false);
                    }}
                  >
                    <PaperText style={dropdownItemTextStyle}>{option}</PaperText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Fecha vencimiento</PaperText>
            <Pressable
              style={selectorFieldStyle}
              onPress={() => setCommitmentEndedDatePickerVisible(true)}
            >
              <PaperText style={selectorTextStyle}>{commitmentEndedDate || "Seleccione una fecha"}</PaperText>
              <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentEndedDatePickerVisible ? (
              <DateTimePicker
                value={commitmentEndedDateValue}
                mode="date"
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onValueChange={handleCommitmentDateValueChange}
                onDismiss={handleCommitmentDateDismiss}
              />
            ) : null}
            {Platform.OS === "ios" && commitmentEndedDatePickerVisible ? (
              <Button mode="text" onPress={() => setCommitmentEndedDatePickerVisible(false)}>Listo</Button>
            ) : null}
          </View>

          {commitmentSubmitError ? <PaperText style={styles.errorText}>{commitmentSubmitError}</PaperText> : null}

          <Button mode="contained" style={[styles.primarySheetButton, styles.commitmentButton]} contentStyle={styles.sheetButtonContent} disabled={isCommitmentSaveDisabled} onPress={handleCreateCommitment}>
            {isSavingCommitment ? "Guardando..." : "Guardar compromiso"}
          </Button>
        </>
      );
    }

    if (activeModal === "formRegisterBalance") {
      const pocketOptions = (viewData?.pockets ?? []).map((item, index) => ({
        id: String(item.id || ""),
        label: String(item.name || `Bolsa ${index + 1}`),
      }));

      const plannedPeriod = (viewData?.periods ?? []).find(
        (item) => String(item.state || "").toUpperCase() === "PLANIFICADO"
      );

      const effectivePeriodId = balancePeriodId || (plannedPeriod ? String(plannedPeriod.id || "") : "");
      const effectivePeriodLabel =
        balancePeriodLabel !== "Selecciona un periodo"
          ? balancePeriodLabel
          : plannedPeriod
            ? String(plannedPeriod.name || plannedPeriod.id || "")
            : "Sin periodo PLANIFICADO";
      const hasPockets = pocketOptions.length > 0;

      const isBalanceSaveDisabled =
        isSavingBalance ||
        !balancePocketId ||
        !effectivePeriodId ||
        !balanceValue.trim() ||
        !Number.isFinite(parseNumericInput(balanceValue)) ||
        !hasPockets;

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Bolsa</PaperText>
            <Pressable
              style={[selectorFieldStyle, !hasPockets && { opacity: 0.6 }]}
              onPress={() => {
                if (!hasPockets) return;
                setBalancePocketMenuVisible((prev) => !prev);
              }}
            >
              <PaperText style={selectorTextStyle}>{balancePocketLabel}</PaperText>
              <Icon source={balancePocketMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {balancePocketMenuVisible && (
              <View style={dropdownListStyle}>
                {pocketOptions.length === 0 ? (
                  <View style={dropdownItemStyle}>
                    <PaperText style={dropdownItemTextStyle}>Sin bolsas registradas</PaperText>
                  </View>
                ) : (
                  pocketOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      style={dropdownItemStyle}
                      onPress={() => {
                        setBalancePocketId(option.id);
                        setBalancePocketLabel(option.label);
                        setBalancePocketMenuVisible(false);
                      }}
                    >
                      <PaperText style={dropdownItemTextStyle}>{option.label}</PaperText>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Periodo</PaperText>
            <View style={selectorFieldStyle}>
              <PaperText style={selectorTextStyle}>{effectivePeriodLabel}</PaperText>
              <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Monto (Saldo inicial mes)</PaperText>
            <TextInput mode="outlined" theme={modalTextInputTheme} placeholder="Ejemplo: Valor numerico" style={modalInputFieldStyle} keyboardType="numeric" value={balanceValue} onChangeText={(value) => setBalanceValue(normalizeNumericInput(value))} />
          </View>

          {!hasPockets ? <PaperText style={styles.errorText}>Aun no hay bolsas configuradas. Crea una bolsa para registrar saldo inicial.</PaperText> : null}
          {balanceSubmitError ? <PaperText style={styles.errorText}>{balanceSubmitError}</PaperText> : null}

          <Button
            mode="contained"
            style={styles.balanceSheetButton}
            contentStyle={styles.sheetButtonContent}
            disabled={isBalanceSaveDisabled}
            onPress={() => {
              setBalancePeriodId(effectivePeriodId);
              setBalancePeriodLabel(effectivePeriodLabel);
              handleCreatePocketBalance();
            }}
          >
            {isSavingBalance ? "Guardando..." : "Guardar saldo bolsa"}
          </Button>
        </>
      );
    }

    if (activeModal === "formRegisterMovement") {
      const movementTypeOptions = ["INGRESO", "COMPROMISO", "RESERVADO", "GASTO"] as const;
      const movementPartyOptions = ["MIEMBRO", "BOLSA", "COMPROMISO", "OTRO"] as const;
      const movementPeriodState = String(
        (viewData?.periods ?? []).find((item) => String(item.id || "") === movementPeriodId)?.state || ""
      ).toUpperCase();
      const isNonPlannedCycle = movementPeriodState !== "PLANIFICADO";
      const originReferenceOptions = getMovementReferenceOptions(movementOrigin);
      const destinationReferenceOptions = getMovementReferenceOptions(movementDestination);
      const originReferencePlaceholder = getMovementReferencePlaceholder("origen", movementOrigin);
      const destinationReferencePlaceholder = getMovementReferencePlaceholder("destino", movementDestination);
      const referenceOrigin = movementOrigin === "OTRO"
        ? movementOriginReferenceText.trim()
        : movementOriginReferenceId.trim();
      const referenceDestination = movementDestination === "OTRO"
        ? movementDestinationReferenceText.trim()
        : movementDestinationReferenceId.trim();
      const isMovementSaveDisabled =
        isSavingMovement ||
        !movementType ||
        !movementOrigin ||
        !movementDestination ||
        !movementPeriodId ||
        !movementConcept.trim() ||
        !movementValue.trim() ||
        !Number.isFinite(parseNumericInput(movementValue)) ||
        !referenceOrigin ||
        !referenceDestination;

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.stepBlock}>
            <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 1</PaperText>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Tipo</PaperText>
              <Pressable style={selectorFieldStyle} onPress={() => setMovementTypeMenuVisible((prev) => !prev)}>
                <PaperText style={selectorTextStyle}>{movementType || "Seleccione una opcion"}</PaperText>
                <Icon source={movementTypeMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {movementTypeMenuVisible && (
                <View style={dropdownListStyle}>
                  {movementTypeOptions.map((option) => {
                    const lockedByCycle =
                      (option === "INGRESO" || option === "RESERVADO") && isNonPlannedCycle;

                    if (lockedByCycle) {
                      return (
                        <View key={option} style={dropdownItemDisabledStyle}>
                          <PaperText style={[styles.dropdownItemDisabledText, { color: dropdownItemDisabledTextColor }]}>{option} (solo PLANIFICADO)</PaperText>
                        </View>
                      );
                    }

                    return (
                      <Pressable
                        key={option}
                        style={dropdownItemStyle}
                        onPress={() => {
                          setMovementType(option);
                          setMovementTypeMenuVisible(false);
                        }}
                      >
                        <PaperText style={dropdownItemTextStyle}>{option}</PaperText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {isNonPlannedCycle ? (
                <PaperText style={styles.helperText}>
                  En este ciclo solo puedes crear movimientos COMPROMISO o GASTO.
                </PaperText>
              ) : null}
            </View>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Origen</PaperText>
              <Pressable style={selectorFieldStyle} onPress={() => setMovementOriginMenuVisible((prev) => !prev)}>
                <PaperText style={selectorTextStyle}>{movementOrigin || "Selecciona tipo de origen"}</PaperText>
                <Icon source={movementOriginMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {movementOriginMenuVisible && (
                <View style={dropdownListStyle}>
                  {movementPartyOptions.map((option) => (
                    <Pressable
                      key={`origin-${option}`}
                      style={dropdownItemStyle}
                      onPress={() => {
                        setMovementOrigin(option);
                        setMovementOriginMenuVisible(false);
                        setMovementOriginReferenceMenuVisible(false);
                        setMovementOriginReferenceId("");
                        setMovementOriginReferenceText("");
                        setMovementOriginReferenceLabel(getMovementReferencePlaceholder("origen", option));
                      }}
                    >
                      <PaperText style={dropdownItemTextStyle}>{option}</PaperText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {movementOrigin ? (
              <View style={styles.formBlock}>
                <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Referencia Origen</PaperText>
                {movementOrigin === "OTRO" ? (
                  
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                    placeholder={originReferencePlaceholder}
                    style={modalInputFieldStyle}
                    value={movementOriginReferenceText}
                    onChangeText={setMovementOriginReferenceText}
                  />
                ) : (
                  <>
                    <Pressable
                      style={[selectorFieldStyle, originReferenceOptions.length === 0 && { opacity: 0.6 }]}
                      onPress={() => {
                        if (originReferenceOptions.length === 0) return;
                        setMovementOriginReferenceMenuVisible((prev) => !prev);
                      }}
                    >
                      <PaperText style={selectorTextStyle}>{movementOriginReferenceLabel}</PaperText>
                      <Icon source={movementOriginReferenceMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                    {movementOriginReferenceMenuVisible && (
                      <View style={dropdownListStyle}>
                        {originReferenceOptions.length === 0 ? (
                          <View style={dropdownItemStyle}>
                            <PaperText style={dropdownItemTextStyle}>No hay datos disponibles</PaperText>
                          </View>
                        ) : (
                          originReferenceOptions.map((option) => (
                            <Pressable
                              key={`origin-reference-${option.id}`}
                              style={dropdownItemStyle}
                              onPress={() => {
                                setMovementOriginReferenceId(option.id);
                                setMovementOriginReferenceLabel(option.label);
                                setMovementOriginReferenceMenuVisible(false);
                              }}
                            >
                              <PaperText style={dropdownItemTextStyle}>{option.label}</PaperText>
                            </Pressable>
                          ))
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : null}

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Destino</PaperText>
              <Pressable style={selectorFieldStyle} onPress={() => setMovementDestinationMenuVisible((prev) => !prev)}>
                <PaperText style={selectorTextStyle}>{movementDestination || "Selecciona tipo de destino"}</PaperText>
                <Icon source={movementDestinationMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {movementDestinationMenuVisible && (
                <View style={dropdownListStyle}>
                  {movementPartyOptions.map((option) => (
                    <Pressable
                      key={`destination-${option}`}
                      style={dropdownItemStyle}
                      onPress={() => {
                        setMovementDestination(option);
                        setMovementDestinationMenuVisible(false);
                        setMovementDestinationReferenceMenuVisible(false);
                        setMovementDestinationReferenceId("");
                        setMovementDestinationReferenceText("");
                        setMovementDestinationReferenceLabel(getMovementReferencePlaceholder("destino", option));
                      }}
                    >
                      <PaperText style={dropdownItemTextStyle}>{option}</PaperText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {movementDestination ? (
              <View style={styles.formBlock}>
                <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Referencia Destino</PaperText>
                {movementDestination === "OTRO" ? (
                  
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                    placeholder={destinationReferencePlaceholder}
                    style={modalInputFieldStyle}
                    value={movementDestinationReferenceText}
                    onChangeText={setMovementDestinationReferenceText}
                  />
                ) : (
                  <>
                    <Pressable
                      style={[selectorFieldStyle, destinationReferenceOptions.length === 0 && { opacity: 0.6 }]}
                      onPress={() => {
                        if (destinationReferenceOptions.length === 0) return;
                        setMovementDestinationReferenceMenuVisible((prev) => !prev);
                      }}
                    >
                      <PaperText style={selectorTextStyle}>{movementDestinationReferenceLabel}</PaperText>
                      <Icon source={movementDestinationReferenceMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                    {movementDestinationReferenceMenuVisible && (
                      <View style={dropdownListStyle}>
                        {destinationReferenceOptions.length === 0 ? (
                          <View style={dropdownItemStyle}>
                            <PaperText style={dropdownItemTextStyle}>No hay datos disponibles</PaperText>
                          </View>
                        ) : (
                          destinationReferenceOptions.map((option) => (
                            <Pressable
                              key={`destination-reference-${option.id}`}
                              style={dropdownItemStyle}
                              onPress={() => {
                                setMovementDestinationReferenceId(option.id);
                                setMovementDestinationReferenceLabel(option.label);
                                setMovementDestinationReferenceMenuVisible(false);
                              }}
                            >
                              <PaperText style={dropdownItemTextStyle}>{option.label}</PaperText>
                            </Pressable>
                          ))
                        )}
                      </View>
                    )}
                  </>
                )}
              </View>
            ) : null}
          </View>

          <View style={styles.stepBlock}>
            <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 2</PaperText>
            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Monto</PaperText>
              
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                placeholder="$0"
                style={modalInputFieldStyle}
                keyboardType="numeric"
                      value={movementValue}
                onChangeText={(value) => setMovementValue(normalizeNumericInput(value))}
              />
            </View>
          </View>

          <View style={styles.stepBlock}>
            <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 3</PaperText>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Periodo</PaperText>
              <View style={selectorFieldStyle}>
                <PaperText style={selectorTextStyle}>{movementPeriodLabel}</PaperText>
                <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
              </View>
            </View>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Concepto</PaperText>
              
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                placeholder="Ejemplo: Concepto del movimiento"
                style={modalInputFieldStyle}
                value={movementConcept}
                onChangeText={setMovementConcept}
              />
            </View>
          </View>

          <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 4</PaperText>

          {movementSubmitError ? <PaperText style={styles.errorText}>{movementSubmitError}</PaperText> : null}

          <Button
            mode="contained"
            style={styles.movementSheetButton}
            contentStyle={styles.sheetButtonContent}
            disabled={isMovementSaveDisabled}
            onPress={handleCreateMovement}
          >
            {isSavingMovement ? "Guardando..." : "Guardar movimiento"}
          </Button>
        </>
      );
    }

    if (activeModal === "detailMovement") {
      const movement = selectedMovement;
      const periodIdValue = String(movement?.periodId || movement?.cycleId || "");
      const resolvedPeriodId = periodIdValue || String(currentCycle?.id || "");
      const period = (viewData?.periods ?? []).find((item) => String(item.id || "") === resolvedPeriodId);
      const periodLabel = String(period?.name || currentCycle?.name || period?.id || resolvedPeriodId || "Sin periodo");
      const movementTypeValue = String(movement?.movementType || movement?.type || "").toUpperCase() || "--";
      const originTypeValue = String(movement?.originType || movement?.sourceType || "").toUpperCase() || "--";
      const destinationTypeValue = String(movement?.destinationType || movement?.targetType || "").toUpperCase() || "--";
      const originReferenceRaw = String(movement?.referenceOrigin || movement?.originReference || movement?.originId || "");
      const destinationReferenceRaw = String(movement?.referenceDestination || movement?.destinationReference || movement?.destinationId || "");
      const originReferenceLabel = resolveMovementReferenceLabel(originTypeValue, originReferenceRaw);
      const destinationReferenceLabel = resolveMovementReferenceLabel(destinationTypeValue, destinationReferenceRaw);
      const conceptValue = String(movement?.movementConcept || movement?.concept || "");
      const movementValueAmount = Number(movement?.value || movement?.amount || 0);
      const movementIconName = getPocketMovementIcon(movementTypeValue);
      const movementIconColor = getPocketMovementColor(movementTypeValue, theme);

      return (
        <>
          <View style={styles.sheetHandle} />

          {!movement ? (
            <PaperText style={styles.helperText}>No se encontro el movimiento seleccionado.</PaperText>
          ) : (
            <>
              <View style={styles.memberDetailAvatarContainer}>
                <View style={styles.memberDetailAvatar}>
                  <Icon source={movementIconName} size={46} color={movementIconColor} />
                </View>
              </View>

              <View style={styles.stepBlock}>
                <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 1</PaperText>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Tipo</PaperText>
                  <View style={selectorFieldStyle}>
                    <PaperText style={selectorTextStyle}>{movementTypeValue}</PaperText>
                    <Icon source="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Origen</PaperText>
                  <View style={selectorFieldStyle}>
                    <PaperText style={selectorTextStyle}>{originTypeValue}</PaperText>
                    <Icon source="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Referencia Origen</PaperText>
                  <View style={selectorFieldStyle}>
                    <PaperText style={selectorTextStyle}>{originReferenceLabel}</PaperText>
                    <Icon source="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Destino</PaperText>
                  <View style={selectorFieldStyle}>
                    <PaperText style={selectorTextStyle}>{destinationTypeValue}</PaperText>
                    <Icon source="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Referencia Destino</PaperText>
                  <View style={selectorFieldStyle}>
                    <PaperText style={selectorTextStyle}>{destinationReferenceLabel}</PaperText>
                    <Icon source="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>
              </View>

              <View style={styles.stepBlock}>
                <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 2</PaperText>
                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Monto</PaperText>
                  
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                    style={modalInputFieldStyle}
                    value={toCurrency(movementValueAmount)}
                    editable={false}
                  />
                </View>
              </View>

              <View style={styles.stepBlock}>
                <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 3</PaperText>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Periodo</PaperText>
                  <View style={selectorFieldStyle}>
                    <PaperText style={selectorTextStyle}>{periodLabel}</PaperText>
                    <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
                  </View>
                </View>

                <View style={styles.formBlock}>
                  <PaperText variant="labelLarge" style={[styles.formLabel, { color: uiColors.onSurface }]}>Concepto</PaperText>
                  
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                    style={modalInputFieldStyle}
                    value={conceptValue || "Sin concepto"}
                    editable={false}
                  />
                </View>
              </View>
            </>
          )}

          <PaperText variant="labelLarge" style={[styles.stepLabel, { color: uiColors.onSurface }]}>Paso 4</PaperText>
          <Button mode="contained" style={styles.movementSheetButton} contentStyle={styles.sheetButtonContent} onPress={closeModal}>
            Cerrar
          </Button>
        </>
      );
    }

    if (activeModal === "wizardInitialization") {
      const existingCurrentCycle = currentCycle;
      const currentCycleLabel = existingCurrentCycle
        ? String(existingCurrentCycle.name || existingCurrentCycle.id || "Ciclo abierto o planificado")
        : "Sin ciclo abierto ni planificado";
      const members = viewData?.members ?? [];
      const existingMemberIncomes = new Set(
        (viewData?.incomes ?? []).map((income) => String(income.memberId || "")).filter(Boolean)
      );
      const pendingIncomes = members.filter((member) => {
        const memberId = String(member.id || "");
        if (existingMemberIncomes.has(memberId)) {
          return false;
        }
        const value = parseNumericInput(wizardIncomeByMemberId[memberId] || "");
        return !Number.isFinite(value) || value <= 0;
      }).length;
      const hasOpenOrPlannedCycle = Boolean(existingCurrentCycle);

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.wizardHeaderRow}>
            <PaperText style={styles.wizardCaption}>Flujo de inicializacion</PaperText>
            <IconButton icon="close" size={18} onPress={closeModal} />
          </View>

          <PaperText variant="titleLarge" style={styles.wizardTitle}>Vamos a comenzar</PaperText>
          <PaperText style={styles.helperText}>Paso {wizardStep + 1} de 3</PaperText>

          <Card mode="elevated" style={[styles.wizardCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}> 
            <Card.Content>
              {wizardStep === 0 && (
                <>
                  <PaperText variant="titleMedium" style={styles.wizardTaskTitle}>Primero registra tus participantes</PaperText>
                  <PaperText style={styles.helperText}>Puedes crear todos los que necesites antes de continuar.</PaperText>
                  <PaperText style={styles.wizardStatusText}>
                    {members.length === 0
                      ? "Aun no tienes participantes registrados."
                      : `Participantes registrados: ${members.length}.`}
                  </PaperText>
                  <Button
                    mode="contained"
                    style={styles.wizardPrimaryGreen}
                    contentStyle={styles.sheetButtonContent}
                    onPress={() => openInitializationAction("formNewMember", 0)}
                  >
                    Agregar participante
                  </Button>
                  <Button
                    mode="outlined"
                    style={styles.wizardSecondaryButton}
                    contentStyle={styles.sheetButtonContent}
                    onPress={handleInitializationContinue}
                  >
                    Ya termine, continuar
                  </Button>
                </>
              )}

              {wizardStep === 1 && (
                <>
                  <PaperText variant="titleMedium" style={styles.wizardTaskTitle}>Segundo configura el ciclo</PaperText>
                  <PaperText style={styles.helperText}>Crea el periodo de trabajo actual antes de registrar ingresos.</PaperText>
                  <PaperText style={styles.wizardCycleLabel}>{hasOpenOrPlannedCycle ? `Ciclo detectado: ${currentCycleLabel}` : "No se detectÃ³ un ciclo ABIERTO o PLANIFICADO."}</PaperText>
                  <Button
                    mode="contained"
                    style={[styles.wizardPrimaryTeal, hasOpenOrPlannedCycle && styles.disabledButton]}
                    contentStyle={styles.sheetButtonContent}
                    disabled={hasOpenOrPlannedCycle}
                    onPress={() => openInitializationAction("formNewPeriod", 1)}
                  >
                    Crear ciclo
                  </Button>
                  <Button
                    mode="outlined"
                    style={styles.wizardSecondaryButton}
                    contentStyle={styles.sheetButtonContent}
                    onPress={handleInitializationContinue}
                  >
                    {hasOpenOrPlannedCycle ? "Usar ciclo detectado" : "Ya cree el ciclo"}
                  </Button>
                </>
              )}

              {wizardStep === 2 && (
                <>
                  <PaperText variant="titleMedium" style={styles.wizardTaskTitle}>Tercero registra ingresos iniciales</PaperText>
                  <PaperText style={styles.helperText}>
                    Esta pantalla solo permite crear movimientos tipo INGRESO para todos los participantes.
                  </PaperText>
                  <PaperText style={styles.wizardCycleLabel}>Ciclo actual: {currentCycleLabel}</PaperText>

                  <View style={styles.wizardInfoBox}>
                    <PaperText style={styles.wizardInfoText}>
                      Ingresa un monto por participante. El concepto se guardara con el valor predeterminado del sistema.
                    </PaperText>
                  </View>

                  {members.map((member) => {
                    const memberId = String(member.id || "");
                    const label = String(member.name || `Miembro ${memberId}`);
                    const hasIncome = existingMemberIncomes.has(memberId);
                    return (
                      <Card key={memberId} mode="outlined" style={styles.wizardMemberCard}>
                        <Card.Content>
                          <PaperText variant="titleSmall">{label}</PaperText>
                          
                    <TextInput mode="outlined" theme={modalTextInputTheme}
                            placeholder="Monto ingreso"
                            style={modalInputFieldStyle}
                            keyboardType="numeric"
                          value={wizardIncomeByMemberId[memberId] || ""}
                            onChangeText={(value) => handleInitializationIncomeChange(memberId, value)}
                            editable={!hasIncome}
                          />
                          {hasIncome ? <PaperText style={styles.helperText}>Ingreso inicial ya registrado.</PaperText> : null}
                        </Card.Content>
                      </Card>
                    );
                  })}

                  <Button
                    mode="contained"
                    style={styles.wizardPrimaryIndigo}
                    contentStyle={styles.sheetButtonContent}
                    disabled={isSavingWizardIncomes || members.length === 0 || !existingCurrentCycle}
                    onPress={handleSaveInitialIncomes}
                  >
                    {isSavingWizardIncomes ? "Guardando..." : "Guardar ingresos iniciales"}
                  </Button>

                  <View style={styles.wizardActionsRow}>
                    <Button mode="outlined" onPress={() => setWizardStep(1)}>Volver al paso 2</Button>
                    <Button mode="outlined" onPress={handleInitializationRefresh}>Actualizar estado</Button>
                  </View>

                  <PaperText style={styles.wizardPendingText}>
                    Pendientes por ingreso: {pendingIncomes} participante(s).
                  </PaperText>
                </>
              )}
            </Card.Content>
          </Card>

          {wizardError ? <PaperText style={styles.errorText}>{wizardError}</PaperText> : null}
        </>
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <TopLoadingBar visible={isLoading} />

      <Appbar.Header style={[styles.topBar, { backgroundColor: theme.colors.surface }]}>
        <Appbar.Action icon="account-circle-outline" onPress={onBackToFamilies} />
        <Appbar.Content
          title={workspace.familyName}
          style={styles.topBarContent}
          titleStyle={styles.workspaceName}
        />
        <Appbar.Action icon="bell-outline" onPress={() => undefined} />
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handlePullToRefresh}
            enabled={activeModal === null}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
            progressBackgroundColor={theme.colors.surface}
          />
        }
      >
        {activeTab === "inicio" && (
          <>
            <Card
              mode="elevated"
              onPress={() => openModal("detailPeriod")}
              style={[styles.summaryCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}
            >
              <Card.Content>
                  <View style={styles.sectionHeaderRow}>
                    <Icon source="chart-line" size={20} color={uiColors.periodAccent} />
                    <PaperText variant="titleMedium" style={styles.summaryTitle}>Presupuesto mensual</PaperText>
                  </View>
                  <PaperText variant="bodySmall" style={[styles.helperText, { color: uiColors.mutedText }]}>Control y distribucion del periodo actual.</PaperText>

                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder, gap: 8 }]}>
                    <PaperText style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Periodo:</PaperText>
                    <View style={styles.summaryPeriodRow}>
                      <PaperText style={[styles.metricValue, { color: uiColors.onSurface }]} numberOfLines={1}>{String(budgetCycle?.name || budgetCycle?.id || "Sin ciclo")}</PaperText>
                      <PaperText style={[styles.metricValueStrong, { color: uiColors.onSurface }]}>{toCurrency(expectedTotalIncome)}</PaperText>
                    </View>
                    <PaperText variant="bodySmall" style={[styles.helperText, { color: uiColors.mutedText }]}>{`Te faltan ${pendingCommitments.length} compromisos`}</PaperText>
                    <View style={styles.summaryPeriodRow}>
                      <PaperText style={[styles.metricValue, { color: uiColors.onSurface, flex: 1 }]} numberOfLines={1}>
                        {`Proximo: ${nextCommitment ? String(nextCommitment.commitmentConcept || nextCommitment.name || nextCommitment.reference || "Compromiso") : "Sin pendientes"}`}
                      </PaperText>
                      <PaperText style={[styles.metricLabel, { color: uiColors.mutedText }]}>
                        {nextCommitment ? formatDisplayDate(String(nextCommitment.endedDate || "")) : "Sin fecha"}
                      </PaperText>
                    </View>
                  </View>
                </View>

                <View style={styles.progressHeader}>
                  <PaperText style={[styles.metricLabel, { color: theme.colors.onSurfaceVariant }]}>Distribuido</PaperText>
                  <PaperText style={[styles.metricValue, { color: uiColors.onSurface }]}>{toPercent(monthlyProgress)}</PaperText>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${monthlyProgress}%` }]} />
                </View>

                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={[styles.metricLabel, { color: uiColors.periodAccent }]}>Ahorros</PaperText>
                    <PaperText style={[styles.metricValueStrong, { color: uiColors.periodAccent }]}>{toCurrency(savingsTotal)}</PaperText>
                  </View>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}> 
                    <PaperText style={[styles.metricLabel, { color: uiColors.commitmentAccent }]}>Gastos</PaperText>
                    <PaperText style={[styles.metricValueStrong, { color: uiColors.commitmentAccent }]}>{toCurrency(expensesTotal)}</PaperText>
                  </View>
                </View>
              </Card.Content>
            </Card>
            <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}> 
              <Card.Content>
                <View style={styles.sectionHeaderRow}>
                  <Icon source="account-group" size={20} color={uiColors.memberAccent} />
                  <PaperText variant="titleMedium" style={styles.summaryTitle}>Miembros</PaperText>
                </View>
                {initializationMembers.length === 0 ? (
                  <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay miembros registrados.</PaperText>
                ) : (
                  initializationMembers.map((member, index) => {
                    const memberId = String(member.id || "");
                    const pocketsValue = Number(incomeByMemberId.get(memberId) || 0);
                    const hasContribution = Number.isFinite(pocketsValue) && pocketsValue > 0;

                    return (
                      <Pressable
                        key={memberId || `member-${index}`}
                        style={styles.memberRow}
                        onPress={() => handleOpenMemberDetail(memberId)}
                      >
                        <View style={styles.memberInfoRow}>
                          <Icon source="account-circle" size={28} color={uiColors.memberAccent} />
                          <View>
                          <PaperText style={styles.memberName}>{String(member.name || `Miembro ${index + 1}`)}</PaperText>
                          <PaperText style={[styles.memberContributionText, { color: uiColors.mutedText }]}>Aporte mensual: {toCurrency(pocketsValue)}</PaperText>
                          </View>
                        </View>
                        <PaperText style={[hasContribution ? styles.memberStatusOk : styles.memberStatusPending, { color: hasContribution ? uiColors.successText : uiColors.warningText }]}>
                          {hasContribution ? "Completo" : "Pendiente"}
                        </PaperText>
                      </Pressable>
                    );
                  })
                )}
              </Card.Content>
            </Card>

            <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
              <Card.Content>
                <View style={styles.sectionHeaderRow}>
                  <Icon source="file-document-alert-outline" size={20} color={uiColors.commitmentAccent} />
                  <PaperText variant="titleMedium" style={styles.summaryTitle}>Compromisos creados</PaperText>
                </View>
                <PaperText variant="bodySmall" style={[styles.helperText, { color: uiColors.mutedText }]}>
                  {`Total creados: ${createdCommitments.length} | Pendientes: ${pendingCommitments.length} (${toCurrency(pendingCommitmentsTotal)})`}
                </PaperText>
                {createdCommitments.length === 0 ? (
                  <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay compromisos creados en este momento.</PaperText>
                ) : (
                  createdCommitments.map((item, index) => (
                    <Pressable key={String(item.id || `pending-${index}`)} style={styles.entityRow} onPress={() => handleOpenCommitmentDetail(String(item.id || ""))}>
                      <View style={styles.pendingIconWrap}>
                        <Icon source="file-document-outline" size={34} color={uiColors.commitmentAccent} />
                      </View>
                      <View style={styles.pendingInfo}>
                        <View style={styles.pendingTopRow}>
                          <PaperText style={[styles.pendingName, styles.pendingConceptText]} numberOfLines={1}>
                            {String(item.commitmentConcept || item.name || item.reference || `Compromiso ${index + 1}`)}
                          </PaperText>
                          <PaperText style={[styles.pendingAmount, styles.pendingAmountText]}>{toCurrency(Number(item.estimatedValue || 0))}</PaperText>
                        </View>
                        <View style={styles.pendingBottomRow}>
                          <PaperText style={[styles.helperText, styles.pendingDateText]}>Fecha Vencimiento: {formatDisplayDate(String(item.endedDate || ""))}</PaperText>
                        </View>
                      </View>
                    </Pressable>
                  ))
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {activeTab === "bolsas" && (
          <>
            {(viewData?.pockets ?? []).length === 0 ? (
              <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay bolsas registradas. Crea bolsas para organizar tu dinero.</PaperText>
            ) : (
              (viewData?.pockets ?? []).map((pocket) => {
                const pocketId = String(pocket.id || "");
                const pocketName = String(pocket.name || "Bolsa sin nombre");
                const isRemainingPocket = String(pocket.typeRule || "") === "-";
                const pocketRule = isRemainingPocket
                  ? toCurrency(Math.max(0, computedRemainingPocketValue))
                  : formatPocketRuleLabel(pocket);
                const pocketBank = String(pocket.bank || "Sin banco");
                const pocketContract = String(pocket.contract || "Sin contrato");
                
                // Calcular movimientos de ingreso y gasto
                const pocketMovements = (viewData?.movements ?? []).filter((m) => {
                  const mType = String(m.destinationType || "").toUpperCase();
                  const mRef = String(m.referenceDestination || "");
                  return mType === "BOLSA" && mRef === pocketId;
                });
                
                const incomeMovements = pocketMovements.filter((m) => String(m.movementType || m.type || "").toUpperCase() === "INGRESO");
                const expenseMovements = pocketMovements.filter((m) => String(m.movementType || m.type || "").toUpperCase() !== "INGRESO");
                
                const incomeTotal = incomeMovements.reduce((sum, m) => sum + Number(m.value || 0), 0);
                const expenseTotal = expenseMovements.reduce((sum, m) => sum + Number(m.value || 0), 0);
                const initialBalance = Number(pocket.initialBalance ?? pocket.startingBalance ?? pocket.initialSaldo ?? pocket.balance ?? 0);
                const pocketValue = initialBalance + incomeTotal - expenseTotal;
                const pocketPercentage = expectedTotalIncome > 0 ? (pocketValue / expectedTotalIncome) * 100 : 0;
                const pocketFillWidth = expectedTotalIncome > 0 ? Math.max(0, Math.min(pocketPercentage, 100)) : pocketValue !== 0 ? 12 : 0;
                const pocketPercentageLabel = expectedTotalIncome > 0 ? `${Math.round(Math.max(0, Math.min(pocketPercentage, 100)))}%` : pocketValue !== 0 ? "Sin ingreso" : "0%";
                const statusLabel = getPocketStatusLabel(pocketPercentage);
                const statusColor = getPocketStatusColor(pocketPercentage, theme);
                const lastMovement = pocketMovements.length > 0 ? pocketMovements[pocketMovements.length - 1] : null;
                
                let lastMovementLabel = "0";
                if (lastMovement) {
                  const movDate = new Date(String(lastMovement.createdAt || lastMovement.date || ""));
                  const today = new Date();
                  const isToday = movDate.toDateString() === today.toDateString();
                  lastMovementLabel = isToday ? "Hoy" : String(lastMovement.date || "Sin fecha");
                }
                
                return (
                  <Pressable key={pocketId} onPress={() => handleOpenBagDetail(pocketId)}>
                  <Card mode="elevated" style={[styles.pocketCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
                    <Card.Content>
                      <View style={styles.rowWithIconTwoLines}>
                        <View style={styles.cardIconWrap}>
                          <Icon source={getPocketIconName(pocketName)} size={34} color={uiColors.pocketAccent} />
                        </View>
                        <View style={styles.rowWithIconContent}>
                          <View style={styles.pocketTopRow}>
                            <PaperText variant="titleSmall" style={[styles.pocketName, { color: uiColors.onSurface }]} numberOfLines={1}>{pocketName}</PaperText>
                            <PaperText variant="titleSmall" style={[styles.pocketValueStrong, { color: uiColors.onSurface }]}>{toCurrency(pocketValue)}</PaperText>
                          </View>
                          <View style={styles.pocketBottomRow}>
                            <PaperText variant="bodySmall" style={[styles.pocketRuleLabel, { color: uiColors.mutedText }]} numberOfLines={1}>{`Regla: ${pocketRule}`}</PaperText>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.pocketProgressTrack, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                        <View style={[styles.pocketProgressFill, { width: `${pocketFillWidth}%`, backgroundColor: statusColor }]} />
                        <PaperText
                          variant="labelSmall"
                          style={[
                            styles.pocketProgressLabel,
                            { color: expectedTotalIncome > 0 ? uiColors.onSurface : uiColors.mutedText },
                          ]}
                          numberOfLines={1}
                        >
                          {pocketPercentageLabel}
                        </PaperText>
                      </View>
                      <View style={styles.pocketStatusRow}>
                        <PaperText variant="bodySmall" style={[styles.pocketStatusLabel, { color: statusColor }]}>{`Estado: ${statusLabel}`}</PaperText>
                        <PaperText variant="bodySmall" style={[styles.pocketLastMovement, { color: uiColors.mutedText }]}>{`Ultimo movimiento: ${lastMovementLabel}`}</PaperText>
                      </View>
                      
                      <View style={styles.pocketBankRow}>
                        <PaperText variant="bodySmall" style={[styles.pocketBank, { color: uiColors.onSurface }]}>{pocketBank}</PaperText>
                        <PaperText variant="bodySmall" style={[styles.pocketContract, { color: uiColors.onSurface }]}>{pocketContract}</PaperText>
                      </View>
                    </Card.Content>
                  </Card>
                  </Pressable>
                );
              })
            )}
          </>
        )}

        {activeTab === "movimientos" && (
          <>
            {!currentCycle ? (
              <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay ciclo ABIERTO o PLANIFICADO. Crea uno para registrar movimientos.</PaperText>
            ) : (
              <>
                <View style={styles.segmentRow}>
                  {([
                    { key: "TODOS", label: "Todos" },
                    { key: "ENTRADAS", label: "Entradas" },
                    { key: "SALIDAS", label: "Salidas" },
                  ] as const).map((filterOption) => (
                    <Button
                      key={filterOption.key}
                      mode={movementListFilter === filterOption.key ? "contained" : "outlined"}
                      style={styles.segmentButton}
                      contentStyle={styles.segmentButtonContent}
                      buttonColor={movementListFilter === filterOption.key ? theme.colors.primary : undefined}
                      textColor={movementListFilter === filterOption.key ? theme.colors.onPrimary : theme.colors.onSurface}
                      onPress={() => setMovementListFilter(filterOption.key)}
                    >
                      {filterOption.label}
                    </Button>
                  ))}
                </View>

                {filteredMovements.length === 0 ? (
                  <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>
                    {movementListFilter === "TODOS"
                      ? "No hay movimientos en el ciclo actual."
                      : movementListFilter === "ENTRADAS"
                        ? "No hay entradas en el ciclo actual."
                        : "No hay salidas en el ciclo actual."}
                  </PaperText>
                ) : (
                  filteredMovements.map((movement) => {
                const movId = String(movement.id || "");
                const movType = String(movement.movementType || movement.type || "");
                const movConcept = String(movement.movementConcept || movement.concept || "Sin concepto");
                const movValue = Number(movement.value || 0);
                const isIncome = movType.toUpperCase() === "INGRESO";
                const movColor = isIncome ? "#059669" : (theme.dark ? "#FB7185" : "#DC2626");
                const movIcon = isIncome ? "arrow-down-circle" : "arrow-up-circle";
                
                const { dateLabel, timeLabel } = formatMovementDateTime(movement as Record<string, unknown>);
                const fullDateTime = `${dateLabel} ${timeLabel}`;
                
                return (
                  <Pressable key={movId || `mov-${fullDateTime}-${movConcept}`} onPress={() => handleOpenMovementDetail(movement as Record<string, unknown> & { id?: string })}>
                    <Card mode="elevated" style={[styles.movementCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
                      <Card.Content>
                        <View style={styles.movementRowHeader}>
                          <View style={styles.movementConceptRow}>
                            <Icon source={movIcon} size={20} color={movColor} />
                            <PaperText style={[styles.movementConcept, { color: uiColors.onSurface }]}>{movConcept}</PaperText>
                          </View>
                          <PaperText style={[styles.movementValueText, { color: movColor }]}>{toCurrency(movValue)}</PaperText>
                        </View>
                        <View style={styles.movementRowFooter}>
                          <PaperText variant="bodySmall" style={[styles.movementDateTime, { color: movColor }]}>{fullDateTime}</PaperText>
                          <PaperText variant="bodySmall" style={[styles.movementType, { color: movColor }]}>{movType.toUpperCase() || "--"}</PaperText>
                        </View>
                      </Card.Content>
                    </Card>
                  </Pressable>
                );
                  })
                )}
              </>
            )}
          </>
        )}

        {activeTab === "historial" && (
          <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>Historial de ciclos anteriores no disponible. Los datos mostrados corresponden al ciclo actual.</PaperText>
        )}
      </ScrollView>

      <Surface
        style={[
          styles.bottomNav,
          { backgroundColor: uiColors.navBackground, borderColor: uiColors.navBorder },
          {
            bottom: Math.max(insets.bottom, 10),
            height: 78,
          },
        ]}
        elevation={0}
      >
        <Pressable style={styles.navItem} onPress={() => setActiveTab("inicio")}>
          <Icon
            source="home-variant"
            size={18}
            color={activeTab === "inicio" ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.navText,
              {
                color:
                  activeTab === "inicio" ? theme.colors.primary : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Inicio
          </Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => setActiveTab("bolsas")}>
          <Icon
            source="wallet-outline"
            size={18}
            color={activeTab === "bolsas" ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.navText,
              {
                color:
                  activeTab === "bolsas" ? theme.colors.primary : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Bolsas
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.plusButton,
            { backgroundColor: theme.colors.primary },
          ]}
          onPress={() => openModal("quickActions")}
        >
          <Icon source="plus" size={30} color={theme.colors.onPrimary} />
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => setActiveTab("movimientos")}>
          <Icon
            source="swap-horizontal"
            size={18}
            color={activeTab === "movimientos" ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.navText,
              {
                color:
                  activeTab === "movimientos"
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Movimientos
          </Text>
        </Pressable>

        <Pressable style={styles.navItem} onPress={() => setActiveTab("historial")}>
          <Icon
            source="history"
            size={18}
            color={activeTab === "historial" ? theme.colors.primary : theme.colors.onSurfaceVariant}
          />
          <Text
            numberOfLines={1}
            ellipsizeMode="clip"
            style={[
              styles.navText,
              {
                color:
                  activeTab === "historial"
                    ? theme.colors.primary
                    : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            Historial
          </Text>
        </Pressable>
      </Surface>

      <Modal visible={activeModal !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, { paddingBottom: Math.max(insets.bottom, 18) + 14 }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
          <View style={[styles.modalCard, activeModal === "quickActions" ? styles.quickActionsModalCard : null, { backgroundColor: theme.colors.surface }]}> 
            {activeModal !== "wizardInitialization" && (
              <>
                <View style={styles.modalHeader}>
                  <PaperText variant="titleLarge" style={styles.modalHeaderTitle}>{modalTitle(activeModal)}</PaperText>
                  <IconButton icon="close" size={20} onPress={closeModal} />
                </View>
                <Divider />
              </>
            )}
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              keyboardShouldPersistTaps="handled"
            >
              {renderModalBody()}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function modalTitle(activeModal: ModalKey | null) {
  if (!activeModal) return "";

  const map: Record<ModalKey, string> = {
    quickActions: "Crear nuevo",
    detailMember: "Detalle miembro",
    detailBag: "Detalle bolsa",
    detailMovement: "Detalle movimiento",
    detailCommitment: "Detalle compromiso",
    detailPeriod: "Detalle periodo",
    formEditIncome: "Editar ingreso",
    formNewMember: "Nuevo miembro",
    formNewPeriod: "Crear periodo",
    formConfigureBag: "Configurar bolsa",
    formNewCommitment: "Crear compromiso",
    formRegisterBalance: "Registrar saldo",
    formRegisterMovement: "Registrar movimiento",
    confirmDeleteMember: "Eliminar miembro",
    wizardInitialization: "Inicializacion",
  };

  return map[activeModal] || "";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  topBar: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E6EA",
  },
  topBarContent: {
    alignItems: "center",
  },
  workspaceName: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
  },
  content: {
    paddingVertical: 18,
    paddingBottom: 130,
    gap: 14,
  },
  summaryCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE3EA",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  templatesCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#DCE3EA",
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  summaryTitle: {
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryText: {
    marginTop: 6,
  },
  metricsRow: {
    marginTop: 12,
    flexDirection: "row",
    gap: 10,
  },
  summaryPeriodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  metricBox: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    padding: 10,
    gap: 4,
  },
  metricLabel: {
    color: "#475569",
    fontWeight: "600",
    fontSize: 12,
  },
  metricValue: {
    fontWeight: "700",
    fontSize: 13,
  },
  metricValueStrong: {
    fontWeight: "800",
    fontSize: 16,
  },
  progressHeader: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  progressTrack: {
    marginTop: 8,
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#10B981",
  },
  sectionSpacing: {
    marginTop: 14,
  },
  templateItem: {
    marginTop: 0,
  },
  inlineButton: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  entityRow: {
    marginTop: 10,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
    gap: 10,
  },
  memberRow: {
    marginTop: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  memberInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  memberContributionText: {
    fontSize: 12,
  },
  memberName: {
    fontWeight: "700",
  },
  memberStatusOk: {
    fontWeight: "800",
    color: "#059669",
  },
  memberStatusPending: {
    fontWeight: "800",
    color: "#C2410C",
  },
  pendingInfo: {
    flex: 1,
    paddingRight: 10,
  },
  pendingIconWrap: {
    width: 40,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  pendingTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  pendingBottomRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  pendingName: {
    fontWeight: "700",
  },
  pendingAmount: {
    fontWeight: "800",
  },
  pendingConceptText: {
    flex: 1,
  },
  pendingAmountText: {
    textAlign: "right",
  },
  pendingDateText: {
    textAlign: "right",
  },
  bottomNav: {
    position: "absolute",
    left: 8,
    right: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E6EA",
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingHorizontal: 6,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  navItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  navText: {
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    width: "100%",
  },
  plusButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    maxHeight: "92%",
    width: "100%",
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 18,
    shadowColor: "#000",
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  quickActionsModalCard: {
    height: "55%",
    maxHeight: "55%",
  },
  modalHeader: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalHeaderTitle: {
    fontWeight: "800",
    flexShrink: 1,
    paddingRight: 12,
  },
  modalBody: {
    maxHeight: "100%",
  },
  modalBodyContent: {
    paddingTop: 4,
    gap: 14,
  },
  quickActionsGroupedList: {
    gap: 10,
    paddingBottom: 6,
  },
  quickActionsSectionBlock: {
    gap: 10,
  },
  quickActionsSectionDivider: {
    marginBottom: 4,
  },
  quickActionsSectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  quickActionRow: {
    minHeight: 58,
    width: "100%",
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  quickActionIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionLabel: {
    flex: 1,
    fontWeight: "800",
    fontSize: 15,
  },
  helperText: {
  },
  wizardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wizardCaption: {
    fontWeight: "700",
    fontSize: 13,
  },
  wizardTitle: {
    fontWeight: "800",
  },
  wizardCard: {
    borderRadius: 14,
    borderColor: "#A7F3D0",
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  wizardTaskTitle: {
    fontWeight: "800",
  },
  wizardStatusText: {
    marginTop: 8,
    marginBottom: 10,
    fontWeight: "600",
  },
  wizardPrimaryGreen: {
    borderRadius: 12,
    backgroundColor: "#10B981",
    marginTop: 4,
  },
  wizardPrimaryTeal: {
    borderRadius: 12,
    backgroundColor: "#14B8A6",
    marginTop: 10,
  },
  wizardPrimaryIndigo: {
    borderRadius: 12,
    backgroundColor: "#6366F1",
    marginTop: 10,
  },
  wizardSecondaryButton: {
    borderRadius: 12,
    marginTop: 10,
    borderColor: "#D1D5DB",
  },
  disabledButton: {
    opacity: 0.55,
  },
  wizardCycleLabel: {
    marginTop: 8,
    color: "#1E293B",
    fontWeight: "700",
  },
  wizardInfoBox: {
    marginTop: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    padding: 10,
  },
  wizardInfoText: {
    color: "#334155",
  },
  wizardMemberCard: {
    marginTop: 10,
    borderRadius: 12,
    borderColor: "#CBD5E1",
  },
  wizardActionsRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  wizardPendingText: {
    marginTop: 10,
    color: "#C2410C",
    fontWeight: "700",
  },
  detailGroup: {
    gap: 6,
  },
  memberDetailAvatarContainer: {
    alignItems: "center",
    marginBottom: 4,
  },
  memberDetailAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  memberStateBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  memberStateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  memberStateLabel: {
    flex: 1,
    textAlign: "left",
  },
  memberStateValue: {
    flex: 1,
    fontWeight: "800",
    fontSize: 13,
    textAlign: "right",
  },
  memberStateBadgeText: {
    fontWeight: "800",
    fontSize: 12,
  },
  movementCard: {
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    marginTop: 12,
    borderWidth: 1,
    borderColor: "#E2E6EA",
  },
  movementRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  movementDetailRow: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  movementInfo: {
    flex: 1,
  },
  movementLabel: {
    fontWeight: "700",
  },
  movementMeta: {
    marginBottom: 4,
  },
  movementValue: {
    fontWeight: "800",
  },
  pocketCard: {
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
  },
  rowWithIconTwoLines: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  cardIconWrap: {
    width: 40,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 2,
  },
  rowWithIconContent: {
    flex: 1,
  },
  pocketTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  pocketBottomRow: {
    marginTop: 4,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  pocketHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  pocketNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  pocketName: {
    fontWeight: "700",
    flex: 1,
  },
  pocketValueStrong: {
    fontWeight: "800",
    fontSize: 16,
  },
  pocketRuleLabel: {
    marginBottom: 8,
    fontWeight: "600",
  },
  pocketProgressTrack: {
    marginTop: 6,
    height: 18,
    borderRadius: 999,
    borderWidth: 1,
    overflow: "hidden",
    justifyContent: "center",
  },
  pocketProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  pocketProgressLabel: {
    position: "absolute",
    alignSelf: "center",
    fontWeight: "800",
    fontSize: 11,
    zIndex: 1,
  },
  pocketStatusRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pocketStatusLabel: {
    fontWeight: "700",
  },
  pocketLastMovement: {
    fontWeight: "600",
  },
  pocketBankRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pocketBank: {
    fontWeight: "600",
    flex: 1,
  },
  pocketContract: {
    fontWeight: "600",
    textAlign: "right",
  },
  movementRowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  movementConceptRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  movementConcept: {
    fontWeight: "700",
    flex: 1,
  },
  movementConceptInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  movementValueText: {
    fontWeight: "800",
  },
  movementRowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  movementDateTime: {
    fontWeight: "600",
  },
  movementType: {
    fontWeight: "700",
    fontSize: 12,
  },
  divider: {
    marginVertical: 10,
  },
  miniCard: {
    borderRadius: 14,
    marginVertical: 8,
    backgroundColor: "#FFFFFF",
    shadowColor: "#0F172A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalActions: {
    marginTop: 12,
    gap: 10,
  },
  modalActionsRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  inputField: {
    marginTop: 8,
  },
  inputFieldDark: {
    backgroundColor: "#111827",
  },
  switchRow: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  segmentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 10,
  },
  formBlock: {
    gap: 8,
  },
  memberDetailFirstField: {
    marginTop: 0,
  },
  stepBlock: {
    gap: 10,
  },
  stepLabel: {
    fontWeight: "800",
  },
  formLabel: {
    fontWeight: "700",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  checkboxTextBlock: {
    flex: 1,
  },
  checkboxText: {
    fontWeight: "600",
  },
  checkboxHelperText: {
    flexWrap: "wrap",
  },
  primarySheetButton: {
    borderRadius: 14,
    backgroundColor: "#10B981",
    marginTop: 4,
  },
  balanceSheetButton: {
    borderRadius: 14,
    backgroundColor: "#0F766E",
    marginTop: 4,
  },
  sheetButtonContent: {
    minHeight: 48,
  },
  commitmentButton: {
    marginTop: 8,
    backgroundColor: "#F97316",
  },
  movementSheetButton: {
    borderRadius: 14,
    backgroundColor: "#6366F1",
    marginTop: 8,
  },
  segmentButton: {
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: 12,
  },
  segmentButtonDark: {
    backgroundColor: "#000000",
    borderColor: "#3F3F46",
  },
  segmentButtonContent: {
    minHeight: 42,
  },
  selectorField: {
    minHeight: 52,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectorFieldDark: {
    backgroundColor: "#000000",
    borderColor: "#3F3F46",
  },
  selectorText: {
    fontWeight: "500",
    color: "#111827",
  },
  selectorTextDark: {
    color: "#FFFFFF",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownListDark: {
    backgroundColor: "#000000",
    borderColor: "#3F3F46",
  },
  dropdownItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
  },
  dropdownItemDark: {
    backgroundColor: "#000000",
    borderBottomColor: "#27272A",
  },
  dropdownItemText: {
    fontWeight: "600",
  },
  dropdownItemTextDark: {
    color: "#FFFFFF",
  },
  dropdownItemDisabled: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
    backgroundColor: "#F8FAFC",
  },
  dropdownItemDisabledDark: {
    backgroundColor: "#111111",
    borderBottomColor: "#27272A",
  },
  dropdownItemDisabledText: {
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
  },
});

function getPocketMovementIcon(type: string): string {
  const upper = String(type || "").toUpperCase();
  if (upper === "INGRESO") return "arrow-down-circle";
  if (upper === "GASTO") return "arrow-up-circle";
  if (upper === "COMPROMISO") return "alert-circle";
  if (upper === "RESERVADO") return "lock-clock";
  return "swap-horizontal";
}

function getPocketMovementColor(type: string, theme: any): string {
  const upper = String(type || "").toUpperCase();
  if (upper === "INGRESO") return "#059669";
  if (upper === "GASTO") return theme.dark ? "#FB7185" : "#DC2626";
  if (upper === "COMPROMISO") return theme.dark ? "#FCA5A5" : "#F87171";
  if (upper === "RESERVADO") return "#0EA5E9";
  return theme.colors.onSurface;
}

function getPocketStatusLabel(percentage: number): string {
  if (percentage < 60) return "Saludable";
  if (percentage <= 85) return "AtenciÃ³n";
  return "Excedido";
}

function getPocketStatusColor(percentage: number, theme: any): string {
  if (percentage < 60) return "#059669"; // Verde
  if (percentage <= 85) return "#D97706"; // Amarillo
  return "#DC2626"; // Rojo
}

function getPocketIconName(pocketName: string): string {
  const lower = String(pocketName || "").toLowerCase();
  if (lower.includes("viaj")) return "airplane";
  if (lower.includes("aliment") || lower.includes("comid")) return "food";
  if (lower.includes("salu") || lower.includes("medic")) return "hospital-box";
  if (lower.includes("educ") || lower.includes("escuel")) return "book";
  if (lower.includes("trans") || lower.includes("auto") || lower.includes("moto")) return "car";
  if (lower.includes("casa") || lower.includes("hogar") || lower.includes("rent")) return "home";
  if (lower.includes("entret") || lower.includes("diver")) return "gamepad-variant";
  if (lower.includes("ahorr")) return "piggy-bank";
  if (lower.includes("gast")) return "cash";
  return "wallet";
}

function formatDisplayDate(dateValue: string): string {
  const trimmed = String(dateValue || "").trim();
  if (!trimmed) return "Sin fecha";

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return trimmed;
  }

  const day = String(parsed.getDate()).padStart(2, "0");
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const year = parsed.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatPocketRuleLabel(pocket: Record<string, unknown>): string {
  const typeRule = String(pocket.typeRule || pocket.ruleType || pocket.rule || pocket.ruleSymbol || "").trim();
  const rawValue = Number(pocket.valueRule ?? pocket.ruleValue ?? pocket.value ?? 0);

  if (typeRule === "%") {
    const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
    return `${safeValue.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  }

  if (typeRule === "$" || typeRule === "-") {
    const safeValue = Number.isFinite(rawValue) ? rawValue : 0;
    return safeValue.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  if (Number.isFinite(rawValue) && rawValue !== 0) {
    return rawValue.toLocaleString("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  return typeRule || "Sin regla";
}

function formatPeriodName(periodValue: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(periodValue.trim());

  if (!match) {
    return "";
  }

  const monthIndex = Number(match[2]) - 1;
  const year = match[1];
  const months = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  if (monthIndex < 0 || monthIndex >= months.length) {
    return "";
  }

  return `${months[monthIndex]} ${year}`;
}

function formatDateForStorage(value: Date) {
  const year = value.getFullYear();
  const month = `${value.getMonth() + 1}`.padStart(2, "0");
  const day = `${value.getDate()}`.padStart(2, "0");

  return `${year}-${month}-${day}`;
}



