import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { UnitSystem } from '@/types';
import { useAuth } from '@/hooks/auth-context';
import { trpc } from '@/lib/trpc';

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
  const [guestCalculations, setGuestCalculations] = useState<SavedCalculation[]>([]);
  const [isLoadingGuest, setIsLoadingGuest] = useState(true);

  const safeJsonParse = (jsonString: string | null, fallback: any = null) => {
    if (!jsonString || typeof jsonString !== 'string') {
      return fallback;
    }
    
    const trimmed = jsonString.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
      return fallback;
    }
    
    // Check for common corruption patterns
    if (trimmed.includes('object Object') || trimmed.includes('[object') || 
        trimmed.includes('NaN') || trimmed.includes('Infinity')) {
      console.warn('⚠️ Detected corrupted JSON data:', trimmed.substring(0, 50));
      return fallback;
    }
    
    // Validate JSON structure
    if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
      console.warn('⚠️ Invalid JSON structure:', trimmed.substring(0, 50));
      return fallback;
    }
    
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.error('❌ JSON parse error:', error, 'Data:', trimmed.substring(0, 100));
      return fallback;
    }
  };
  
  // Backend queries for authenticated users
  const savedCalculationsQuery = trpc.calculations.getSaved.useQuery(undefined, {
    enabled: !isGuest && !!user
  });
  
  const saveCalculationMutation = trpc.calculations.save.useMutation();
  const deleteCalculationMutation = trpc.calculations.delete.useMutation();
  const clearAllMutation = trpc.calculations.clearAll.useMutation();
  
  // Load guest calculations from AsyncStorage
  useEffect(() => {
    if (isGuest) {
      loadGuestCalculations();
    } else {
      setIsLoadingGuest(false);
    }
  }, [isGuest]);

  const loadGuestCalculations = async () => {
    try {
      const stored = await AsyncStorage.getItem('guestCalculations');
      if (stored && stored.trim()) {
        const parsed = safeJsonParse(stored, []);
        if (Array.isArray(parsed)) {
          const calculations = parsed.map((calc: any) => ({
            ...calc,
            savedAt: new Date(calc.savedAt)
          }));
          setGuestCalculations(calculations);
        } else {
          console.error('Failed to parse guest calculations, clearing corrupted data');
          await AsyncStorage.removeItem('guestCalculations');
          setGuestCalculations([]);
        }
      }
    } catch (error) {
      console.error('Failed to load guest calculations:', error);
    } finally {
      setIsLoadingGuest(false);
    }
  };

  const saveCalculation = useCallback(async (calculation: Omit<SavedCalculation, 'id' | 'savedAt'>) => {
    if (isGuest) {
      // Save to AsyncStorage for guests
      const newCalculation: SavedCalculation = {
        ...calculation,
        id: Date.now().toString(),
        savedAt: new Date(),
      };
      const updated = [newCalculation, ...guestCalculations];
      setGuestCalculations(updated);
      try {
        await AsyncStorage.setItem('guestCalculations', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save guest calculations:', error);
      }
    } else {
      // Save to backend for authenticated users
      await saveCalculationMutation.mutateAsync(calculation);
      await savedCalculationsQuery.refetch();
    }
  }, [isGuest, guestCalculations, saveCalculationMutation, savedCalculationsQuery]);

  const deleteCalculation = useCallback(async (id: string) => {
    if (isGuest) {
      // Delete from AsyncStorage for guests
      const updated = guestCalculations.filter(calc => calc.id !== id);
      setGuestCalculations(updated);
      try {
        await AsyncStorage.setItem('guestCalculations', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save guest calculations:', error);
      }
    } else {
      // Delete from backend for authenticated users
      await deleteCalculationMutation.mutateAsync({ id });
      await savedCalculationsQuery.refetch();
    }
  }, [isGuest, guestCalculations, deleteCalculationMutation, savedCalculationsQuery]);

  const clearAllCalculations = useCallback(async () => {
    if (isGuest) {
      // Clear AsyncStorage for guests
      setGuestCalculations([]);
      await AsyncStorage.removeItem('guestCalculations');
    } else {
      // Clear backend for authenticated users
      await clearAllMutation.mutateAsync();
      await savedCalculationsQuery.refetch();
    }
  }, [isGuest, clearAllMutation, savedCalculationsQuery]);

  // Get current calculations (guest or user)
  const savedCalculations = useMemo(() => {
    if (isGuest) {
      return guestCalculations;
    }
    return savedCalculationsQuery.data || [];
  }, [isGuest, guestCalculations, savedCalculationsQuery.data]);
  
  const getCalculationsByDate = useCallback((startDate?: Date, endDate?: Date) => {
    if (!startDate && !endDate) return savedCalculations;
    
    return savedCalculations.filter(calc => {
      const calcDate = new Date(calc.savedAt);
      if (startDate && calcDate < startDate) return false;
      if (endDate && calcDate > endDate) return false;
      return true;
    });
  }, [savedCalculations]);

  const isLoading = isGuest ? isLoadingGuest : savedCalculationsQuery.isLoading;
  
  return useMemo(() => ({
    savedCalculations,
    isLoading,
    saveCalculation,
    deleteCalculation,
    clearAllCalculations,
    getCalculationsByDate,
  }), [savedCalculations, isLoading, saveCalculation, deleteCalculation, clearAllCalculations, getCalculationsByDate]);
});