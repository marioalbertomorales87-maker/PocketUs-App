import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import { TopLoadingBar } from "../components";
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
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);

    try {
      const user = await loginWithGoogle();
      const bootstrap = await getV1Bootstrap(user);
      onLogin({ user, bootstrap });
    } catch (error: unknown) {
      console.error("LoginScreen handleLogin error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <TopLoadingBar visible={loading} />

      <Surface style={[styles.welcomeSection, { backgroundColor: theme.colors.elevation.level2 }]} elevation={2}>
        <View style={styles.logoWrapper}>
          <Image
            source={require("../assets/images/icon-512.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onSurface }]}>Bienvenido a PocketUs</Text>
        <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>Organiza tus bolsas de manera eficiente</Text>
      </Surface>

      <Button
        mode="contained"
        icon="google"
        contentStyle={styles.googleButtonContent}
        style={styles.googleButton}
        disabled={loading}
        onPress={handleLogin}
      >
        {loading ? "Cargando..." : "Continuar con Google"}
      </Button>
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
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    width: "100%",
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
  },
  subtitle: {
    marginTop: 10,
    textAlign: "center",
    lineHeight: 20,
  },
  googleButton: {
    minWidth: 250,
    borderRadius: 14,
  },
  googleButtonContent: {
    minHeight: 52,
  },
});
