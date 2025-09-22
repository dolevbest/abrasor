import { useState, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { UnitSystem } from '@/types';
import { trpc } from '@/lib/trpc';
import { calculators as defaultCalculators } from '@/utils/calculators';

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');
  const backendFailed = true; // Always true since we're using defaults
  
  // Backend queries disabled for now - using default calculators only
  
  console.log('🔍 Calculators status:', {
    backendFailed,
    defaultCalculatorsCount: defaultCalculators.length
  });
  
  // Track usage mutation
  const trackUsageMutation = trpc.calculators.trackUsage.useMutation();

  // Always use default calculators for now
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

  // Reload calculators (no-op since using defaults)
  const reloadCalculators = useCallback(async () => {
    console.log('🔄 Reload requested - using default calculators (no-op)');
    // No-op since we're using default calculators
  }, []);
  
  // Force refresh calculators (no-op since using defaults)
  const refreshCalculators = useCallback(async () => {
    console.log('🔄 Refresh requested - using default calculators (no-op)');
    // No-op since we're using default calculators
  }, []);

  const getCalculatorById = useCallback((id: string) => 
    calculators.find(c => c.id === id), [calculators]);
  
  const getCalculatorsByCategory = useCallback((category: string) => 
    calculators.filter(c => c.categories.includes(category)), [calculators]);
  
  const updateUnitSystem = useCallback((unitSystem: UnitSystem) => {
    if (unitSystem && typeof unitSystem === 'string' && unitSystem.trim() && unitSystem.length <= 20 && (unitSystem === 'metric' || unitSystem === 'imperial')) {
      setCurrentUnitSystem(unitSystem);
    }
  }, []);

  // Clear corrupted calculators (no-op since using defaults)
  const clearCorruptedCalculators = useCallback(async () => {
    console.log('🧹 Clear corrupted requested - using default calculators (no-op)');
    return { success: true, cleared: 0, inserted: 0 };
  }, []);

  return useMemo(() => ({
    calculators,
    categories,
    isLoading: false, // Never loading since using defaults
    backendFailed,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    clearCorruptedCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, trackUsage, reloadCalculators, refreshCalculators, clearCorruptedCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem, backendFailed]);
});