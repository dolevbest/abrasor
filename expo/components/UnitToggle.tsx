import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSettings } from '@/hooks/settings-context';
import { useTheme } from '@/hooks/theme-context';

export default function UnitToggle() {
  const { unitSystem, toggleUnitSystem } = useSettings();
  const { theme } = useTheme();
  const animatedValue = React.useRef(new Animated.Value(unitSystem === 'imperial' ? 1 : 0)).current;

  React.useEffect(() => {
    console.log('🔄 UnitToggle: unitSystem changed to:', unitSystem);
    Animated.timing(animatedValue, {
      toValue: unitSystem === 'imperial' ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [unitSystem]);

  const handleToggle = React.useCallback(() => {
    console.log('🔄 UnitToggle: Toggle pressed, current system:', unitSystem);
    toggleUnitSystem();
  }, [unitSystem, toggleUnitSystem]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [2, 42],
  });

  return (
    <TouchableOpacity onPress={handleToggle} activeOpacity={0.8}>
      <View style={[styles.container, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
        <Animated.View 
          style={[
            styles.slider,
            { backgroundColor: theme.primary, transform: [{ translateX }] }
          ]} 
        />
        <Text style={[styles.label, { color: theme.textSecondary }, unitSystem === 'metric' && { color: theme.primaryText }]}>
          Metric
        </Text>
        <Text style={[styles.label, { color: theme.textSecondary }, unitSystem === 'imperial' && { color: theme.primaryText }]}>
          Inch
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 90,
    height: 32,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1,
  },
  slider: {
    position: 'absolute',
    width: 42,
    height: 26,
    borderRadius: 13,
  },
  label: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600' as const,
  },
});