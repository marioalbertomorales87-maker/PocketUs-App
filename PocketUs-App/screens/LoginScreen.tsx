import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Snackbar, Surface, Text, useTheme } from "react-native-paper";
import Svg, { Path } from "react-native-svg";
import { TopLoadingBar } from "../components";
import { getErrorMessage } from "../utils/errorFeedback";
import { SUCCESS_MESSAGES } from "../utils/successFeedback";
import {
  AuthenticatedUser,
  BootstrapData,
  getV1Bootstrap,
  loginWithGoogle,
} from "../services/AuthService";

type LoginScreenProps = {
  onLogin: (payload: { user: AuthenticatedUser; bootstrap: BootstrapData }) => void;
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const theme = useTheme();
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
    glassBackground: tokens.surfaceGlass,
    glassBorder: tokens.border,
    textPrimary: tokens.textPrimary,
    textMuted: tokens.textMuted,
    shadow: tokens.shadow,
    actionGlow: "#22C55E",
    successFeedback: "rgba(16, 185, 129, 0.22)",
    errorFeedback: "rgba(239, 68, 68, 0.22)",
  };
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("error");

  const showFeedback = (message: string, type: "success" | "error" = "error") => {
    setFeedbackType(type);
    setFeedbackMessage(message);
    setFeedbackVisible(true);
  };

  const handleLogin = async () => {
    setLoading(true);

    try {
      const user = await loginWithGoogle();
      const bootstrap = await getV1Bootstrap(user);
      showFeedback(SUCCESS_MESSAGES.login, "success");
      onLogin({ user, bootstrap });
    } catch (error: unknown) {
      showFeedback(
        getErrorMessage(error, "No se pudo iniciar sesion con Google. Intenta nuevamente.", {
          LOGIN_CANCELLED: "Inicio de sesion cancelado.",
          LOGIN_IN_PROGRESS: "El inicio de sesion ya esta en progreso.",
          PLAY_SERVICES_NOT_AVAILABLE: "Google Play Services no esta disponible en este dispositivo.",
        })
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: uiColors.pageBackground }]}>
      <TopLoadingBar visible={loading} />

      <Surface style={[styles.welcomeSection, { backgroundColor: uiColors.glassBackground, borderColor: uiColors.glassBorder, shadowColor: uiColors.shadow }]} elevation={3}>
        <View style={styles.logoWrapper}>
          <Image
            source={require("../assets/images/icon-512.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text variant="headlineMedium" style={[styles.title, { color: uiColors.textPrimary }]}>Bienvenido a PocketUs</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: uiColors.textMuted }]}>Organiza tus bolsas con una vista financiera clara y moderna</Text>
      </Surface>

      <Button
        mode="contained"
        icon={() => (
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M23.766 12.276c0-.815-.067-1.636-.211-2.44H12.24v4.621h6.482a5.54 5.54 0 0 1-2.4 3.637v3h3.87c2.273-2.092 3.573-5.178 3.573-8.818Z"
              fill="#4285F4"
            />
            <Path
              d="M12.24 24c3.236 0 5.965-1.062 7.954-2.906l-3.87-3c-1.076.732-2.45 1.147-4.084 1.147-3.133 0-5.792-2.114-6.742-4.96H1.505v3.09A12.008 12.008 0 0 0 12.24 24Z"
              fill="#34A853"
            />
            <Path
              d="M5.498 14.281A7.206 7.206 0 0 1 5.125 12c0-.798.138-1.573.373-2.281V6.628H1.505A12.01 12.01 0 0 0 0 12c0 1.933.463 3.76 1.505 5.372l3.993-3.09Z"
              fill="#FBBC05"
            />
            <Path
              d="M12.24 4.759c1.72 0 3.255.59 4.474 1.746l3.33-3.33C18.2 1.46 15.477 0 12.24 0A12.008 12.008 0 0 0 1.505 6.628l3.993 3.09c.95-2.846 3.61-4.959 6.742-4.959Z"
              fill="#EA4335"
            />
          </Svg>
        )}
        contentStyle={styles.googleButtonContent}
        style={[styles.googleButton, { backgroundColor: uiColors.actionGlow, shadowColor: uiColors.shadow }]}
        disabled={loading}
        onPress={handleLogin}
      >
        {loading ? "Cargando..." : "Continuar con Google"}
      </Button>

      <Snackbar
        visible={feedbackVisible}
        onDismiss={() => setFeedbackVisible(false)}
        duration={3500}
        style={{
          backgroundColor: feedbackType === "success" ? uiColors.successFeedback : uiColors.errorFeedback,
          borderWidth: 1,
          borderColor: feedbackType === "success" ? "rgba(16, 185, 129, 0.35)" : "rgba(239, 68, 68, 0.35)",
        }}
        theme={{
          colors: {
            inverseOnSurface: tokens.textPrimary,
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
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  welcomeSection: {
    marginBottom: 24,
    alignItems: "center",
    borderRadius: 28,
    paddingVertical: 28,
    paddingHorizontal: 20,
    width: "100%",
    maxWidth: 430,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logoWrapper: {
    width: 104,
    height: 104,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  logo: {
    width: 104,
    height: 104,
  },
  title: {
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    lineHeight: 22,
  },
  googleButton: {
    minWidth: 250,
    width: "100%",
    maxWidth: 430,
    borderRadius: 16,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  googleButtonContent: {
    minHeight: 52,
  },
});
