export const Colors = {
  primary: '#dc2626',
  primaryDark: '#991b1b',
  primaryLight: '#ef4444',
  secondary: '#f59e0b',
  secondaryDark: '#d97706',
  success: '#10b981',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  
  background: '#f8fafc',
  surface: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  textLight: '#94a3b8',
  
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
  
  tabBar: '#ffffff',
  tabBarBorder: '#e2e8f0',
  
  scaleOptimal: '#10b981',
  scaleWarning: '#f59e0b',
  scaleDanger: '#ef4444',
} as const;

export const Shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;