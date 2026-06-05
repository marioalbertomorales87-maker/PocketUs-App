import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
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

type ModalKey =
  | "quickActions"
  | "detailMember"
  | "detailBag"
  | "detailCommitment"
  | "detailPeriod"
  | "formEditIncome"
  | "formNewMember"
  | "formNewPeriod"
  | "formConfigureBag"
  | "formNewCommitment"
  | "formRegisterBalance"
  | "formRegisterMovement"
  | "wizardInitialization";

type QuickAction = {
  label: string;
  target: ModalKey;
};

type MovementPartyType = "MIEMBRO" | "BOLSA" | "COMPROMISO" | "OTRO";

export default function DashboardScreen({
  workspace,
  onBackToFamilies,
}: DashboardScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const uiColors = useMemo(
    () => ({
      icon: theme.colors.primary,
      cardBackground: theme.colors.elevation.level2,
      cardBorder: theme.colors.outlineVariant,
      mutedText: theme.colors.onSurfaceVariant,
      metricBackground: theme.colors.surfaceVariant,
      metricBorder: theme.colors.outlineVariant,
      navBackground: theme.colors.surface,
      navBorder: theme.colors.outlineVariant,
      memberIconBackground: theme.colors.secondaryContainer,
      successText: theme.dark ? "#6EE7B7" : "#059669",
      warningText: theme.dark ? "#FDBA74" : "#C2410C",
    }),
    [theme]
  );
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DashboardTab>("inicio");
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
  const [memberBank, setMemberBank] = useState("");
  const [memberContract, setMemberContract] = useState("");
  const [periodId, setPeriodId] = useState("");
  const [memberSubmitError, setMemberSubmitError] = useState<string | null>(null);
  const [periodSubmitError, setPeriodSubmitError] = useState<string | null>(null);
  const [isSavingMember, setIsSavingMember] = useState(false);
  const [isSavingPeriod, setIsSavingPeriod] = useState(false);

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
    commitments?: Array<Record<string, unknown> & { id: string }>;
    movements?: Array<Record<string, unknown> & { id: string }>;
    periods?: Array<Record<string, unknown> & { id: string }>;
    incomes?: Array<Record<string, unknown> & { id: string }>;
  } | null>(null);

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

  const toCurrency = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return safe.toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
  };

  const toPercent = (value: number) => {
    const safe = Number.isFinite(value) ? value : 0;
    return `${safe.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  };

  const getPocketAssignedValue = (pocket: Record<string, unknown>, expectedTotalIncome: number) => {
    const typeRule = String(pocket.typeRule || "");
    const valueRule = Number(pocket.valueRule || 0);

    if (!Number.isFinite(valueRule)) {
      return 0;
    }

    if (typeRule === "%") {
      return (expectedTotalIncome * valueRule) / 100;
    }

    return valueRule;
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

  const budgetCycle = plannedCycle ?? activeCycle;
  const expectedTotalIncome = Number(budgetCycle?.expectedTotalIncome || 0);

  const activePockets = (viewData?.pockets ?? []).filter(
    (item) => String(item.state || "ACTIVE").toUpperCase() === "ACTIVE"
  );
  const hasExistingRemainingPocket = activePockets.some((item) => String(item.typeRule || "") === "-");
  const distributedWithoutRemaining = activePockets.reduce((acc, item) => {
    if (String(item.typeRule || "") === "-") {
      return acc;
    }
    return acc + getPocketAssignedValue(item, expectedTotalIncome);
  }, 0);
  const computedRemainingPocketValue = expectedTotalIncome - distributedWithoutRemaining;

  const distributedTotal = activePockets.reduce(
    (acc, item) => acc + getPocketAssignedValue(item, expectedTotalIncome),
    0
  );

  const savingsTotal = activePockets
    .filter((item) => String(item.category || "").toUpperCase() === "AHORRO")
    .reduce((acc, item) => acc + getPocketAssignedValue(item, expectedTotalIncome), 0);

  const expensesTotal = activePockets
    .filter((item) => String(item.category || "").toUpperCase() === "GASTO")
    .reduce((acc, item) => acc + getPocketAssignedValue(item, expectedTotalIncome), 0);

  const monthlyProgress = expectedTotalIncome > 0
    ? Math.max(0, Math.min(100, (distributedTotal / expectedTotalIncome) * 100))
    : 0;

  const pendingCommitments = (viewData?.commitments ?? []).filter((item) => {
    const state = String(item.state || "").toUpperCase();
    return state === "PENDIENTE" || state === "RESERVADO";
  });
  const pendingCommitmentsTotal = pendingCommitments.reduce((acc, item) => {
    const value = Number(item.estimatedValue || 0);
    return acc + (Number.isFinite(value) ? value : 0);
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
  ]);

  const quickActions = useMemo<QuickAction[]>(() => {
    if (activeTab === "inicio") {
      return [
        { label: "Crear miembro", target: "formNewMember" },
        { label: "Crear periodo", target: "formNewPeriod" },
      ];
    }

    if (activeTab === "bolsas") {
      return [
        { label: "Configurar bolsa", target: "formConfigureBag" },
        { label: "Crear compromiso", target: "formNewCommitment" },
        { label: "Registrar saldo inicial bolsa", target: "formRegisterBalance" },
      ];
    }

    if (activeTab === "movimientos") {
      return [{ label: "Generar movimiento", target: "formRegisterMovement" }];
    }

    return [];
  }, [activeTab]);

  const openModal = (modal: ModalKey) => {
    if (modal === "formNewMember") {
      setMemberName("");
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

  const closeModal = () => {
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

  const handleCreateMember = async () => {
    try {
      setIsSavingMember(true);
      setMemberSubmitError(null);

      await createFamilyMember(workspace.familyId, {
        name: memberName,
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

    const resolvedValueRule = isRemainingPocket ? computedRemainingPocketValue : Number(pocketValueRule);
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
        estimatedValue: Number(commitmentEstimatedValue),
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
        balanceValue: Number(balanceValue),
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
        value: Number(movementValue),
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
    setWizardIncomeByMemberId((prev) => ({
      ...prev,
      [memberId]: value,
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
      const value = Number(wizardIncomeByMemberId[String(member.id || "")] || "");
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
        const value = Number(wizardIncomeByMemberId[memberId] || "0");
        await createFamilyInitialIncome(workspace.familyId, String(planned.id || ""), {
          memberId,
          realValue: value,
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
          <View style={styles.optionList}>
            {quickActions.length === 0 ? (
              <PaperText style={styles.helperText}>Sin acciones disponibles para esta vista.</PaperText>
            ) : (
              quickActions.map((item) => (
                <Pressable
                  key={item.label}
                  style={[styles.optionPill, quickActionPillStyle(item.target)]}
                  onPress={() => handleQuickActionSelect(item.target)}
                >
                  <PaperText style={[styles.optionPillText, quickActionTextStyle(item.target)]}>{item.label}</PaperText>
                </Pressable>
              ))
            )}
          </View>
        </>
      );
    }

    if (activeModal === "detailMember") {
      return (
        <>
          <PaperText variant="titleMedium">Detalle Miembro</PaperText>
          <View style={styles.detailGroup}>
            <PaperText>Nombre: {String(viewData?.members?.[0]?.name || "Sin definir")}</PaperText>
            <PaperText>Banco: {String(viewData?.members?.[0]?.bank || "Sin definir")}</PaperText>
            <PaperText>Contrato ingresos: {String(viewData?.members?.[0]?.contract || "Sin definir")}</PaperText>
            <PaperText>Estado activo: {String(viewData?.members?.[0]?.state || "ACTIVE")}</PaperText>
          </View>
          <Divider style={styles.divider} />
          <PaperText variant="titleSmall">Movimientos del periodo actual</PaperText>
          <PaperText style={styles.helperText}>Esta seccion mostrara movimientos conectados al backend.</PaperText>
          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={() => openModal("formEditIncome")}>Editar ingreso</Button>
            <Button mode="contained" disabled>Guardar cambios</Button>
            <Button mode="text" textColor={theme.colors.error} disabled>Eliminar miembro</Button>
          </View>
        </>
      );
    }

    if (activeModal === "detailBag") {
      return (
        <>
          <PaperText variant="titleMedium">Detalle Bolsa</PaperText>
          <View style={styles.detailGroup}>
            <PaperText>Nombre: {String(viewData?.pockets?.[0]?.name || data?.templates?.[0] || "Sin definir")}</PaperText>
            <PaperText>Banco: {String(viewData?.pockets?.[0]?.bank || "Sin definir")}</PaperText>
            <PaperText>Contrato: {String(viewData?.pockets?.[0]?.contract || "Sin definir")}</PaperText>
            <PaperText>Regla: {String(viewData?.pockets?.[0]?.rule || "Sin definir")}</PaperText>
            <PaperText>Categoria: {String(viewData?.pockets?.[0]?.category || "Sin definir")}</PaperText>
          </View>
          <Card mode="elevated" style={styles.miniCard}>
            <Card.Content>
              <PaperText variant="titleSmall">Saldo inicial</PaperText>
              <PaperText variant="bodyMedium">$0.00</PaperText>
            </Card.Content>
          </Card>
          <PaperText variant="titleSmall">Compromisos asociados</PaperText>
          <PaperText style={styles.helperText}>Lista enlazada al backend.</PaperText>
          <PaperText variant="titleSmall">Movimientos asociados</PaperText>
          <PaperText style={styles.helperText}>Lista enlazada al backend.</PaperText>
          <View style={styles.modalActions}>
            <Button mode="contained" disabled>Guardar cambios</Button>
            <Button mode="text" textColor={theme.colors.error} disabled>Eliminar bolsa</Button>
          </View>
        </>
      );
    }

    if (activeModal === "detailCommitment") {
      return (
        <>
          <PaperText variant="titleMedium">Detalle Compromiso</PaperText>
          <View style={styles.detailGroup}>
            <PaperText>Nombre: {String(viewData?.commitments?.[0]?.name || "Sin definir")}</PaperText>
            <PaperText>Monto: {String(viewData?.commitments?.[0]?.amount || "Sin definir")}</PaperText>
            <PaperText>Estado: {String(viewData?.commitments?.[0]?.state || "Sin definir")}</PaperText>
          </View>
          <View style={styles.modalActions}>
            <Button mode="contained" disabled>Guardar cambios</Button>
          </View>
        </>
      );
    }

    if (activeModal === "detailPeriod") {
      const statusRaw = String(viewData?.movements?.[0]?.state || "PLANIFICADO").toUpperCase();
      const status = statusRaw === "ABIERTO" || statusRaw === "CERRADO" ? statusRaw : "PLANIFICADO";

      return (
        <>
          <PaperText variant="titleMedium">Detalle Periodo</PaperText>
          <View style={styles.detailGroup}>
            <PaperText>ID: {String(viewData?.movements?.[0]?.period || "Sin definir")}</PaperText>
            <PaperText>Nombre: {String(viewData?.movements?.[0]?.periodName || "Sin definir")}</PaperText>
            <PaperText>Estado: {status}</PaperText>
            <PaperText>Ingreso esperado: {String(viewData?.movements?.[0]?.expectedIncome || "Sin definir")}</PaperText>
            <PaperText>Ingreso real: {String(viewData?.movements?.[0]?.realIncome || "Sin definir")}</PaperText>
          </View>
          <View style={styles.modalActions}>
            {status === "PLANIFICADO" && (
              <>
                <Button mode="contained" disabled>Cerrar planificacion</Button>
                <Button mode="text" textColor={theme.colors.error} disabled>Eliminar periodo</Button>
              </>
            )}
            {status === "ABIERTO" && <Button mode="contained" disabled>Cerrar periodo</Button>}
            {status === "CERRADO" && <PaperText style={styles.helperText}>Periodo cerrado: solo consulta.</PaperText>}
          </View>
        </>
      );
    }

    if (activeModal === "formEditIncome") {
      return (
        <>
          <PaperText variant="titleMedium">Editar ingreso</PaperText>
          <TextInput mode="outlined" label="Nombre miembro" value={String(viewData?.members?.[0]?.name || "Sin definir")} editable={false} style={styles.inputField} />
          <TextInput mode="outlined" label="Ingreso actual" value={String(viewData?.members?.[0]?.income || "0")} editable={false} style={styles.inputField} />
          <TextInput mode="outlined" label="Ingreso" style={styles.inputField} keyboardType="numeric" />
          <PaperText style={styles.helperText}>Al guardar se registrara un movimiento de ingreso base.</PaperText>
          <View style={styles.modalActions}>
            <Button mode="contained" disabled>Guardar ingreso</Button>
          </View>
        </>
      );
    }

    if (activeModal === "formNewMember") {
      const isMemberSaveDisabled =
        isSavingMember ||
        !memberName.trim() ||
        !memberBank.trim() ||
        !memberContract.trim();

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Nombre</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Nombre del participante" style={styles.inputField} value={memberName} onChangeText={setMemberName} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Banco</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Entidad financiera" style={styles.inputField} value={memberBank} onChangeText={setMemberBank} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Contrato ingresos</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Contrato referencial" style={styles.inputField} value={memberContract} onChangeText={setMemberContract} />
          </View>

          <Pressable style={styles.checkboxRow} onPress={() => setMemberActive((value) => !value)}>
            <Checkbox status={memberActive ? "checked" : "unchecked"} />
            <PaperText style={styles.checkboxText}>Miembro activo</PaperText>
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
            <PaperText variant="labelLarge" style={styles.formLabel}>ID periodo</PaperText>
            <TextInput
              mode="outlined"
              placeholder="Formato: AAAA-MM"
              style={styles.inputField}
              value={periodId}
              onChangeText={setPeriodId}
            />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>MES</PaperText>
            <TextInput
              mode="outlined"
              placeholder="Nombre generado automaticamente"
              value={periodName}
              editable={false}
              style={styles.inputField}
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
          : !pocketValueRule.trim() || !Number.isFinite(Number(pocketValueRule)));

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Nombre bolsa</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Nombre de bolsa" style={styles.inputField} value={pocketName} onChangeText={setPocketName} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Tipo categoria</PaperText>
            <View style={styles.segmentRow}>
              {(["Gasto", "Ahorro"] as const).map((item) => (
                <Button
                  key={item}
                  mode={bagCategory === item ? "contained" : "outlined"}
                  style={styles.segmentButton}
                  contentStyle={styles.segmentButtonContent}
                  onPress={() => setBagCategory(item)}
                >
                  {item}
                </Button>
              ))}
            </View>
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Banco</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Entidad financiera" style={styles.inputField} value={pocketBank} onChangeText={setPocketBank} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Contrato</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Contrato referencial" style={styles.inputField} value={pocketContract} onChangeText={setPocketContract} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Tipo regla</PaperText>
            <View style={styles.segmentRow}>
              {(["Valor", "Porcentaje", "Restante"] as const).map((item) => (
                <Button
                  key={item}
                  mode={bagRuleType === item ? "contained" : "outlined"}
                  style={styles.segmentButton}
                  contentStyle={styles.segmentButtonContent}
                  onPress={() => {
                    setBagRuleType(item);
                    if (item === "Restante") {
                      setPocketValueRule(String(Math.max(0, computedRemainingPocketValue)));
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
            <PaperText variant="labelLarge" style={styles.formLabel}>Valor regla</PaperText>
            <TextInput
              mode="outlined"
              placeholder={isRemainingPocket ? "Calculado automaticamente" : "Ejemplo: Valor numerico"}
              style={styles.inputField}
              keyboardType="numeric"
              value={isRemainingPocket ? String(Math.max(0, computedRemainingPocketValue)) : pocketValueRule}
              onChangeText={setPocketValueRule}
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
        !Number.isFinite(Number(commitmentEstimatedValue)) ||
        !["MENSUAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "UNICO"].includes(commitmentPeriodicidad);

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Cuenta Origen</PaperText>
            <Pressable style={styles.selectorField} onPress={() => setCommitmentAccountMenuVisible((prev) => !prev)}>
              <PaperText style={styles.selectorText}>{isAccountSelected ? commitmentAccountType : commitmentAccountPlaceholder}</PaperText>
              <Icon source={commitmentAccountMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentAccountMenuVisible && (
              <View style={styles.dropdownList}>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCommitmentAccountType("BOLSA");
                    setCommitmentOriginId("");
                    setCommitmentOriginValue("Seleccione una bolsa");
                    setCommitmentOriginMenuVisible(false);
                    setCommitmentAccountMenuVisible(false);
                  }}
                >
                  <PaperText style={styles.dropdownItemText}>BOLSA</PaperText>
                </Pressable>
                <Pressable
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCommitmentAccountType("MIEMBRO");
                    setCommitmentOriginId("");
                    setCommitmentOriginValue("Seleccione un miembro");
                    setCommitmentOriginMenuVisible(false);
                    setCommitmentAccountMenuVisible(false);
                  }}
                >
                  <PaperText style={styles.dropdownItemText}>MIEMBRO</PaperText>
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Origen</PaperText>
            <Pressable
              style={[styles.selectorField, !isAccountSelected && { opacity: 0.6 }]}
              onPress={() => {
                if (!isAccountSelected) return;
                setCommitmentOriginMenuVisible((prev) => !prev);
              }}
            >
              <PaperText style={styles.selectorText}>{commitmentOriginValue}</PaperText>
              <Icon
                source={commitmentOriginMenuVisible ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
            </Pressable>
            {commitmentOriginMenuVisible && (
              <View style={styles.dropdownList}>
                {commitmentSourceOptions.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <PaperText style={styles.dropdownItemText}>{commitmentSourcePlaceholder}</PaperText>
                  </View>
                ) : (
                  commitmentSourceOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setCommitmentOriginId(option.id);
                        setCommitmentOriginValue(option.label);
                        setCommitmentOriginMenuVisible(false);
                      }}
                    >
                      <PaperText style={styles.dropdownItemText}>{option.label}</PaperText>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Concepto</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Concepto del compromiso" style={styles.inputField} value={commitmentConcept} onChangeText={setCommitmentConcept} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Referencia pago</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Referencia descriptiva" style={styles.inputField} value={commitmentReference} onChangeText={setCommitmentReference} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Valor pensado</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Valor numerico" style={styles.inputField} keyboardType="numeric" value={commitmentEstimatedValue} onChangeText={setCommitmentEstimatedValue} />
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Periodicidad</PaperText>
            <Pressable style={styles.selectorField} onPress={() => setCommitmentPeriodMenuVisible((prev) => !prev)}>
              <PaperText style={styles.selectorText}>{commitmentPeriodicidad}</PaperText>
              <Icon source={commitmentPeriodMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {commitmentPeriodMenuVisible && (
              <View style={styles.dropdownList}>
                {(["MENSUAL", "BIMESTRAL", "TRIMESTRAL", "SEMESTRAL", "ANUAL", "UNICO"] as const).map((option) => (
                  <Pressable
                    key={option}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setCommitmentPeriodicidad(option);
                      setCommitmentPeriodMenuVisible(false);
                    }}
                  >
                    <PaperText style={styles.dropdownItemText}>{option}</PaperText>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Fecha vencimiento</PaperText>
            <Pressable
              style={styles.selectorField}
              onPress={() => setCommitmentEndedDatePickerVisible(true)}
            >
              <PaperText style={styles.selectorText}>{commitmentEndedDate || "Seleccione una fecha"}</PaperText>
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
        !Number.isFinite(Number(balanceValue)) ||
        !hasPockets;

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Bolsa</PaperText>
            <Pressable
              style={[styles.selectorField, !hasPockets && { opacity: 0.6 }]}
              onPress={() => {
                if (!hasPockets) return;
                setBalancePocketMenuVisible((prev) => !prev);
              }}
            >
              <PaperText style={styles.selectorText}>{balancePocketLabel}</PaperText>
              <Icon source={balancePocketMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
            </Pressable>
            {balancePocketMenuVisible && (
              <View style={styles.dropdownList}>
                {pocketOptions.length === 0 ? (
                  <View style={styles.dropdownItem}>
                    <PaperText style={styles.dropdownItemText}>Sin bolsas registradas</PaperText>
                  </View>
                ) : (
                  pocketOptions.map((option) => (
                    <Pressable
                      key={option.id}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setBalancePocketId(option.id);
                        setBalancePocketLabel(option.label);
                        setBalancePocketMenuVisible(false);
                      }}
                    >
                      <PaperText style={styles.dropdownItemText}>{option.label}</PaperText>
                    </Pressable>
                  ))
                )}
              </View>
            )}
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Periodo</PaperText>
            <View style={styles.selectorField}>
              <PaperText style={styles.selectorText}>{effectivePeriodLabel}</PaperText>
              <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
            </View>
          </View>

          <View style={styles.formBlock}>
            <PaperText variant="labelLarge" style={styles.formLabel}>Monto (Saldo inicial mes)</PaperText>
            <TextInput mode="outlined" placeholder="Ejemplo: Valor numerico" style={styles.inputField} keyboardType="numeric" value={balanceValue} onChangeText={setBalanceValue} />
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
        !Number.isFinite(Number(movementValue)) ||
        !referenceOrigin ||
        !referenceDestination;

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.stepBlock}>
            <PaperText variant="labelLarge" style={styles.stepLabel}>Paso 1</PaperText>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={styles.formLabel}>Tipo</PaperText>
              <Pressable style={styles.selectorField} onPress={() => setMovementTypeMenuVisible((prev) => !prev)}>
                <PaperText style={styles.selectorText}>{movementType || "Seleccione una opcion"}</PaperText>
                <Icon source={movementTypeMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {movementTypeMenuVisible && (
                <View style={styles.dropdownList}>
                  {movementTypeOptions.map((option) => {
                    const lockedByCycle =
                      (option === "INGRESO" || option === "RESERVADO") && isNonPlannedCycle;

                    if (lockedByCycle) {
                      return (
                        <View key={option} style={styles.dropdownItemDisabled}>
                          <PaperText style={styles.dropdownItemDisabledText}>{option} (solo PLANIFICADO)</PaperText>
                        </View>
                      );
                    }

                    return (
                      <Pressable
                        key={option}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setMovementType(option);
                          setMovementTypeMenuVisible(false);
                        }}
                      >
                        <PaperText style={styles.dropdownItemText}>{option}</PaperText>
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
              <PaperText variant="labelLarge" style={styles.formLabel}>Origen</PaperText>
              <Pressable style={styles.selectorField} onPress={() => setMovementOriginMenuVisible((prev) => !prev)}>
                <PaperText style={styles.selectorText}>{movementOrigin || "Selecciona tipo de origen"}</PaperText>
                <Icon source={movementOriginMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {movementOriginMenuVisible && (
                <View style={styles.dropdownList}>
                  {movementPartyOptions.map((option) => (
                    <Pressable
                      key={`origin-${option}`}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setMovementOrigin(option);
                        setMovementOriginMenuVisible(false);
                        setMovementOriginReferenceMenuVisible(false);
                        setMovementOriginReferenceId("");
                        setMovementOriginReferenceText("");
                        setMovementOriginReferenceLabel(getMovementReferencePlaceholder("origen", option));
                      }}
                    >
                      <PaperText style={styles.dropdownItemText}>{option}</PaperText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {movementOrigin ? (
              <View style={styles.formBlock}>
                <PaperText variant="labelLarge" style={styles.formLabel}>Referencia Origen</PaperText>
                {movementOrigin === "OTRO" ? (
                  <TextInput
                    mode="outlined"
                    placeholder={originReferencePlaceholder}
                    style={styles.inputField}
                    value={movementOriginReferenceText}
                    onChangeText={setMovementOriginReferenceText}
                  />
                ) : (
                  <>
                    <Pressable
                      style={[styles.selectorField, originReferenceOptions.length === 0 && { opacity: 0.6 }]}
                      onPress={() => {
                        if (originReferenceOptions.length === 0) return;
                        setMovementOriginReferenceMenuVisible((prev) => !prev);
                      }}
                    >
                      <PaperText style={styles.selectorText}>{movementOriginReferenceLabel}</PaperText>
                      <Icon source={movementOriginReferenceMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                    {movementOriginReferenceMenuVisible && (
                      <View style={styles.dropdownList}>
                        {originReferenceOptions.length === 0 ? (
                          <View style={styles.dropdownItem}>
                            <PaperText style={styles.dropdownItemText}>No hay datos disponibles</PaperText>
                          </View>
                        ) : (
                          originReferenceOptions.map((option) => (
                            <Pressable
                              key={`origin-reference-${option.id}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setMovementOriginReferenceId(option.id);
                                setMovementOriginReferenceLabel(option.label);
                                setMovementOriginReferenceMenuVisible(false);
                              }}
                            >
                              <PaperText style={styles.dropdownItemText}>{option.label}</PaperText>
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
              <PaperText variant="labelLarge" style={styles.formLabel}>Destino</PaperText>
              <Pressable style={styles.selectorField} onPress={() => setMovementDestinationMenuVisible((prev) => !prev)}>
                <PaperText style={styles.selectorText}>{movementDestination || "Selecciona tipo de destino"}</PaperText>
                <Icon source={movementDestinationMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              {movementDestinationMenuVisible && (
                <View style={styles.dropdownList}>
                  {movementPartyOptions.map((option) => (
                    <Pressable
                      key={`destination-${option}`}
                      style={styles.dropdownItem}
                      onPress={() => {
                        setMovementDestination(option);
                        setMovementDestinationMenuVisible(false);
                        setMovementDestinationReferenceMenuVisible(false);
                        setMovementDestinationReferenceId("");
                        setMovementDestinationReferenceText("");
                        setMovementDestinationReferenceLabel(getMovementReferencePlaceholder("destino", option));
                      }}
                    >
                      <PaperText style={styles.dropdownItemText}>{option}</PaperText>
                    </Pressable>
                  ))}
                </View>
              )}
            </View>

            {movementDestination ? (
              <View style={styles.formBlock}>
                <PaperText variant="labelLarge" style={styles.formLabel}>Referencia Destino</PaperText>
                {movementDestination === "OTRO" ? (
                  <TextInput
                    mode="outlined"
                    placeholder={destinationReferencePlaceholder}
                    style={styles.inputField}
                    value={movementDestinationReferenceText}
                    onChangeText={setMovementDestinationReferenceText}
                  />
                ) : (
                  <>
                    <Pressable
                      style={[styles.selectorField, destinationReferenceOptions.length === 0 && { opacity: 0.6 }]}
                      onPress={() => {
                        if (destinationReferenceOptions.length === 0) return;
                        setMovementDestinationReferenceMenuVisible((prev) => !prev);
                      }}
                    >
                      <PaperText style={styles.selectorText}>{movementDestinationReferenceLabel}</PaperText>
                      <Icon source={movementDestinationReferenceMenuVisible ? "chevron-up" : "chevron-down"} size={18} color={theme.colors.onSurfaceVariant} />
                    </Pressable>
                    {movementDestinationReferenceMenuVisible && (
                      <View style={styles.dropdownList}>
                        {destinationReferenceOptions.length === 0 ? (
                          <View style={styles.dropdownItem}>
                            <PaperText style={styles.dropdownItemText}>No hay datos disponibles</PaperText>
                          </View>
                        ) : (
                          destinationReferenceOptions.map((option) => (
                            <Pressable
                              key={`destination-reference-${option.id}`}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setMovementDestinationReferenceId(option.id);
                                setMovementDestinationReferenceLabel(option.label);
                                setMovementDestinationReferenceMenuVisible(false);
                              }}
                            >
                              <PaperText style={styles.dropdownItemText}>{option.label}</PaperText>
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
            <PaperText variant="labelLarge" style={styles.stepLabel}>Paso 2</PaperText>
            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={styles.formLabel}>Monto</PaperText>
              <TextInput
                mode="outlined"
                placeholder="$0"
                style={styles.inputField}
                keyboardType="numeric"
                value={movementValue}
                onChangeText={setMovementValue}
              />
            </View>
          </View>

          <View style={styles.stepBlock}>
            <PaperText variant="labelLarge" style={styles.stepLabel}>Paso 3</PaperText>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={styles.formLabel}>Periodo</PaperText>
              <View style={styles.selectorField}>
                <PaperText style={styles.selectorText}>{movementPeriodLabel}</PaperText>
                <Icon source="calendar-month-outline" size={18} color={theme.colors.onSurfaceVariant} />
              </View>
            </View>

            <View style={styles.formBlock}>
              <PaperText variant="labelLarge" style={styles.formLabel}>Concepto</PaperText>
              <TextInput
                mode="outlined"
                placeholder="Ejemplo: Concepto del movimiento"
                style={styles.inputField}
                value={movementConcept}
                onChangeText={setMovementConcept}
              />
            </View>
          </View>

          <PaperText variant="labelLarge" style={styles.stepLabel}>Paso 4</PaperText>

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

    if (activeModal === "wizardInitialization") {
      const planned = (viewData?.periods ?? []).find(
        (item) => String(item.state || "").toUpperCase() === "PLANIFICADO"
      );
      const currentCycleLabel = planned
        ? String(planned.id || planned.name || "Sin ciclo PLANIFICADO")
        : "Sin ciclo PLANIFICADO";
      const members = viewData?.members ?? [];
      const existingMemberIncomes = new Set(
        (viewData?.incomes ?? []).map((income) => String(income.memberId || "")).filter(Boolean)
      );
      const pendingIncomes = members.filter((member) => {
        const memberId = String(member.id || "");
        if (existingMemberIncomes.has(memberId)) {
          return false;
        }
        const value = Number(wizardIncomeByMemberId[memberId] || "");
        return !Number.isFinite(value) || value <= 0;
      }).length;

      return (
        <>
          <View style={styles.sheetHandle} />

          <View style={styles.wizardHeaderRow}>
            <PaperText style={styles.wizardCaption}>Flujo de inicializacion</PaperText>
            <IconButton icon="close" size={18} onPress={closeModal} />
          </View>

          <PaperText variant="titleLarge" style={styles.wizardTitle}>Vamos a comenzar</PaperText>
          <PaperText style={styles.helperText}>Paso {wizardStep + 1} de 3</PaperText>

          <Card mode="elevated" style={styles.wizardCard}>
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
                  <Button
                    mode="contained"
                    style={styles.wizardPrimaryTeal}
                    contentStyle={styles.sheetButtonContent}
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
                    Ya cree el ciclo
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
                          <TextInput
                            mode="outlined"
                            placeholder="Monto ingreso"
                            style={styles.inputField}
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
                    disabled={isSavingWizardIncomes || members.length === 0 || !planned}
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

      <ScrollView contentContainerStyle={styles.content}>
        {activeTab === "inicio" && (
          <>
            <Card mode="elevated" style={[styles.summaryCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
              <Card.Content>
                <View style={styles.sectionHeaderRow}>
                  <Icon source="chart-line" size={20} color={uiColors.icon} />
                  <PaperText variant="titleMedium" style={styles.summaryTitle}>Presupuesto mensual</PaperText>
                </View>
                <PaperText variant="bodySmall" style={[styles.helperText, { color: uiColors.mutedText }]}>Control y distribucion del periodo actual.</PaperText>

                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={styles.metricLabel}>Periodo activo</PaperText>
                    <PaperText style={styles.metricValue}>{String(budgetCycle?.name || budgetCycle?.id || "Sin ciclo")}</PaperText>
                  </View>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={styles.metricLabel}>Ingreso esperado</PaperText>
                    <PaperText style={styles.metricValueStrong}>{toCurrency(expectedTotalIncome)}</PaperText>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={styles.metricLabel}>Compromisos pendientes</PaperText>
                    <PaperText style={styles.metricValue}>{pendingCommitments.length}</PaperText>
                  </View>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={styles.metricLabel}>Proximo compromiso</PaperText>
                    <PaperText style={styles.metricValue}>
                      {nextCommitment
                        ? `${String(nextCommitment.name || nextCommitment.reference || "Compromiso")} (${String(nextCommitment.endedDate || "Sin fecha")})`
                        : "Sin pendientes"}
                    </PaperText>
                  </View>
                </View>

                <View style={styles.progressHeader}>
                  <PaperText style={styles.metricLabel}>Distribuido</PaperText>
                  <PaperText style={styles.metricValue}>{toPercent(monthlyProgress)}</PaperText>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${monthlyProgress}%` }]} />
                </View>

                <View style={styles.metricsRow}>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={styles.metricLabel}>Ahorros</PaperText>
                    <PaperText style={styles.metricValueStrong}>{toCurrency(savingsTotal)}</PaperText>
                  </View>
                  <View style={[styles.metricBox, { backgroundColor: uiColors.metricBackground, borderColor: uiColors.metricBorder }]}>
                    <PaperText style={styles.metricLabel}>Gastos</PaperText>
                    <PaperText style={styles.metricValueStrong}>{toCurrency(expensesTotal)}</PaperText>
                  </View>
                </View>
                <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>Total asignado: {toCurrency(distributedTotal)}</PaperText>
              </Card.Content>
            </Card>

            <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
              <Card.Content>
                <View style={styles.sectionHeaderRow}>
                  <Icon source="account-group" size={20} color={uiColors.icon} />
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
                      <View key={memberId || `member-${index}`} style={styles.memberRow}>
                        <View style={styles.memberInfoRow}>
                          <View style={[styles.memberIconWrap, { backgroundColor: uiColors.memberIconBackground }]}>
                            <Icon source="account-circle" size={18} color={uiColors.icon} />
                          </View>
                          <View>
                          <PaperText style={styles.memberName}>{String(member.name || `Miembro ${index + 1}`)}</PaperText>
                          <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>Aporte a bolsas: {toCurrency(pocketsValue)}</PaperText>
                          </View>
                        </View>
                        <PaperText style={[hasContribution ? styles.memberStatusOk : styles.memberStatusPending, { color: hasContribution ? uiColors.successText : uiColors.warningText }]}>
                          {hasContribution ? "Completo" : "Pendiente"}
                        </PaperText>
                      </View>
                    );
                  })
                )}
              </Card.Content>
            </Card>

            <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
              <Card.Content>
                <View style={styles.sectionHeaderRow}>
                  <Icon source="file-document-alert-outline" size={20} color={uiColors.icon} />
                  <PaperText variant="titleMedium" style={styles.summaryTitle}>Compromisos pendientes</PaperText>
                </View>
                <PaperText variant="bodySmall" style={[styles.helperText, { color: uiColors.mutedText }]}>Total pendiente: {toCurrency(pendingCommitmentsTotal)}</PaperText>
                {pendingCommitments.length === 0 ? (
                  <PaperText style={[styles.helperText, { color: uiColors.mutedText }]}>No hay compromisos pendientes en este momento.</PaperText>
                ) : (
                  pendingCommitments.slice(0, 5).map((item, index) => (
                    <View key={String(item.id || `pending-${index}`)} style={styles.entityRow}>
                      <View style={styles.pendingInfo}>
                        <PaperText style={styles.pendingName}>{String(item.name || item.reference || `Compromiso ${index + 1}`)}</PaperText>
                        <PaperText style={styles.helperText}>Fecha: {String(item.endedDate || "Sin fecha")}</PaperText>
                      </View>
                      <PaperText style={styles.pendingAmount}>{toCurrency(Number(item.estimatedValue || 0))}</PaperText>
                    </View>
                  ))
                )}
              </Card.Content>
            </Card>
          </>
        )}

        {activeTab === "bolsas" && (
            <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <Icon source="wallet-outline" size={20} color={uiColors.icon} />
                <PaperText variant="titleMedium" style={styles.summaryTitle}>Bolsas</PaperText>
              </View>
              {(data?.templates ?? []).map((template) => (
                <Pressable key={`bag-${template}`} style={styles.entityRow} onPress={() => openModal("detailBag")}> 
                  <PaperText variant="bodyMedium">{template}</PaperText>
                  <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </Pressable>
              ))}
              <Pressable style={styles.entityRow} onPress={() => openModal("detailCommitment")}> 
                <PaperText variant="bodyMedium">Detalle compromiso</PaperText>
                <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </Card.Content>
          </Card>
        )}

        {activeTab === "movimientos" && (
          <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <Icon source="swap-horizontal" size={20} color={uiColors.icon} />
                <PaperText variant="titleMedium" style={styles.summaryTitle}>Movimientos</PaperText>
              </View>
              <Pressable style={styles.entityRow} onPress={() => openModal("detailMember")}> 
                <PaperText variant="bodyMedium">Detalle miembro</PaperText>
                <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              <Pressable style={styles.entityRow} onPress={() => openModal("formRegisterMovement")}> 
                <PaperText variant="bodyMedium">Registrar movimiento</PaperText>
                <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
            </Card.Content>
          </Card>
        )}

        {activeTab === "historial" && (
          <Card mode="elevated" style={[styles.templatesCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder }]}>
            <Card.Content>
              <View style={styles.sectionHeaderRow}>
                <Icon source="history" size={20} color={uiColors.icon} />
                <PaperText variant="titleMedium" style={styles.summaryTitle}>Historial</PaperText>
              </View>
              <Pressable style={styles.entityRow} onPress={() => openModal("detailPeriod")}> 
                <PaperText variant="bodyMedium">Detalle periodo</PaperText>
                <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
              </Pressable>
              <PaperText variant="bodySmall" style={styles.helperText}>Sin acciones rapidas para esta vista.</PaperText>
            </Card.Content>
          </Card>
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
            activeTab === "historial" && styles.plusButtonDisabled,
          ]}
          onPress={activeTab === "historial" ? undefined : () => openModal("quickActions")}
          disabled={activeTab === "historial"}
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
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface }]}> 
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
    detailCommitment: "Detalle compromiso",
    detailPeriod: "Detalle periodo",
    formEditIncome: "Editar ingreso",
    formNewMember: "Nuevo miembro",
    formNewPeriod: "Crear periodo",
    formConfigureBag: "Configurar bolsa",
    formNewCommitment: "Crear compromiso",
    formRegisterBalance: "Registrar saldo",
    formRegisterMovement: "Registrar movimiento",
    wizardInitialization: "Inicializacion",
  };

  return map[activeModal];
}

function quickActionPillStyle(target: ModalKey) {
  switch (target) {
    case "formNewMember":
      return styles.optionPillGreen;
    case "formNewPeriod":
      return styles.optionPillBlue;
    case "formConfigureBag":
      return styles.optionPillTeal;
    case "formNewCommitment":
      return styles.optionPillOrange;
    case "formRegisterBalance":
      return styles.optionPillTeal;
    case "formRegisterMovement":
      return styles.optionPillIndigo;
    default:
      return styles.optionPillBlue;
  }
}

function quickActionTextStyle(target: ModalKey) {
  switch (target) {
    case "formNewMember":
      return styles.optionPillTextGreen;
    case "formNewPeriod":
      return styles.optionPillTextBlue;
    case "formConfigureBag":
      return styles.optionPillTextTeal;
    case "formNewCommitment":
      return styles.optionPillTextOrange;
    case "formRegisterBalance":
      return styles.optionPillTextTeal;
    case "formRegisterMovement":
      return styles.optionPillTextIndigo;
    default:
      return styles.optionPillTextBlue;
  }
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
    color: "#0F172A",
    fontWeight: "700",
    fontSize: 13,
  },
  metricValueStrong: {
    color: "#0B4A6F",
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
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
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
    gap: 8,
    flex: 1,
  },
  memberIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    fontWeight: "700",
    color: "#0F172A",
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
  pendingName: {
    fontWeight: "700",
    color: "#0F172A",
  },
  pendingAmount: {
    fontWeight: "800",
    color: "#1E293B",
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
  plusButtonDisabled: {
    opacity: 0.45,
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
  optionList: {
    gap: 10,
  },
  optionPill: {
    minHeight: 50,
    width: "100%",
    borderRadius: 25,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  optionPillText: {
    fontWeight: "700",
    color: "#111827",
  },
  optionPillGreen: {
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
  },
  optionPillBlue: {
    backgroundColor: "#EFF6FF",
    borderColor: "#1E3A8A",
  },
  optionPillTeal: {
    backgroundColor: "#F0FDFA",
    borderColor: "#14B8A6",
  },
  optionPillOrange: {
    backgroundColor: "#FFF7ED",
    borderColor: "#F97316",
  },
  optionPillIndigo: {
    backgroundColor: "#EEF2FF",
    borderColor: "#6366F1",
  },
  optionPillTextGreen: {
    color: "#059669",
  },
  optionPillTextBlue: {
    color: "#1E3A8A",
  },
  optionPillTextTeal: {
    color: "#0F766E",
  },
  optionPillTextOrange: {
    color: "#EA580C",
  },
  optionPillTextIndigo: {
    color: "#4338CA",
  },
  helperText: {
    color: "#64748B",
  },
  wizardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wizardCaption: {
    color: "#059669",
    fontWeight: "700",
    fontSize: 13,
  },
  wizardTitle: {
    fontWeight: "800",
    color: "#111827",
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
    color: "#0F172A",
    fontWeight: "800",
  },
  wizardStatusText: {
    marginTop: 8,
    marginBottom: 10,
    color: "#334155",
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
  stepBlock: {
    gap: 10,
  },
  stepLabel: {
    fontWeight: "800",
    color: "#111827",
  },
  formLabel: {
    fontWeight: "700",
    color: "#111827",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  checkboxText: {
    fontWeight: "600",
    color: "#111827",
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
  selectorText: {
    color: "#111827",
    fontWeight: "500",
  },
  dropdownList: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  dropdownItem: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
  },
  dropdownItemText: {
    color: "#111827",
    fontWeight: "600",
  },
  dropdownItemDisabled: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#EEF1F4",
    backgroundColor: "#F8FAFC",
  },
  dropdownItemDisabledText: {
    color: "#94A3B8",
    fontWeight: "600",
  },
  errorText: {
    color: "#DC2626",
  },
});

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
