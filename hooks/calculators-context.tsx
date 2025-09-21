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
  
  // Track usage mutation
  const trackUsageMutation = trpc.calculators.trackUsage.useMutation();

  // Convert backend calculators to app format with current unit system
  const calculators = useMemo(() => {
    if (!calculatorsQuery.data) return [];
    
    return calculatorsQuery.data.map(calc => {
      // Find the original calculator with the calculate function
      const originalCalc = defaultCalculators.find(c => c.id === calc.id);
      if (originalCalc) {
        return originalCalc;
      }
      
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
  }, [calculatorsQuery.data, currentUnitSystem]);

  // Get unique categories
  const categories = useMemo(() => {
    const allCategories = calculators.flatMap(c => c.categories);
    return Array.from(new Set(allCategories));
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
  const reloadCalculators = useCallback(() => {
    calculatorsQuery.refetch();
  }, [calculatorsQuery]);
  
  // Force refresh calculators from backend
  const refreshCalculators = useCallback(async () => {
    await calculatorsQuery.refetch();
  }, [calculatorsQuery]);

  const getCalculatorById = useCallback((id: string) => 
    calculators.find(c => c.id === id), [calculators]);
  
  const getCalculatorsByCategory = useCallback((category: string) => 
    calculators.filter(c => c.categories.includes(category)), [calculators]);
  
  const updateUnitSystem = useCallback((unitSystem: UnitSystem) => {
    setCurrentUnitSystem(unitSystem);
  }, []);

  return useMemo(() => ({
    calculators,
    categories,
    isLoading: calculatorsQuery.isLoading,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, calculatorsQuery.isLoading, trackUsage, reloadCalculators, refreshCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem]);
});