import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { UnitSystem } from '@/types';
import { useAuth } from '@/hooks/auth-context';

export interface SavedCalculation {
  id: string;
  calculatorId: string;
  calculatorName: string;
  calculatorShortName: string;
  inputs: Record<string, number>;
  result: {
    value: number | null;
    unit: Record<UnitSystem, string>;
    scale?: {
      min: number;
      max: number;
      optimal: { min: number; max: number };
    };
  };
  unitSystem: UnitSystem;
  savedAt: Date;
  notes?: string;
}

interface CalculationsState {
  savedCalculations: SavedCalculation[];
  isLoading: boolean;
  saveCalculation: (calculation: Omit<SavedCalculation, 'id' | 'savedAt'>) => Promise<void>;
  deleteCalculation: (id: string) => Promise<void>;
  clearAllCalculations: () => Promise<void>;
  getCalculationsByDate: (startDate?: Date, endDate?: Date) => SavedCalculation[];
}

export const [CalculationsProvider, useCalculations] = createContextHook<CalculationsState>(() => {
  const { user, isGuest } = useAuth();
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCalculations();
  }, [user, isGuest]);

  const getStorageKey = () => {
    if (isGuest) {
      return 'guestCalculations';
    } else if (user) {
      return `userCalculations_${user.id}`;
    }
    return 'savedCalculations';
  };

  const loadCalculations = async () => {
    try {
      const storageKey = getStorageKey();
      const stored = await AsyncStorage.getItem(storageKey);
      if (stored) {
        const calculations = JSON.parse(stored);
        setSavedCalculations(calculations.map((calc: any) => ({
          ...calc,
          savedAt: new Date(calc.savedAt)
        })));
      }
    } catch (error) {
      console.error('Failed to load calculations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCalculation = useCallback(async (calculation: Omit<SavedCalculation, 'id' | 'savedAt'>) => {
    const newCalculation: SavedCalculation = {
      ...calculation,
      id: Date.now().toString(),
      savedAt: new Date(),
    };

    const updated = [newCalculation, ...savedCalculations];
    setSavedCalculations(updated);
    const storageKey = getStorageKey();
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  }, [savedCalculations, user, isGuest]);

  const deleteCalculation = useCallback(async (id: string) => {
    const updated = savedCalculations.filter(calc => calc.id !== id);
    setSavedCalculations(updated);
    const storageKey = getStorageKey();
    await AsyncStorage.setItem(storageKey, JSON.stringify(updated));
  }, [savedCalculations, user, isGuest]);

  const clearAllCalculations = useCallback(async () => {
    setSavedCalculations([]);
    const storageKey = getStorageKey();
    await AsyncStorage.removeItem(storageKey);
  }, [user, isGuest]);

  const getCalculationsByDate = useCallback((startDate?: Date, endDate?: Date) => {
    if (!startDate && !endDate) return savedCalculations;
    
    return savedCalculations.filter(calc => {
      const calcDate = new Date(calc.savedAt);
      if (startDate && calcDate < startDate) return false;
      if (endDate && calcDate > endDate) return false;
      return true;
    });
  }, [savedCalculations]);

  return useMemo(() => ({
    savedCalculations,
    isLoading,
    saveCalculation,
    deleteCalculation,
    clearAllCalculations,
    getCalculationsByDate,
  }), [savedCalculations, isLoading, saveCalculation, deleteCalculation, clearAllCalculations, getCalculationsByDate]);
});