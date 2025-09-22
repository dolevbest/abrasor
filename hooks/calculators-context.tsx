import { useState, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import { Calculator, UnitSystem } from '@/types';
import { trpc } from '@/lib/trpc';

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

interface CalculatorConfig {
  id: string;
  name: string;
  categories: string[];
  enabled: boolean;
  usageCount: number;
  lastModified: Date;
  inputs: CalculatorInput[];
  formula: FormulaNode;
  resultUnit: string;
  description?: string;
  shortName?: string;
}

// Default calculators from utils
import { calculators as defaultCalculators } from '@/utils/calculators';

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');
  
  // Fetch calculators from backend
  const calculatorsQuery = trpc.calculators.getAll.useQuery();
  
  // Clear corrupted calculators mutation
  const clearCorruptedMutation = trpc.calculators.clearCorrupted.useMutation();
  
  console.log('🔍 Calculators query status:', {
    isLoading: calculatorsQuery.isLoading,
    isError: calculatorsQuery.isError,
    error: calculatorsQuery.error?.message,
    dataLength: calculatorsQuery.data?.length,
    data: calculatorsQuery.data
  });
  
  // Track usage mutation
  const trackUsageMutation = trpc.calculators.trackUsage.useMutation();

  // Convert backend calculators to app format with current unit system
  const calculators = useMemo(() => {
    console.log('Processing calculators data:', calculatorsQuery.data);
    
    if (!calculatorsQuery.data) {
      console.log('No calculators data available, returning empty array');
      return [];
    }
    
    try {
      const processedCalculators = calculatorsQuery.data.map(calc => {
        console.log('Processing calculator:', calc.id, calc.name);
        
        // Find the original calculator with the calculate function
        const originalCalc = defaultCalculators.find(c => c.id === calc.id);
        if (originalCalc) {
          console.log('Found original calculator for:', calc.id);
          return originalCalc;
        }
        
        console.log('Creating custom calculator for:', calc.id);
        // For custom calculators, create a basic calculate function
        return {
          ...calc,
          calculate: (inputs: Record<string, number>, unitSystem: UnitSystem) => {
            // Basic calculation - in a real implementation, you'd evaluate the stored formula
            return {
              label: calc.shortName,
              value: 0,
              unit: { metric: '', imperial: '' },
              scale: { min: 0, max: 100, optimal: { min: 20, max: 80 } }
            };
          }
        } as Calculator;
      });
      
      console.log('Processed calculators count:', processedCalculators.length);
      return processedCalculators;
    } catch (error) {
      console.error('Error processing calculators data:', error);
      // Trigger cleanup of corrupted data
      clearCorruptedMutation.mutate();
      return [];
    }
  }, [calculatorsQuery.data, currentUnitSystem, clearCorruptedMutation]);

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

  // Reload calculators (useful when admin makes changes)
  const reloadCalculators = useCallback(async () => {
    try {
      await calculatorsQuery.refetch();
    } catch (error) {
      console.error('Failed to reload calculators, attempting to clear corrupted data:', error);
      try {
        await clearCorruptedMutation.mutateAsync();
        await calculatorsQuery.refetch();
      } catch (clearError) {
        console.error('Failed to clear corrupted calculators:', clearError);
      }
    }
  }, [calculatorsQuery, clearCorruptedMutation]);
  
  // Force refresh calculators from backend
  const refreshCalculators = useCallback(async () => {
    try {
      await calculatorsQuery.refetch();
    } catch (error) {
      console.error('Failed to refresh calculators, attempting to clear corrupted data:', error);
      try {
        await clearCorruptedMutation.mutateAsync();
        await calculatorsQuery.refetch();
      } catch (clearError) {
        console.error('Failed to clear corrupted calculators:', clearError);
      }
    }
  }, [calculatorsQuery, clearCorruptedMutation]);

  const getCalculatorById = useCallback((id: string) => 
    calculators.find(c => c.id === id), [calculators]);
  
  const getCalculatorsByCategory = useCallback((category: string) => 
    calculators.filter(c => c.categories.includes(category)), [calculators]);
  
  const updateUnitSystem = useCallback((unitSystem: UnitSystem) => {
    setCurrentUnitSystem(unitSystem);
  }, []);

  // Clear corrupted calculators manually
  const clearCorruptedCalculators = useCallback(async () => {
    try {
      const result = await clearCorruptedMutation.mutateAsync();
      console.log('Cleared corrupted calculators:', result);
      await calculatorsQuery.refetch();
      return result;
    } catch (error) {
      console.error('Failed to clear corrupted calculators:', error);
      throw error;
    }
  }, [clearCorruptedMutation, calculatorsQuery]);

  return useMemo(() => ({
    calculators,
    categories,
    isLoading: calculatorsQuery.isLoading,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    clearCorruptedCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, calculatorsQuery.isLoading, trackUsage, reloadCalculators, refreshCalculators, clearCorruptedCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem]);
});