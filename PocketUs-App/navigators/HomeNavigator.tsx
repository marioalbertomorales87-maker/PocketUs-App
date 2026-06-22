import { useEffect, useState } from "react";
import FamiliesScreen from "../screens/FamiliesScreen";
import {
  AuthenticatedUser,
  createFamilyTemplate,
  deleteFamilyTemplate,
  enterFamily,
  getV1Bootstrap,
  FamilySummary,
  FamilyWorkspace,
  joinExistingFamily,
} from "../services/AuthService";
import { getErrorMessage } from "../utils/errorFeedback";
import { SUCCESS_MESSAGES } from "../utils/successFeedback";

type HomeNavigatorProps = {
  user: AuthenticatedUser;
  families: FamilySummary[];
  loadingFamilies: boolean;
  onWorkspaceReady: (workspace: FamilyWorkspace) => void;
};

export default function HomeNavigator({
  user,
  families,
  loadingFamilies,
  onWorkspaceReady,
}: HomeNavigatorProps) {
  const [localFamilies, setLocalFamilies] = useState<FamilySummary[]>(families);
  const [loadingFamilyId, setLoadingFamilyId] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null);
  const [existingFamilyId, setExistingFamilyId] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("error");

  const showFeedback = (message: string, type: "success" | "error" = "error") => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackVisible(true);
  };

  useEffect(() => {
    setLocalFamilies(families);
  }, [families]);

  const refreshFamilies = async () => {
    const bootstrap = await getV1Bootstrap(user);
    setLocalFamilies(bootstrap.families);
    return bootstrap.families;
  };

  // Equivalente de activateFamilyWorkspace de GAS.
  const activateFamilyWorkspace = async (familyId: string) => {
    setLoadingFamilyId(familyId);
    try {
      const workspace = await enterFamily(user, familyId);
      showFeedback(SUCCESS_MESSAGES.familyEntered, "success");
      onWorkspaceReady(workspace);
    } catch (error) {
      showFeedback(
        getErrorMessage(error, "No se pudo ingresar a la familia.", {
          FAMILY_NOT_FOUND: "La familia seleccionada ya no existe o no esta disponible.",
        })
      );
    } finally {
      setLoadingFamilyId(null);
    }
  };

  const handleCreateTemplate = async (templateName: string) => {
    setLoadingAction(true);
    try {
      const created = await createFamilyTemplate(user, templateName);
      await refreshFamilies();
      showFeedback(SUCCESS_MESSAGES.familyCreated, "success");
      await activateFamilyWorkspace(created.id);
    } catch (error) {
      showFeedback(getErrorMessage(error, "No se pudo crear la plantilla."));
    } finally {
      setLoadingAction(false);
    }
  };

  const handleJoinExistingFamily = async () => {
    const familyId = existingFamilyId.trim();
    if (!familyId) {
      throw new Error("FAMILY_ID_REQUIRED");
    }

    setLoadingAction(true);
    try {
      const joined = await joinExistingFamily(user, familyId);
      setExistingFamilyId("");
      await refreshFamilies();
      showFeedback(SUCCESS_MESSAGES.familyJoined, "success");
      await activateFamilyWorkspace(joined.id);
    } catch (error) {
      showFeedback(getErrorMessage(error, "No se pudo entrar a la familia."));
      throw error;
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteFamily = async (familyId: string) => {
    setDeletingFamilyId(familyId);
    try {
      await deleteFamilyTemplate(user, familyId);
      await refreshFamilies();
      showFeedback(SUCCESS_MESSAGES.familyDeleted, "success");
    } catch (error) {
      showFeedback(getErrorMessage(error, "No se pudo eliminar la plantilla."));
    } finally {
      setDeletingFamilyId(null);
    }
  };

  return (
    <FamiliesScreen
      families={localFamilies}
      loadingFamilies={loadingFamilies}
      loadingFamilyId={loadingFamilyId}
      loadingAction={loadingAction}
      deletingFamilyId={deletingFamilyId}
      existingFamilyId={existingFamilyId}
      onExistingFamilyIdChange={setExistingFamilyId}
      onCreateTemplate={handleCreateTemplate}
      onJoinExistingFamily={handleJoinExistingFamily}
      onEnterFamily={activateFamilyWorkspace}
      onDeleteFamily={handleDeleteFamily}
      feedbackMessage={feedbackMessage}
      feedbackVisible={feedbackVisible}
      feedbackType={feedbackType}
      onDismissFeedback={() => setFeedbackVisible(false)}
    />
  );
}
