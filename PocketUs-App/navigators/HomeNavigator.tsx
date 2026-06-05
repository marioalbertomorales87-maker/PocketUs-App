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
      onWorkspaceReady(workspace);
    } catch (error) {
      console.error("activateFamilyWorkspace error:", error);
    } finally {
      setLoadingFamilyId(null);
    }
  };

  const handleCreateTemplate = async (templateName: string) => {
    setLoadingAction(true);
    try {
      const created = await createFamilyTemplate(user, templateName);
      await refreshFamilies();
      await activateFamilyWorkspace(created.id);
    } catch (error) {
      console.error("handleCreateTemplate error:", error);
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
      await activateFamilyWorkspace(joined.id);
    } catch (error) {
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
    } catch (error) {
      console.error("handleDeleteFamily error:", error);
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
    />
  );
}
