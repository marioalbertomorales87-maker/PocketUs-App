import { StatusBar } from "expo-status-bar";
import { StyleSheet, useColorScheme, View } from "react-native";
import { useCallback, useState } from "react";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import HomeNavigator from "./navigators/HomeNavigator";
import DashboardScreen from "./screens/DashboardScreen";
import LoginScreen from "./screens/LoginScreen";
import SplashScreen from "./screens/SplashScreen";
import { getMaterialTheme } from "./theme/materialTheme";
import {
  AuthenticatedUser,
  BootstrapData,
  FamilyWorkspace,
  getV1Bootstrap,
} from "./services/AuthService";

type AppPhase = "splash" | "login" | "families" | "dashboard";

export default function App() {
  const colorScheme = useColorScheme();
  const materialTheme = getMaterialTheme(colorScheme === "dark" ? "dark" : "light");
  const [phase, setPhase] = useState<AppPhase>("splash");
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [bootstrap, setBootstrap] = useState<BootstrapData | null>(null);
  const [workspace, setWorkspace] = useState<FamilyWorkspace | null>(null);
  const [isRefreshingFamilies, setIsRefreshingFamilies] = useState(false);

  // Equivalente inicial de showAppShell.
  const showAppShell = useCallback(() => {
    setPhase("login");
  }, []);

  // Equivalente inicial de loginWithGoogle + getV1Bootstrap.
  const onLogin = useCallback(
    (payload: { user: AuthenticatedUser; bootstrap: BootstrapData }) => {
      setUser(payload.user);
      setBootstrap(payload.bootstrap);
      setPhase("families");
    },
    []
  );

  // Equivalente inicial de enterFamily + activateFamilyWorkspace.
  const onWorkspaceReady = useCallback((nextWorkspace: FamilyWorkspace) => {
    setWorkspace(nextWorkspace);
    setPhase("dashboard");
  }, []);

  const goBackToFamilies = useCallback(() => {
    setPhase("families");
    setIsRefreshingFamilies(true);

    if (!user) {
      setIsRefreshingFamilies(false);
      setPhase("login");
      return;
    }

    void (async () => {
      try {
        const refreshed = await getV1Bootstrap(user);
        setBootstrap(refreshed);
      } catch (error) {
        console.error("goBackToFamilies refresh error:", error);
      } finally {
        setIsRefreshingFamilies(false);
      }
    })();
  }, [user]);

  return (
    <PaperProvider theme={materialTheme}>
      <SafeAreaProvider>
        <View style={[styles.container, { backgroundColor: materialTheme.colors.background }]}>
          {phase === "splash" && <SplashScreen onFinish={showAppShell} />}

          {phase === "login" && <LoginScreen onLogin={onLogin} />}

          {phase === "families" && user && bootstrap && (
            <HomeNavigator
              user={user}
              families={bootstrap.families}
              loadingFamilies={isRefreshingFamilies}
              onWorkspaceReady={onWorkspaceReady}
            />
          )}

          {phase === "dashboard" && workspace && (
            <DashboardScreen
              workspace={workspace}
              currentUserEmail={String(user?.email || "")}
              onBackToFamilies={goBackToFamilies}
            />
          )}

          <StatusBar style={materialTheme.dark ? "light" : "dark"} />
        </View>
      </SafeAreaProvider>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
