import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "react-native-paper";

type TopLoadingBarProps = {
  visible: boolean;
};

export default function TopLoadingBar({ visible }: TopLoadingBarProps) {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const animation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      animation.stopAnimation();
      animation.setValue(0);
      return;
    }

    const loop = Animated.loop(
      Animated.timing(animation, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );

    loop.start();

    return () => {
      loop.stop();
      animation.stopAnimation();
    };
  }, [animation, visible]);

  if (!visible) {
    return null;
  }

  const segmentWidth = Math.max(180, width * 0.35);

  const translateX = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [-segmentWidth, width + segmentWidth],
  });

  return (
    <View style={styles.wrapper} pointerEvents="none">
      <View style={[styles.track, { backgroundColor: theme.colors.primaryContainer }] }>
        <View style={[styles.baseBar, { backgroundColor: theme.colors.primary }]} />
        <Animated.View
          style={[
            styles.segment,
            {
              width: segmentWidth,
              backgroundColor: theme.colors.primary,
              transform: [{ translateX }],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 220,
    elevation: 220,
  },
  track: {
    height: 6,
    width: "100%",
    overflow: "hidden",
    borderRadius: 999,
  },
  baseBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 6,
    opacity: 0.28,
  },
  segment: {
    position: "absolute",
    top: 0,
    height: 6,
    borderRadius: 999,
  },
});
