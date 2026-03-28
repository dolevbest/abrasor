import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Sun, Moon, Smartphone } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { ThemeMode } from '@/types';

interface ThemeSelectorProps {
  style?: any;
}

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const { theme, themeMode, setThemeMode } = useTheme();

  const options: { mode: ThemeMode; icon: React.ReactNode; label: string }[] = [
    {
      mode: 'light',
      icon: <Sun size={20} color={themeMode === 'light' ? theme.primary : theme.textSecondary} />,
      label: 'Light',
    },
    {
      mode: 'dark',
      icon: <Moon size={20} color={themeMode === 'dark' ? theme.primary : theme.textSecondary} />,
      label: 'Dark',
    },
    {
      mode: 'system',
      icon: <Smartphone size={20} color={themeMode === 'system' ? theme.primary : theme.textSecondary} />,
      label: 'System',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }, style]}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>Theme</Text>
      <View style={[styles.selector, { backgroundColor: theme.inputBackground }]}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.mode}
            style={[
              styles.option,
              themeMode === option.mode && { backgroundColor: theme.surface },
              themeMode === option.mode && styles.activeOption,
            ]}
            onPress={() => setThemeMode(option.mode)}
          >
            {option.icon}
            <Text
              style={[
                styles.optionText,
                { color: themeMode === option.mode ? theme.primary : theme.textSecondary },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 4,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  activeOption: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});