import { useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import Svg, { Path } from "react-native-svg";
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
