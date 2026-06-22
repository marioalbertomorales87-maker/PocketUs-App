import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Snackbar,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import TopLoadingBar from "../components/TopLoadingBar";
import { FamilySummary } from "../services/AuthService";

type FamiliesScreenProps = {
  families: FamilySummary[];
  loadingFamilies: boolean;
  loadingFamilyId: string | null;
  loadingAction: boolean;
  deletingFamilyId: string | null;
  existingFamilyId: string;
  onExistingFamilyIdChange: (value: string) => void;
  onCreateTemplate: (templateName: string) => void;
  onJoinExistingFamily: () => Promise<void>;
  onEnterFamily: (familyId: string) => void;
  onDeleteFamily: (familyId: string) => void;
  feedbackMessage: string;
  feedbackVisible: boolean;
  feedbackType: "success" | "error";
  onDismissFeedback: () => void;
};

export default function FamiliesScreen({
  families,
  loadingFamilies,
  loadingFamilyId,
  loadingAction,
  deletingFamilyId,
  existingFamilyId,
  onExistingFamilyIdChange,
  onCreateTemplate,
  onJoinExistingFamily,
  onEnterFamily,
  onDeleteFamily,
  feedbackMessage,
  feedbackVisible,
  feedbackType,
  onDismissFeedback,
}: FamiliesScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const tokens = theme.dark
    ? {
        background: "#07100D",
        surface: "#101A16",
        surfaceElevated: "#15231D",
        surfaceGlass: "rgba(18, 31, 26, 0.78)",
        border: "rgba(255,255,255,0.10)",
        textPrimary: "#F4FBF8",
        textSecondary: "#B8C7C0",
        textMuted: "#7E9088",
        shadow: "rgba(0,0,0,0.35)",
        overlay: "rgba(5, 10, 8, 0.72)",
      }
    : {
        background: "#F3F7F5",
        surface: "#FFFFFF",
        surfaceElevated: "#F8FBFA",
        surfaceGlass: "rgba(255,255,255,0.82)",
        border: "rgba(20,35,30,0.10)",
        textPrimary: "#10201A",
        textSecondary: "#52645C",
        textMuted: "#829189",
        shadow: "rgba(10, 20, 16, 0.18)",
        overlay: "rgba(16, 24, 20, 0.24)",
      };
  const uiColors = {
    pageBackground: tokens.background,
    icon: "#22C55E",
    cardBackground: tokens.surfaceGlass,
    cardBorder: tokens.border,
    mutedText: tokens.textMuted,
    modalBackground: tokens.surfaceGlass,
    closeBorder: tokens.border,
    destructiveBackground: "rgba(127, 29, 29, 0.28)",
    textPrimary: tokens.textPrimary,
    inputBorder: tokens.border,
    inputBorderActive: "#22C55E",
    inputBackground: tokens.surfaceElevated,
    shadow: tokens.shadow,
    overlay: tokens.overlay,
    successFeedback: "rgba(16, 185, 129, 0.22)",
    errorFeedback: "rgba(239, 68, 68, 0.22)",
  };
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showJoinErrorModal, setShowJoinErrorModal] = useState(false);
  const [joinErrorMessage, setJoinErrorMessage] = useState("");
  const [pendingDeleteFamilyId, setPendingDeleteFamilyId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState("");
  const trimmedExistingFamilyId = existingFamilyId.trim();
  const isJoinDisabled = loadingAction || !trimmedExistingFamilyId;
  const isLoading =
    loadingFamilies || loadingAction || Boolean(loadingFamilyId) || Boolean(deletingFamilyId);

  const confirmCreateTemplate = () => {
    const name = templateName.trim();
    if (!name) return;
    setShowCreateModal(false);
    onCreateTemplate(name);
    setTemplateName("");
  };

  const requestDeleteFamily = (familyId: string) => {
    setPendingDeleteFamilyId(familyId);
    setShowDeleteModal(true);
  };

  const confirmDeleteFamily = () => {
    if (!pendingDeleteFamilyId) return;
    setShowDeleteModal(false);
    onDeleteFamily(pendingDeleteFamilyId);
    setPendingDeleteFamilyId(null);
  };

  const handleJoinByFamilyId = async () => {
    if (!trimmedExistingFamilyId) {
      setJoinErrorMessage("Debes ingresar un Family ID para continuar.");
      setShowJoinErrorModal(true);
      return;
    }

    try {
      await onJoinExistingFamily();
    } catch (error) {
      const code = error instanceof Error ? error.message : "UNKNOWN";

      if (code === "FAMILY_NOT_FOUND") {
        setJoinErrorMessage("No existe una familia con ese Family ID.");
      } else if (code === "FAMILY_ID_REQUIRED") {
        setJoinErrorMessage("Debes ingresar un Family ID para continuar.");
      } else {
        setJoinErrorMessage("No fue posible entrar a la familia. Intenta nuevamente.");
      }

      setShowJoinErrorModal(true);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: uiColors.pageBackground }]}> 
      <TopLoadingBar visible={isLoading} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.stack}>
          <Card mode="elevated" style={[styles.actionsCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder, shadowColor: uiColors.shadow }]}>
            <Card.Content style={styles.actionsCardContent}>
              <View style={styles.sectionHeaderRow}>
                <Icon source="shape-outline" size={20} color={uiColors.icon} />
                <Text variant="headlineSmall" style={[styles.title, { color: uiColors.textPrimary }]}>¿Qué deseas hacer?</Text>
              </View>
              <Text variant="bodyMedium" style={[styles.description, { color: uiColors.mutedText }]}>
                Crea una plantilla nueva o únete a una existente.
              </Text>

              <Button
                mode="contained"
                icon="plus-circle-outline"
                style={styles.primaryButton}
                contentStyle={styles.buttonContent}
                disabled={loadingAction}
                onPress={() => setShowCreateModal(true)}
              >
                Crear nueva plantilla
              </Button>

              <View style={styles.joinBlock}>
                <Text variant="labelLarge" style={[styles.fieldLabel, { color: uiColors.textPrimary }]}>Family ID existente</Text>
                <TextInput
                  value={existingFamilyId}
                  onChangeText={onExistingFamilyIdChange}
                  placeholder="Ejemplo: UUID de familia"
                  placeholderTextColor={uiColors.mutedText}
                  textColor={uiColors.textPrimary}
                  outlineColor={uiColors.inputBorder}
                  activeOutlineColor={uiColors.inputBorderActive}
                  autoCapitalize="none"
                  autoCorrect={false}
                  mode="outlined"
                  style={[styles.input, { backgroundColor: uiColors.inputBackground }]}
                />
                <Button
                  mode="contained-tonal"
                  icon="login-variant"
                  style={styles.secondaryButton}
                  contentStyle={styles.buttonContent}
                  disabled={isJoinDisabled}
                  onPress={handleJoinByFamilyId}
                >
                  Ingresar a plantilla existente
                </Button>
              </View>
            </Card.Content>
          </Card>

          {!loadingFamilies && (
            <>
              <Card mode="elevated" style={[styles.actionsCard, { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder, shadowColor: uiColors.shadow }]}>
                <Card.Content style={styles.actionsCardContent}>
                  <View style={styles.sectionHeaderRow}>
                    <Icon source="account-group" size={20} color={uiColors.icon} />
                    <Text variant="headlineSmall" style={[styles.title, { color: uiColors.textPrimary }]}>Tus familias</Text>
                  </View>

                  <View style={styles.list}>
                    {families.map((family) => {
                      const isLoading = loadingFamilyId === family.id;
                      const isDeleting = deletingFamilyId === family.id;

                      return (
                        <Card
                          key={family.id}
                          mode="elevated"
                          style={[
                            styles.card,
                            { backgroundColor: uiColors.cardBackground, borderColor: uiColors.cardBorder, shadowColor: uiColors.shadow },
                            (isLoading || isDeleting) && styles.cardDisabled,
                          ]}
                        >
                          <Card.Content style={styles.familyCardContent}>
                            <View style={styles.familyTopRow}>
                              <Text variant="titleMedium" style={[styles.familyName, { color: uiColors.textPrimary }]}>{family.name}</Text>
                              <View style={styles.familyIdBadge}>
                                <Text variant="labelSmall" style={styles.familyIdText} numberOfLines={1}>
                                  {family.id}
                                </Text>
                              </View>
                            </View>

                            <Text variant="labelMedium" style={[styles.familyRole, { color: uiColors.mutedText }]}>
                              Rol: {family.role === "owner" ? "CREADOR" : "MIEMBRO"}
                            </Text>

                            <Button
                              mode="contained-tonal"
                              icon="door-open"
                              style={styles.enterButton}
                              contentStyle={styles.buttonContent}
                              disabled={Boolean(loadingFamilyId) || Boolean(deletingFamilyId)}
                              onPress={() => onEnterFamily(family.id)}
                            >
                              {isLoading ? "Ingresando..." : "Ingresar"}
                            </Button>

                            {family.role === "owner" ? (
                              <Button
                                mode="outlined"
                                icon="trash-can-outline"
                                textColor={theme.colors.error}
                                style={[styles.deleteFamilyButton, { backgroundColor: uiColors.destructiveBackground }]}
                                contentStyle={styles.buttonContent}
                                disabled={Boolean(loadingFamilyId) || Boolean(deletingFamilyId)}
                                onPress={() => requestDeleteFamily(family.id)}
                              >
                                {isDeleting ? "Eliminando..." : "Eliminar plantilla"}
                              </Button>
                            ) : (
                              <View />
                            )}
                          </Card.Content>
                        </Card>
                      );
                    })}
                  </View>
                </Card.Content>
              </Card>
            </>
          )}
        </View>
      </ScrollView>

      <Modal visible={showCreateModal} transparent animationType="slide" onRequestClose={() => setShowCreateModal(false)}>
        <KeyboardAvoidingView
          style={[styles.createModalOverlay, { backgroundColor: uiColors.overlay, paddingBottom: Math.max(insets.bottom, 18) + 14 }]}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
        >
            <View style={[styles.createModalCard, { backgroundColor: uiColors.modalBackground, borderColor: uiColors.cardBorder, shadowColor: uiColors.shadow }]}> 
            <View style={styles.createModalHandle} />

            <View style={styles.createModalHeaderRow}>
              <Text variant="titleLarge" style={[styles.createModalTitle, { color: uiColors.textPrimary }]}>Nueva plantilla</Text>
              <IconButton
                icon="close"
                size={18}
                onPress={() => setShowCreateModal(false)}
                style={[styles.createModalCloseButton, { borderColor: uiColors.closeBorder }]}
              />
            </View>

            <View style={styles.createModalFieldBlock}>
              <Text variant="labelLarge" style={[styles.createModalLabel, { color: uiColors.textPrimary }]}>Nombre de familia</Text>
              <TextInput
                value={templateName}
                onChangeText={setTemplateName}
                placeholder="Ejemplo: Nombre de familia"
                placeholderTextColor={uiColors.mutedText}
                textColor={uiColors.textPrimary}
                outlineColor={uiColors.inputBorder}
                activeOutlineColor={uiColors.inputBorderActive}
                mode="outlined"
                style={[styles.createModalInput, { backgroundColor: uiColors.inputBackground }]}
              />
            </View>

            <Button
              mode="contained"
              style={styles.createModalPrimaryButton}
              contentStyle={styles.buttonContent}
              disabled={!templateName.trim()}
              onPress={confirmCreateTemplate}
            >
              Crear plantilla
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={showDeleteModal} transparent animationType="slide" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={[styles.createModalOverlay, { backgroundColor: uiColors.overlay, paddingBottom: Math.max(insets.bottom, 18) + 14 }] }>
          <View style={[styles.createModalCard, { backgroundColor: uiColors.modalBackground, borderColor: uiColors.cardBorder, shadowColor: uiColors.shadow }]}> 
            <View style={styles.createModalHandle} />
            <View style={styles.createModalHeaderRow}>
              <Text variant="titleLarge" style={[styles.createModalTitle, { color: uiColors.textPrimary }]}>Eliminar plantilla</Text>
              <IconButton
                icon="close"
                size={18}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPendingDeleteFamilyId(null);
                }}
                style={[styles.createModalCloseButton, { borderColor: uiColors.closeBorder }]}
              />
            </View>

            <Text variant="bodyMedium" style={[styles.modalDescription, { color: uiColors.mutedText }]}>
              Esta accion eliminara la familia y su informacion. Deseas continuar?
            </Text>

            <View style={styles.modalActionsRow}>
              <Button
                mode="outlined"
                style={styles.modalActionButton}
                onPress={() => {
                  setShowDeleteModal(false);
                  setPendingDeleteFamilyId(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                mode="contained"
                textColor="#FFFFFF"
                buttonColor="#DC2626"
                style={styles.modalActionButton}
                disabled={!pendingDeleteFamilyId}
                onPress={confirmDeleteFamily}
              >
                Eliminar
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showJoinErrorModal} transparent animationType="slide" onRequestClose={() => setShowJoinErrorModal(false)}>
        <View style={[styles.createModalOverlay, { backgroundColor: uiColors.overlay, paddingBottom: Math.max(insets.bottom, 18) + 14 }] }>
          <View style={[styles.createModalCard, { backgroundColor: uiColors.modalBackground, borderColor: uiColors.cardBorder, shadowColor: uiColors.shadow }]}> 
            <View style={styles.createModalHandle} />
            <View style={styles.createModalHeaderRow}>
              <Text variant="titleLarge" style={[styles.createModalTitle, { color: uiColors.textPrimary }]}>No se pudo entrar</Text>
              <IconButton
                icon="close"
                size={18}
                onPress={() => setShowJoinErrorModal(false)}
                style={[styles.createModalCloseButton, { borderColor: uiColors.closeBorder }]}
              />
            </View>

            <Text variant="bodyMedium" style={[styles.modalDescription, { color: uiColors.mutedText }]}>{joinErrorMessage}</Text>

            <Button mode="contained" style={styles.createModalPrimaryButton} contentStyle={styles.buttonContent} onPress={() => setShowJoinErrorModal(false)}>
              Entendido
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar
        visible={feedbackVisible}
        onDismiss={onDismissFeedback}
        duration={3500}
        style={{
          backgroundColor: feedbackType === "success" ? uiColors.successFeedback : uiColors.errorFeedback,
          borderWidth: 1,
          borderColor: feedbackType === "success" ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)",
        }}
        theme={{
          colors: {
            inverseOnSurface: uiColors.textPrimary,
          },
        }}
      >
        {feedbackMessage}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
    paddingHorizontal: 12,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20,
  },
  stack: {
    gap: 15,
  },
  title: {
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  description: {
    marginTop: 8,
    marginBottom: 14,
    color: "#5B6670",
  },
  actionsCard: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    backgroundColor: "rgba(20, 28, 43, 0.84)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  actionsCardContent: {
    padding: 18,
  },
  primaryButton: {
    borderRadius: 12,
    alignSelf: "stretch",
  },
  buttonContent: {
    minHeight: 46,
  },
  joinBlock: {
    marginTop: 12,
  },
  fieldLabel: {
    marginBottom: 8,
    fontWeight: "700",
  },
  input: {
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  secondaryButton: {
    marginTop: 10,
    borderRadius: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  modalDescription: {
    lineHeight: 20,
  },
  dialogInput: {
    backgroundColor: "transparent",
  },
  createModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  createModalCard: {
    backgroundColor: "transparent",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.24)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  createModalHandle: {
    alignSelf: "center",
    width: 54,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#D1D5DB",
    marginBottom: 10,
  },
  createModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  createModalTitle: {
    fontWeight: "800",
    color: "#E5ECF6",
  },
  createModalCloseButton: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 999,
  },
  createModalFieldBlock: {
    marginTop: 8,
    marginBottom: 12,
    gap: 8,
  },
  createModalLabel: {
    fontWeight: "700",
    color: "#E5ECF6",
  },
  createModalInput: {
    backgroundColor: "transparent",
    borderRadius: 12,
  },
  createModalPrimaryButton: {
    borderRadius: 14,
    backgroundColor: "#10B981",
  },
  subtitle: {
    marginTop: 16,
    fontWeight: "700",
  },
  list: {
    marginTop: 12,
    gap: 12,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.2)",
    backgroundColor: "transparent",
    shadowColor: "#0F172A",
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  familyCardContent: {
    gap: 10,
  },
  familyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardDisabled: {
    opacity: 0.7,
  },
  familyName: {
    fontWeight: "700",
    flex: 1,
  },
  familyIdBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.85)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    maxWidth: "48%",
  },
  familyIdText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  familyRole: {
    fontWeight: "700",
    color: "#9CAFC8",
  },
  enterButton: {
    borderRadius: 10,
    alignSelf: "stretch",
  },
  deleteFamilyButton: {
    borderRadius: 10,
    alignSelf: "stretch",
    borderColor: "rgba(239, 68, 68, 0.7)",
    backgroundColor: "rgba(127, 29, 29, 0.28)",
  },
  modalActionsRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  modalActionButton: {
    flex: 1,
    borderRadius: 12,
  },
});
