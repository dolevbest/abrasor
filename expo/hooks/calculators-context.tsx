import { useState, useMemo, useCallback, useEffect } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { UnitSystem } from '@/types';
import { trpc } from '@/lib/trpc';
import { calculators as defaultCalculators } from '@/utils/calculators';

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [queryEnabled, setQueryEnabled] = useState(false);
  
  // Enable query after a short delay to prevent hydration timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setQueryEnabled(true);
    }, 500); // 500ms delay to allow hydration to complete
    
    return () => clearTimeout(timer);
  }, []);
  
  // Fetch calculators from database
  const calculatorsQuery = trpc.calculators.getAll.useQuery({
    retry: false, // Disable retries to prevent hanging
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: queryEnabled, // Only enable after delay
    onError: (error: any) => {
      if (error && typeof error === 'object') {
        console.error('❌ tRPC calculators query error:', error);
      }
      setHasTimedOut(true); // Set timeout on error
    },
    onSuccess: (data: any) => {
      if (data && Array.isArray(data)) {
        console.log('✅ tRPC calculators query success:', data.length, 'calculators');
      }
      setHasTimedOut(false);
    },
  });
  
  // Set timeout fallback - shorter timeout to prevent hydration issues
  useEffect(() => {
    if (!queryEnabled) return; // Don't start timeout until query is enabled
    
    const timer = setTimeout(() => {
      if (calculatorsQuery.isLoading) {
        console.log('⏰ Query timeout - falling back to default calculators');
        setHasTimedOut(true);
      }
    }, 3000); // 3 second fallback to prevent hydration timeout
    
    return () => clearTimeout(timer);
  }, [calculatorsQuery.isLoading, queryEnabled]);
  
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
    if (!queryEnabled) {
      // Before query is enabled, show default calculators to prevent empty state
      console.log('⏳ Query not enabled yet, using default calculators:', defaultCalculators.length, 'calculators available');
      return defaultCalculators;
    }
    
    if (calculatorsQuery.data && calculatorsQuery.data.length > 0) {
      console.log('✅ Using database calculators:', calculatorsQuery.data.length, 'calculators available');
      return calculatorsQuery.data;
    } else if (backendFailed || hasTimedOut) {
      console.log('⚠️ Backend failed or timed out, using default calculators:', defaultCalculators.length, 'calculators available');
      return defaultCalculators;
    } else if (!calculatorsQuery.isLoading) {
      // If not loading and no data, use defaults
      console.log('⚠️ No data and not loading, using default calculators:', defaultCalculators.length, 'calculators available');
      return defaultCalculators;
    } else {
      console.log('⏳ Still loading, using default calculators temporarily:', defaultCalculators.length, 'calculators available');
      return defaultCalculators;
    }
  }, [calculatorsQuery.data, calculatorsQuery.isLoading, backendFailed, hasTimedOut, queryEnabled]);

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
    if (!unitSystem || typeof unitSystem !== 'string') return;
    const sanitized = unitSystem.trim();
    if (!sanitized || sanitized.length > 20) return;
    if (sanitized === 'metric' || sanitized === 'imperial') {
      console.log('🔄 Updating calculators unit system to:', sanitized);
      setCurrentUnitSystem(sanitized);
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
    isLoading: queryEnabled && calculatorsQuery.isLoading && !hasTimedOut && !calculatorsQuery.isError,
    backendFailed,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    clearCorruptedCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, calculatorsQuery.isLoading, calculatorsQuery.isError, hasTimedOut, queryEnabled, trackUsage, reloadCalculators, refreshCalculators, clearCorruptedCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem, backendFailed]);
});