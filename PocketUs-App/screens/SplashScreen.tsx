import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Surface, Text, useTheme } from "react-native-paper";

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
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
    accent: "#22C55E",
  };
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 650,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    const timer = setTimeout(onFinish, 900);

    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [logoOpacity, logoScale, onFinish]);

  return (
    <View style={[styles.container, { backgroundColor: uiColors.pageBackground }]}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Surface style={[styles.logoSurface, { backgroundColor: uiColors.glassBackground, borderColor: uiColors.glassBorder, shadowColor: uiColors.shadow }]} elevation={3}>
          <Image
            source={require("../assets/images/splash-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Surface>
      </Animated.View>
      <Text variant="headlineMedium" style={[styles.title, { color: uiColors.textPrimary }]}>PocketUs</Text>
      <View style={styles.loadingSection}>
        <ActivityIndicator color={uiColors.accent} size="small" />
        <Text style={[styles.subtitle, { color: uiColors.textMuted }]}>Cargando aplicacion</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  logoWrapper: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  logoSurface: {
    width: 132,
    height: 132,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    shadowColor: "transparent",
    shadowOpacity: 0.24,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  logo: {
    width: 132,
    height: 132,
  },
  title: {
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  loadingSection: {
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
