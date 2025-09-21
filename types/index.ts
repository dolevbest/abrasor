export type UserRole = 'admin' | 'premium' | 'starter';
export type UnitSystem = 'metric' | 'imperial';
export type UserStatus = 'pending' | 'approved' | 'rejected';
export type ThemeMode = 'light' | 'dark' | 'system';
export type ColorblindMode = 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  unitPreference: UnitSystem;
  themePreference?: ThemeMode;
  colorblindMode?: ColorblindMode;
  fontSize?: FontSize;
  createdAt: Date;
  lastLogin?: Date;
  company?: string;
  position?: string;
  country?: string;
  profileImage?: string | null;
}

export interface AccessRequest {
  id: string;
  email: string;
  name: string;
  password: string;
  company: string;
  position: string;
  country: string;
  preferredUnits: UnitSystem;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  requestDate: Date;
}

export interface CalculatorInput {
  label: string;
  key: string;
  unit: {
    metric: string;
    imperial: string;
  };
  placeholder: {
    metric: string;
    imperial: string;
  };
  tooltip: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface CalculatorResult {
  label: string;
  value: number | null;
  unit: {
    metric: string;
    imperial: string;
  };
  scale?: {
    min: number;
    max: number;
    optimal: { min: number; max: number };
  };
}

export interface Calculator {
  id: string;
  name: string;
  shortName: string;
  description: string;
  categories: string[];
  inputs: CalculatorInput[];
  calculate: (inputs: Record<string, number>, unitSystem: UnitSystem) => CalculatorResult;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
}