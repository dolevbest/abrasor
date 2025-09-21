import { useState, useEffect, useMemo, useCallback } from 'react';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calculator, UnitSystem } from '@/types';

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

interface CalculatorInputExtended extends CalculatorInput {
  unitMetric?: string;
  unitImperial?: string;
  placeholderMetric?: string;
  placeholderImperial?: string;
}

interface CalculatorConfigExtended extends Omit<CalculatorConfig, 'inputs'> {
  inputs: CalculatorInputExtended[];
  resultUnitMetric?: string;
  resultUnitImperial?: string;
}

// Convert default calculators to admin format
const convertToAdminFormat = (calc: Calculator): CalculatorConfigExtended => {
  return {
    id: calc.id,
    name: calc.name,
    shortName: calc.shortName,
    categories: calc.categories,
    enabled: true,
    usageCount: 0,
    lastModified: new Date(),
    description: calc.description,
    inputs: calc.inputs.map((input, idx) => ({
      id: `input_${idx}`,
      name: input.key,
      label: input.label,
      unit: typeof input.unit === 'object' ? input.unit.metric : input.unit,
      unitMetric: typeof input.unit === 'object' ? input.unit.metric : input.unit,
      unitImperial: typeof input.unit === 'object' ? input.unit.imperial : input.unit,
      type: 'number' as const,
      placeholder: typeof input.placeholder === 'object' ? input.placeholder.metric : input.placeholder,
      placeholderMetric: typeof input.placeholder === 'object' ? input.placeholder.metric : input.placeholder,
      placeholderImperial: typeof input.placeholder === 'object' ? input.placeholder.imperial : input.placeholder,
    })),
    formula: {
      id: 'default',
      type: 'function' as const,
      value: 'calculate',
      label: 'Default Calculator Function',
    },
    resultUnit: '',
    resultUnitMetric: '',
    resultUnitImperial: '',
  };
};

// Evaluate formula node to calculate result
const evaluateFormula = (node: FormulaNode, inputs: Record<string, number>): number => {
  if (!node) return 0;

  if (node.type === 'number') {
    return parseFloat(node.value) || 0;
  }

  if (node.type === 'input') {
    return inputs[node.value] || 0;
  }

  if (node.type === 'operator' && node.children && node.children.length === 2) {
    const left = evaluateFormula(node.children[0], inputs);
    const right = evaluateFormula(node.children[1], inputs);

    switch (node.value) {
      case '+': return left + right;
      case '-': return left - right;
      case '*': return left * right;
      case '/': return right !== 0 ? left / right : 0;
      default: return 0;
    }
  }

  return 0;
};

// Convert admin calculator to app calculator format
const convertToAppFormat = (config: CalculatorConfigExtended, unitSystem: UnitSystem): Calculator => {
  return {
    id: config.id,
    name: config.name,
    shortName: config.shortName || config.name.substring(0, 3),
    description: config.description || '',
    categories: config.categories,
    inputs: config.inputs.map(input => ({
      label: input.label,
      key: input.name,
      unit: { 
        metric: input.unitMetric || input.unit, 
        imperial: input.unitImperial || input.unit 
      },
      placeholder: { 
        metric: input.placeholderMetric || input.placeholder || '', 
        imperial: input.placeholderImperial || input.placeholder || '' 
      },
      tooltip: '',
      min: 0,
      max: 1000,
      step: 0.1,
    })),
    calculate: (inputs: Record<string, number>, calcUnitSystem: UnitSystem) => {
      // If it's a default calculator with a function, use the original calculate
      const defaultCalc = defaultCalculators.find(c => c.id === config.id);
      if (defaultCalc && config.formula.type === 'function') {
        return defaultCalc.calculate(inputs, calcUnitSystem);
      }

      // Otherwise evaluate the custom formula
      const result = evaluateFormula(config.formula, inputs);
      
      return {
        label: config.shortName || config.name.substring(0, 3),
        value: result,
        unit: { 
          metric: config.resultUnitMetric || config.resultUnit, 
          imperial: config.resultUnitImperial || config.resultUnit 
        },
        scale: {
          min: 0,
          max: result * 2 || 100,
          optimal: { min: result * 0.8, max: result * 1.2 },
        },
      };
    },
  };
};

export const [CalculatorsProvider, useCalculators] = createContextHook(() => {
  const [adminCalculators, setAdminCalculators] = useState<CalculatorConfigExtended[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUnitSystem, setCurrentUnitSystem] = useState<UnitSystem>('metric');

  const loadCalculators = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('admin_calculators');
      
      if (stored) {
        const parsed = JSON.parse(stored);
        // Parse dates
        const calculators = parsed.map((calc: any) => ({
          ...calc,
          lastModified: new Date(calc.lastModified),
        }));
        setAdminCalculators(calculators);
      } else {
        // Initialize with default calculators in admin format
        const defaultAdminCalcs = defaultCalculators.map(convertToAdminFormat);
        setAdminCalculators(defaultAdminCalcs);
        await AsyncStorage.setItem('admin_calculators', JSON.stringify(defaultAdminCalcs));
      }
    } catch (error) {
      console.error('Failed to load calculators:', error);
      // Fallback to default calculators
      const defaultAdminCalcs = defaultCalculators.map(convertToAdminFormat);
      setAdminCalculators(defaultAdminCalcs);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalculators();
  }, [loadCalculators]);

  // Convert admin calculators to app format with current unit system
  const calculators = useMemo(() => {
    return adminCalculators
      .filter(calc => calc.enabled)
      .map(calc => convertToAppFormat(calc, currentUnitSystem));
  }, [adminCalculators, currentUnitSystem]);

  // Get unique categories
  const categories = useMemo(() => {
    const allCategories = calculators.flatMap(c => c.categories);
    return Array.from(new Set(allCategories));
  }, [calculators]);

  // Track calculator usage
  const trackUsage = useCallback(async (calculatorId: string) => {
    try {
      setAdminCalculators(prev => {
        const updated = prev.map(calc => 
          calc.id === calculatorId 
            ? { ...calc, usageCount: calc.usageCount + 1 }
            : calc
        );
        // Save to storage asynchronously
        AsyncStorage.setItem('admin_calculators', JSON.stringify(updated)).catch(error => {
          console.error('Failed to save calculator usage:', error);
        });
        return updated;
      });
    } catch (error) {
      console.error('Failed to track calculator usage:', error);
    }
  }, []);

  // Reload calculators (useful when admin makes changes)
  const reloadCalculators = useCallback(() => {
    setIsLoading(true);
    loadCalculators();
  }, [loadCalculators]);
  
  // Force refresh calculators from storage
  const refreshCalculators = useCallback(async () => {
    try {
      setIsLoading(true);
      const stored = await AsyncStorage.getItem('admin_calculators');
      if (stored) {
        const parsed = JSON.parse(stored);
        const calculators = parsed.map((calc: any) => ({
          ...calc,
          lastModified: new Date(calc.lastModified),
        }));
        setAdminCalculators(calculators);
      }
    } catch (error) {
      console.error('Failed to refresh calculators:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
    isLoading,
    trackUsage,
    reloadCalculators,
    refreshCalculators,
    getCalculatorById,
    getCalculatorsByCategory,
    updateUnitSystem,
    currentUnitSystem,
  }), [calculators, categories, isLoading, trackUsage, reloadCalculators, refreshCalculators, getCalculatorById, getCalculatorsByCategory, updateUnitSystem, currentUnitSystem]);
});