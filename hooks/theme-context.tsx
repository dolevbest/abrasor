import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { useColorScheme } from 'react-native';
import { ThemeMode, ColorblindMode, FontSize } from '@/types';
import { useAuth } from '@/hooks/auth-context';

export interface Theme {
  background: string;
  surface: string;
  card: string;
  text: string;
  textSecondary: string;
  border: string;
  primary: string;
  primaryText: string;
  error: string;
  success: string;
  warning: string;
  info: string;
  tabBar: string;
  tabBarInactive: string;
  tabBarActive: string;
  headerBackground: string;
  headerText: string;
  inputBackground: string;
  inputBorder: string;
  inputText: string;
  inputPlaceholder: string;
  modalBackground: string;
  modalOverlay: string;
  fontSizes: {
    small: number;
    medium: number;
    large: number;
    title: number;
    subtitle: number;
    caption: number;
  };
}

const baseLightTheme: Theme = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  border: '#E0E0E0',
  primary: '#FF3B30',
  primaryText: '#FFFFFF',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
  info: '#FF3B30',
  tabBar: '#FFFFFF',
  tabBarInactive: '#8E8E93',
  tabBarActive: '#FF3B30',
  headerBackground: '#FFFFFF',
  headerText: '#000000',
  inputBackground: '#F2F2F7',
  inputBorder: '#C7C7CC',
  inputText: '#000000',
  inputPlaceholder: '#8E8E93',
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',
  fontSizes: {
    small: 12,
    medium: 16,
    large: 20,
    title: 24,
    subtitle: 18,
    caption: 10,
  },
};

const baseDarkTheme: Theme = {
  background: '#000000',
  surface: '#1C1C1E',
  card: '#2C2C2E',
  text: '#FFFFFF',
  textSecondary: '#8E8E93',
  border: '#38383A',
  primary: '#FF453A',
  primaryText: '#FFFFFF',
  error: '#FF453A',
  success: '#32D74B',
  warning: '#FF9F0A',
  info: '#FF453A',
  tabBar: '#1C1C1E',
  tabBarInactive: '#636366',
  tabBarActive: '#FF453A',
  headerBackground: '#1C1C1E',
  headerText: '#FFFFFF',
  inputBackground: '#2C2C2E',
  inputBorder: '#38383A',
  inputText: '#FFFFFF',
  inputPlaceholder: '#636366',
  modalBackground: '#2C2C2E',
  modalOverlay: 'rgba(0, 0, 0, 0.75)',
  fontSizes: {
    small: 12,
    medium: 16,
    large: 20,
    title: 24,
    subtitle: 18,
    caption: 10,
  },
};

const getColorblindColors = (colorblindMode: ColorblindMode, isDark: boolean) => {
  const baseColors = {
    primary: isDark ? '#FF453A' : '#FF3B30',
    success: isDark ? '#32D74B' : '#34C759',
    warning: isDark ? '#FF9F0A' : '#FF9500',
    error: isDark ? '#FF453A' : '#FF3B30',
    info: isDark ? '#64D2FF' : '#007AFF',
  };

  switch (colorblindMode) {
    case 'protanopia': // Red-blind
      return {
        primary: isDark ? '#0A84FF' : '#007AFF',
        success: isDark ? '#32D74B' : '#34C759',
        warning: isDark ? '#FF9F0A' : '#FF9500',
        error: isDark ? '#0A84FF' : '#007AFF',
        info: isDark ? '#64D2FF' : '#007AFF',
      };
    case 'deuteranopia': // Green-blind
      return {
        primary: isDark ? '#FF9F0A' : '#FF9500',
        success: isDark ? '#0A84FF' : '#007AFF',
        warning: isDark ? '#FF9F0A' : '#FF9500',
        error: isDark ? '#FF453A' : '#FF3B30',
        info: isDark ? '#64D2FF' : '#007AFF',
      };
    case 'tritanopia': // Blue-blind
      return {
        primary: isDark ? '#FF453A' : '#FF3B30',
        success: isDark ? '#32D74B' : '#34C759',
        warning: isDark ? '#FF9F0A' : '#FF9500',
        error: isDark ? '#FF453A' : '#FF3B30',
        info: isDark ? '#32D74B' : '#34C759',
      };
    default:
      return baseColors;
  }
};

const getFontSizeMultiplier = (fontSize: FontSize): number => {
  switch (fontSize) {
    case 'small': return 0.85;
    case 'medium': return 1.0;
    case 'large': return 1.15;
    case 'extra-large': return 1.3;
    default: return 1.0;
  }
};

