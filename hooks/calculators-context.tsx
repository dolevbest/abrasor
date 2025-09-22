import { useState, useMemo, useCallback, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { UnitSystem } from '@/types';
import { trpc } from '@/lib/trpc';
import { calculators as defaultCalculators } from '@/utils/calculators';

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');
  const [hasTimedOut, setHasTimedOut] = useState(false);
  
  // Fetch calculators from database
  const calculatorsQuery = trpc.calculators.getAll.useQuery(undefined, {
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    timeout: 10000, // 10 second timeout
    onError: (error) => {
      console.error('❌ tRPC calculators query error:', error);
    },
    onSuccess: (data) => {
      console.log('✅ tRPC calculators query success:', data?.length || 0, 'calculators');
      setHasTimedOut(false);
    },
  });
  
  // Set timeout fallback
  useEffect(() => {
    const timer = setTimeout(() => {
      if (calculatorsQuery.isLoading) {
        console.log('⏰ Query timeout - falling back to default calculators');
        setHasTimedOut(true);
      }
    }, 8000); // 8 second fallback
    
    return () => clearTimeout(timer);
  }, [calculatorsQuery.isLoading]);
  
  const backendFailed = calculatorsQuery.isError || hasTimedOut;
  
  console.log('🔍 Calculators status:', {
    isLoading: calculatorsQuery.isLoading,
    isError: calculatorsQuery.isError,
    backendFailed,
    dataLength: calculatorsQuery.data?.length || 0,
    defaultCalculatorsCount: defaultCalculators.length
  });
  
  // Track usage mutation
  const trackUsageMutation = trpc.calculators.trackUsage.useMutation();

  // Use database calculators if available, fallback to defaults
  const calculators = useMemo(() => {
    if (calculatorsQuery.data && calculatorsQuery.data.length > 0) {
      console.log('✅ Using database calculators:', calculatorsQuery.data.length, 'calculators available');
      return calculatorsQuery.data;
    } else if (backendFailed) {
      console.log('⚠️ Backend failed, using default calculators:', defaultCalculators.length, 'calculators available');
      return defaultCalculators;
    } else {
      console.log('⏳ No data yet, using empty array');
      return [];
    }
  }, [calculatorsQuery.data, backendFailed]);

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

  // Reload calculators
  const reloadCalculators = useCallback(async () => {
    console.log('🔄 Reload requested - refetching from database');
    await calculatorsQuery.refetch();
  }, [calculatorsQuery]);
  
  // Force refresh calculators
  const refreshCalculators = useCallback(async () => {
    console.log('🔄 Refresh requested - invalidating and refetching');
    await calculatorsQuery.refetch();
  }, [calculatorsQuery]);

  const getCalculatorById = useCallback((id: string) => 
    calculators.find(c => c.id === id), [calculators]);
  
  const getCalculatorsByCategory = useCallback((category: string) => 
    calculators.filter(c => c.categories.includes(category)), [calculators]);
  
  const updateUnitSystem = useCallback((unitSystem: UnitSystem) => {
    if (unitSystem && typeof unitSystem === 'string' && unitSystem.trim() && unitSystem.length <= 20 && (unitSystem === 'metric' || unitSystem === 'imperial')) {
      setCurrentUnitSystem(unitSystem);
    }
  }, []);

  // Clear corrupted calculators mutation
  const clearCorruptedMutation = trpc.calculators.clearCorrupted.useMutation();
  
  // Clear corrupted calculators
  const clearCorruptedCalculators = useCallback(async () => {
    console.log('🧹 Clear corrupted requested - calling backend procedure');
    try {
      const result = await clearCorruptedMutation.mutateAsync();
      // Refetch after clearing
      await calculatorsQuery.refetch();
      return result;
    } catch (error) {
      console.error('Failed to clear corrupted calculators:', error);
      return { success: false, cleared: 0, inserted: 0 };
    }
  }, [clearCorruptedMutation, calculatorsQuery]);

  return useMemo(() => ({
    calculators,
    categories,
    isLoading: calculatorsQuery.isLoading && !hasTimedOut,
    backendFailed,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    clearCorruptedCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, calculatorsQuery.isLoading, hasTimedOut, trackUsage, reloadCalculators, refreshCalculators, clearCorruptedCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem, backendFailed]);
});