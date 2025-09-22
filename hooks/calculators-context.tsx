import { useState, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { UnitSystem } from '@/types';
import { trpc } from '@/lib/trpc';
import { calculators as defaultCalculators } from '@/utils/calculators';

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');
  const [useBackend, setUseBackend] = useState(true); // Enable backend
  const [backendFailed, setBackendFailed] = useState(false);
  
  // Fetch calculators from backend only if enabled
  const calculatorsQuery = trpc.calculators.getAll.useQuery({
    enabled: useBackend,
    retry: 2,
    retryDelay: 1000,
    onError: (error: any) => {
      if (error && typeof error === 'object') {
        console.error('🚨 Backend calculators query failed:', error);
      }
      console.log('🔄 Falling back to default calculators');
      setUseBackend(false);
      setBackendFailed(true);
    },
    onSuccess: (data: any) => {
      console.log('✅ Successfully fetched calculators from backend:', data?.length || 0);
    }
  });
  
  // Clear corrupted calculators mutation
  const clearCorruptedMutation = trpc.calculators.clearCorrupted.useMutation();
  
  console.log('🔍 Calculators status:', {
    useBackend,
    defaultCalculatorsCount: defaultCalculators.length
  });
  
  // Track usage mutation
  const trackUsageMutation = trpc.calculators.trackUsage.useMutation();

  // Use backend calculators if available, otherwise fall back to defaults
  const calculators = useMemo(() => {
    if (useBackend && !backendFailed && calculatorsQuery.data && calculatorsQuery.data.length > 0) {
      console.log('✅ Using backend calculators:', calculatorsQuery.data.length, 'calculators available');
      return calculatorsQuery.data;
    }
    console.log('✅ Using default calculators:', defaultCalculators.length, 'calculators available');
    return defaultCalculators;
  }, [useBackend, backendFailed, calculatorsQuery.data]);

  // Get unique categories
  const categories = useMemo(() => {
    try {
      const allCategories = calculators.flatMap(c => c.categories || []);
      return Array.from(new Set(allCategories));
    } catch (error) {
      console.error('Error processing categories:', error);
      return [];
    }
  }, [calculators]);

  // Track calculator usage
  const trackUsage = useCallback(async (calculatorId: string) => {
    try {
      await trackUsageMutation.mutateAsync({ calculatorId });
    } catch (error) {
      console.error('Failed to track calculator usage:', error);
    }
  }, [trackUsageMutation]);

  // Reload calculators (no-op for now since using defaults)
  const reloadCalculators = useCallback(async () => {
    console.log('🔄 Reload requested - using default calculators');
    if (useBackend) {
      try {
        await calculatorsQuery.refetch();
      } catch (error) {
        console.error('Failed to reload calculators:', error);
        setUseBackend(false);
      }
    }
  }, [calculatorsQuery, useBackend]);
  
  // Force refresh calculators from backend
  const refreshCalculators = useCallback(async () => {
    console.log('🔄 Refresh requested - using default calculators');
    if (useBackend) {
      try {
        await calculatorsQuery.refetch();
      } catch (error) {
        console.error('Failed to refresh calculators:', error);
        setUseBackend(false);
      }
    }
  }, [calculatorsQuery, useBackend]);

  const getCalculatorById = useCallback((id: string) => 
    calculators.find(c => c.id === id), [calculators]);
  
  const getCalculatorsByCategory = useCallback((category: string) => 
    calculators.filter(c => c.categories.includes(category)), [calculators]);
  
  const updateUnitSystem = useCallback((unitSystem: UnitSystem) => {
    if (unitSystem && unitSystem.trim() && unitSystem.length <= 20 && (unitSystem === 'metric' || unitSystem === 'imperial')) {
      setCurrentUnitSystem(unitSystem);
    }
  }, []);

  // Clear corrupted calculators manually
  const clearCorruptedCalculators = useCallback(async () => {
    console.log('🧹 Clear corrupted requested - using default calculators');
    if (useBackend) {
      try {
        const result = await clearCorruptedMutation.mutateAsync();
        console.log('Cleared corrupted calculators:', result);
        await calculatorsQuery.refetch();
        return result;
      } catch (error) {
        console.error('Failed to clear corrupted calculators:', error);
        setUseBackend(false);
        throw error;
      }
    }
    return { success: true, cleared: 0, inserted: 0 };
  }, [clearCorruptedMutation, calculatorsQuery, useBackend]);

  return useMemo(() => ({
    calculators,
    categories,
    isLoading: useBackend && !backendFailed ? calculatorsQuery.isLoading : false,
    backendFailed,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    clearCorruptedCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, trackUsage, reloadCalculators, refreshCalculators, clearCorruptedCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem, useBackend, backendFailed, calculatorsQuery.isLoading]);
});