const applyFontSizeToTheme = (theme: Theme, fontSize: FontSize): Theme => {
  const multiplier = getFontSizeMultiplier(fontSize);
  return {
    ...theme,
    fontSizes: {
      small: Math.round(theme.fontSizes.small * multiplier),
      medium: Math.round(theme.fontSizes.medium * multiplier),
      large: Math.round(theme.fontSizes.large * multiplier),
      title: Math.round(theme.fontSizes.title * multiplier),
      subtitle: Math.round(theme.fontSizes.subtitle * multiplier),
      caption: Math.round(theme.fontSizes.caption * multiplier),
    },
  };
};

interface ThemeState {
  theme: Theme;
  themeMode: ThemeMode;
  isDark: boolean;
  colorblindMode: ColorblindMode;
  fontSize: FontSize;
  setThemeMode: (mode: ThemeMode) => void;
  setColorblindMode: (mode: ColorblindMode) => void;
  setFontSize: (size: FontSize) => void;
}

export const [ThemeProvider, useTheme] = createContextHook<ThemeState>(() => {
  const { user, updateProfile } = useAuth();
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [colorblindMode, setColorblindModeState] = useState<ColorblindMode>('none');
  const [fontSize, setFontSizeState] = useState<FontSize>('medium');
  const [isDark, setIsDark] = useState(false);

  const loadThemePreference = useCallback(async () => {
    try {
      if (user?.themePreference) {
        setThemeModeState(user.themePreference);
      } else {
        const stored = await AsyncStorage.getItem('themeMode');
        if (stored) {
          setThemeModeState(stored as ThemeMode);
        }
      }
      
      // Load colorblind mode
      if (user?.colorblindMode) {
        setColorblindModeState(user.colorblindMode);
      } else {
        const storedColorblind = await AsyncStorage.getItem('colorblindMode');
        if (storedColorblind) {
          setColorblindModeState(storedColorblind as ColorblindMode);
        }
      }
      
      // Load font size
      if (user?.fontSize) {
        setFontSizeState(user.fontSize);
      } else {
        const storedFontSize = await AsyncStorage.getItem('fontSize');
        if (storedFontSize) {
          setFontSizeState(storedFontSize as FontSize);
        }
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  }, [user]);

  useEffect(() => {
    loadThemePreference();
  }, [loadThemePreference]);

  useEffect(() => {
    const dark = themeMode === 'system' 
      ? systemColorScheme === 'dark'
      : themeMode === 'dark';
    setIsDark(dark);
  }, [themeMode, systemColorScheme]);



  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    if (!mode || !['light', 'dark', 'system'].includes(mode)) return;
    
    setThemeModeState(mode);
    await AsyncStorage.setItem('themeMode', mode);
    
    if (user) {
      await updateProfile({ themePreference: mode });
    }
  }, [user, updateProfile]);
  
  const setColorblindMode = useCallback(async (mode: ColorblindMode) => {
    setColorblindModeState(mode);
    await AsyncStorage.setItem('colorblindMode', mode);
    
    if (user) {
      await updateProfile({ colorblindMode: mode });
    }
  }, [user, updateProfile]);
  
  const setFontSize = useCallback(async (size: FontSize) => {
    setFontSizeState(size);
    await AsyncStorage.setItem('fontSize', size);
    
    if (user) {
      await updateProfile({ fontSize: size });
    }
  }, [user, updateProfile]);

  const theme = useMemo(() => {
    const baseTheme = isDark ? baseDarkTheme : baseLightTheme;
    
    const colorblindColors = getColorblindColors(colorblindMode, isDark);
    const themeWithColors = {
      ...baseTheme,
      primary: colorblindColors.primary,
      success: colorblindColors.success,
      warning: colorblindColors.warning,
      error: colorblindColors.error,
      info: colorblindColors.info,
      tabBarActive: colorblindColors.primary,
    };
    
    return applyFontSizeToTheme(themeWithColors, fontSize);
  }, [isDark, colorblindMode, fontSize]);

  return useMemo(() => ({
    theme,
    themeMode,
    isDark,
    colorblindMode,
    fontSize,
    setThemeMode,
    setColorblindMode,
    setFontSize,
  }), [theme, themeMode, isDark, colorblindMode, fontSize, setThemeMode, setColorblindMode, setFontSize]);
});