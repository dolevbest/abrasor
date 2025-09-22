import { useState, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Calculator, UnitSystem } from '@/types';
import { trpc } from '@/lib/trpc';
import { calculators as defaultCalculators } from '@/utils/calculators';

interface CalculatorInput {
  id: string;
  name: string;
  label: string;
  unit: string;
  type: 'number';
  placeholder?: string;
  defaultValue?: number;
}

interface FormulaNode {
  id: string;
  type: 'input' | 'number' | 'operator' | 'function';
  value: string;
  label?: string;
  children?: FormulaNode[];
}

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');
  const [useBackend, setUseBackend] = useState(false); // Disabled for now to fix the issue
  
  // Fetch calculators from backend only if enabled
  const calculatorsQuery = trpc.calculators.getAll.useQuery(undefined, {
    enabled: useBackend,
    retry: 1,
    onError: (error) => {
      console.error('🚨 Backend calculators query failed:', error);
      console.log('🔄 Falling back to default calculators');
      setUseBackend(false);
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

  // Use default calculators for now (backend disabled)
  const calculators = useMemo(() => {
    console.log('✅ Using default calculators:', defaultCalculators.length, 'calculators available');
    return defaultCalculators;
  }, []);

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
    if (unitSystem && (unitSystem === 'metric' || unitSystem === 'imperial')) {
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
    isLoading: false, // Never loading since using defaults
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    clearCorruptedCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, trackUsage, reloadCalculators, refreshCalculators, clearCorruptedCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem]);
});