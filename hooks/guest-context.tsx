import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useAuth } from './auth-context';

interface GuestCalculation {
  id: string;
  calculatorType: string;
  inputs: Record<string, any>;
  results: Record<string, any>;
  timestamp: Date;
  unitSystem: 'metric' | 'imperial';
}

interface GuestState {
  calculations: GuestCalculation[];
  calculationCount: number;
  maxCalculations: number;
  canCalculate: boolean;
  saveCalculation: (calculation: Omit<GuestCalculation, 'id' | 'timestamp'>) => Promise<void>;
  clearCalculations: () => Promise<void>;
  loadCalculations: () => Promise<void>;
}

export const [GuestProvider, useGuest] = createContextHook<GuestState>(() => {
  const { isGuest } = useAuth();
  const [calculations, setCalculations] = useState<GuestCalculation[]>([]);
  const [maxCalculations, setMaxCalculations] = useState(50);

  useEffect(() => {
    if (isGuest) {
      loadSettings();
      loadCalculations();
    }
  }, [isGuest]);

  const loadSettings = async () => {
    try {
      const maxGuest = await AsyncStorage.getItem('maxGuestCalculations');
      if (maxGuest) {
        setMaxCalculations(parseInt(maxGuest, 10));
      }
    } catch (error) {
      console.error('Failed to load guest settings:', error);
    }
  };

  const loadCalculations = async () => {
    if (!isGuest) return;
    
    try {
      const stored = await AsyncStorage.getItem('guestCalculations');
      if (stored) {
        const parsed = JSON.parse(stored);
        setCalculations(parsed);
      }
    } catch (error) {
      console.error('Failed to load guest calculations:', error);
    }
  };

  const saveCalculation = async (calculation: Omit<GuestCalculation, 'id' | 'timestamp'>) => {
    if (!isGuest) return;
    
    if (calculations.length >= maxCalculations) {
      throw new Error(`Guest users are limited to ${maxCalculations} calculations. Please create an account to continue.`);
    }

    const newCalculation: GuestCalculation = {
      ...calculation,
      id: Date.now().toString(),
      timestamp: new Date(),
    };

    const updated = [newCalculation, ...calculations];
    setCalculations(updated);
    
    try {
      await AsyncStorage.setItem('guestCalculations', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to save guest calculation:', error);
      throw new Error('Failed to save calculation locally');
    }
  };

  const clearCalculations = async () => {
    setCalculations([]);
    try {
      await AsyncStorage.removeItem('guestCalculations');
    } catch (error) {
      console.error('Failed to clear guest calculations:', error);
    }
  };

  return {
    calculations,
    calculationCount: calculations.length,
    maxCalculations,
    canCalculate: isGuest && calculations.length < maxCalculations,
    saveCalculation,
    clearCalculations,
    loadCalculations,
  };
});