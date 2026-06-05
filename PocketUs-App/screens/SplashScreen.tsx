import { useEffect, useRef } from "react";
import { Animated, Image, StyleSheet, View } from "react-native";
import { ActivityIndicator, Surface, Text, useTheme } from "react-native-paper";

type SplashScreenProps = {
  onFinish: () => void;
};

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const theme = useTheme();
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
    <View style={[styles.container, { backgroundColor: theme.colors.primary }]}>
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Surface style={styles.logoSurface} elevation={0}>
          <Image
            source={require("../assets/images/splash-logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </Surface>
      </Animated.View>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.onPrimary }]}>PocketUs</Text>
      <View style={styles.loadingSection}>
        <ActivityIndicator color={theme.colors.onPrimary} size="small" />
        <Text style={[styles.subtitle, { color: theme.colors.onPrimary }]}>Cargando aplicacion</Text>
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  logo: {
    width: 132,
    height: 132,
  },
  title: {
    fontWeight: "800",
  },
  loadingSection: {
    marginTop: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  subtitle: {
    marginTop: 8,
    textAlign: "center",
    fontWeight: "600",
  },
});
