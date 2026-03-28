import createContextHook from '@nkzw/create-context-hook';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './auth-context';
import { trpc, trpcClient } from '@/lib/trpc';
import { Platform } from 'react-native';

// Simple storage abstraction for visitor session ID
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    } else {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      return AsyncStorage.default.getItem(key);
    }
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.setItem(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      const AsyncStorage = await import('@react-native-async-storage/async-storage');
      await AsyncStorage.default.removeItem(key);
    }
  }
};

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
  sessionId: string | null;
  isLoading: boolean;
  saveCalculation: (calculation: Omit<GuestCalculation, 'id' | 'timestamp'>) => Promise<void>;
  clearCalculations: () => Promise<void>;
  loadCalculations: () => Promise<void>;
}

export const [GuestProvider, useGuest] = createContextHook<GuestState>(() => {
  const { isGuest } = useAuth();
  const [calculations, setCalculations] = useState<GuestCalculation[]>([]);
  const [maxCalculations, setMaxCalculations] = useState(50);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const createSessionMutation = trpc.visitors.createSession.useMutation();
  const getSessionQuery = trpc.visitors.getSession.useQuery(
    { sessionId: sessionId || '' },
    { enabled: !!sessionId }
  );
  const saveCalculationMutation = trpc.visitors.saveCalculation.useMutation();
  const getCalculationsQuery = trpc.visitors.getCalculations.useQuery(
    { sessionId: sessionId || '' },
    { enabled: !!sessionId }
  );
  const clearCalculationsMutation = trpc.visitors.clearCalculations.useMutation();
  const getVisitorSettingsQuery = trpc.visitors.getSettings.useQuery();

  const initializeSession = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Check if we have a stored session ID
      const storedSessionId = await storage.getItem('visitorSessionId');
      
      if (storedSessionId) {
        try {
          // Try to get existing session
          await trpcClient.visitors.getSession.query({ sessionId: storedSessionId });
          setSessionId(storedSessionId);
          console.log('✅ Restored visitor session:', storedSessionId);
          return;
        } catch {
          console.log('⚠️ Stored session invalid, creating new one');
          await storage.removeItem('visitorSessionId');
        }
      }
      
      // Create new session
      const newSession = await createSessionMutation.mutateAsync();
      setSessionId(newSession.id);
      await storage.setItem('visitorSessionId', newSession.id);
      console.log('✅ Created new visitor session:', newSession.id);
      
    } catch (error) {
      console.error('Failed to initialize visitor session:', error);
    } finally {
      setIsLoading(false);
    }
  }, [createSessionMutation]);

  useEffect(() => {
    if (isGuest) {
      initializeSession();
    }
  }, [isGuest, initializeSession]);

  useEffect(() => {
    if (getVisitorSettingsQuery.data) {
      setMaxCalculations(getVisitorSettingsQuery.data.maxCalculations);
    }
  }, [getVisitorSettingsQuery.data]);

  useEffect(() => {
    if (getCalculationsQuery.data) {
      const mappedCalculations = getCalculationsQuery.data.map(calc => ({
        id: calc.id,
        calculatorType: calc.calculatorType,
        inputs: calc.inputs,
        results: calc.results,
        timestamp: calc.timestamp,
        unitSystem: calc.unitSystem
      }));
      setCalculations(mappedCalculations);
    }
  }, [getCalculationsQuery.data]);



  const loadCalculations = useCallback(async () => {
    if (!isGuest || !sessionId) return;
    
    try {
      await getCalculationsQuery.refetch();
    } catch (error) {
      console.error('Failed to load visitor calculations:', error);
    }
  }, [isGuest, sessionId, getCalculationsQuery]);

  const saveCalculation = useCallback(async (calculation: Omit<GuestCalculation, 'id' | 'timestamp'>) => {
    if (!isGuest || !sessionId) return;
    
    try {
      await saveCalculationMutation.mutateAsync({
        sessionId,
        calculation: {
          calculatorType: calculation.calculatorType,
          inputs: calculation.inputs,
          results: calculation.results,
          unitSystem: calculation.unitSystem
        }
      });
      
      // Refresh calculations and session data
      await Promise.all([
        getCalculationsQuery.refetch(),
        getSessionQuery.refetch()
      ]);
      
    } catch (error) {
      console.error('Failed to save visitor calculation:', error);
      throw error;
    }
  }, [isGuest, sessionId, saveCalculationMutation, getCalculationsQuery, getSessionQuery]);

  const clearCalculations = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      await clearCalculationsMutation.mutateAsync({ sessionId });
      
      // Refresh data
      await Promise.all([
        getCalculationsQuery.refetch(),
        getSessionQuery.refetch()
      ]);
      
    } catch (error) {
      console.error('Failed to clear visitor calculations:', error);
      throw error;
    }
  }, [sessionId, clearCalculationsMutation, getCalculationsQuery, getSessionQuery]);

  const currentCalculationCount = getSessionQuery.data?.calculationCount ?? calculations.length;
  const currentMaxCalculations = getSessionQuery.data?.maxCalculations ?? maxCalculations;

  return useMemo(() => ({
    calculations,
    calculationCount: currentCalculationCount,
    maxCalculations: currentMaxCalculations,
    canCalculate: isGuest && currentCalculationCount < currentMaxCalculations && !isLoading,
    sessionId,
    isLoading: isLoading || getCalculationsQuery.isLoading || createSessionMutation.isPending,
    saveCalculation,
    clearCalculations,
    loadCalculations,
  }), [
    calculations,
    currentCalculationCount,
    currentMaxCalculations,
    isGuest,
    isLoading,
    sessionId,
    getCalculationsQuery.isLoading,
    createSessionMutation.isPending,
    saveCalculation,
    clearCalculations,
    loadCalculations
  ]);
});