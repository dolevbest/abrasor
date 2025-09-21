import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { Info, RotateCcw, Save } from 'lucide-react-native';
import { Calculator, UnitSystem } from '@/types';
import { Shadows } from '@/constants/colors';
import { useSettings } from '@/hooks/settings-context';
import { useCalculations } from '@/hooks/calculations-context';
import { useTheme } from '@/hooks/theme-context';

interface CalculatorCardProps {
  calculator: Calculator;
  searchQuery?: string;
}

interface HighlightedTextProps {
  text: string;
  searchQuery: string;
  style: any;
  highlightStyle?: any;
}

function HighlightedText({ text, searchQuery, style, highlightStyle }: HighlightedTextProps) {
  if (!searchQuery.trim()) {
    return <Text style={style}>{text}</Text>;
  }

  const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <Text style={style}>
      {parts.map((part, index) => {
        const isHighlight = regex.test(part);
        return (
          <Text
            key={index}
            style={isHighlight ? [style, highlightStyle] : style}
          >
            {part}
          </Text>
        );
      })}
    </Text>
  );
}

export default function CalculatorCard({ calculator, searchQuery = '' }: CalculatorCardProps) {
  const { unitSystem } = useSettings();
  const { saveCalculation } = useCalculations();
  const { theme } = useTheme();
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const handleInputChange = useCallback((key: string, value: string) => {
    // Allow only numbers and decimal point
    const cleaned = value.replace(/[^0-9.]/g, '');
    setInputs(prev => ({ ...prev, [key]: cleaned }));
  }, []);

  const handleReset = useCallback(() => {
    setInputs({});
  }, []);

  const result = useMemo(() => {
    const numericInputs: Record<string, number> = {};
    for (const input of calculator.inputs) {
      const value = parseFloat(inputs[input.key] || '0');
      if (isNaN(value) || value === 0) {
        return calculator.calculate({}, unitSystem);
      }
      numericInputs[input.key] = value;
    }
    return calculator.calculate(numericInputs, unitSystem);
  }, [inputs, calculator, unitSystem]);

  const handleSave = useCallback(async () => {
    const numericInputs: Record<string, number> = {};
    let hasValidInputs = false;
    
    for (const input of calculator.inputs) {
      const value = parseFloat(inputs[input.key] || '0');
      if (!isNaN(value) && value !== 0) {
        numericInputs[input.key] = value;
        hasValidInputs = true;
      }
    }

    if (!hasValidInputs) {
      Alert.alert('No Data', 'Please enter values before saving the calculation.');
      return;
    }

    try {
      await saveCalculation({
        calculatorId: calculator.id,
        calculatorName: calculator.name,
        calculatorShortName: calculator.shortName,
        inputs: numericInputs,
        result,
        unitSystem,
      });
      Alert.alert('Success', 'Calculation saved to your profile!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save calculation. Please try again.');
    }
  }, [calculator, inputs, result, unitSystem, saveCalculation]);

  const renderScaleBar = () => {
    if (!result.value || !result.scale) return null;

    const { min, max, optimal } = result.scale;
    const position = Math.max(0, Math.min(100, ((result.value - min) / (max - min)) * 100));
    const optimalStart = ((optimal.min - min) / (max - min)) * 100;
    const optimalWidth = ((optimal.max - optimal.min) / (max - min)) * 100;

    return (
      <View style={styles.scaleContainer}>
        <View style={[styles.scaleBar, { backgroundColor: theme.border }]}>
          <View 
            style={[
              styles.scaleOptimal, 
              { left: `${optimalStart}%`, width: `${optimalWidth}%`, backgroundColor: theme.success + '30' }
            ]} 
          />
          <View style={[styles.scaleDot, { left: `${position}%`, backgroundColor: theme.primary }]} />
        </View>
        <View style={styles.scaleLabels}>
          <Text style={[styles.scaleLabel, { color: theme.textSecondary, fontSize: theme.fontSizes.caption }]}>{min.toFixed(1)}</Text>
          <Text style={[styles.scaleLabel, { color: theme.textSecondary, fontSize: theme.fontSizes.caption }]}>{max.toFixed(1)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.medium]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <HighlightedText
            text={calculator.name}
            searchQuery={searchQuery}
            style={[styles.title, { color: theme.text, fontSize: theme.fontSizes.subtitle }]}
            highlightStyle={[styles.highlight, { backgroundColor: '#ffcccc' }]}
          />
          <HighlightedText
            text={calculator.shortName}
            searchQuery={searchQuery}
            style={[styles.subtitle, { color: theme.primary, fontSize: theme.fontSizes.medium }]}
            highlightStyle={[styles.highlight, { backgroundColor: '#ffcccc' }]}
          />
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: theme.background }]}>
            <Save size={20} color={theme.success} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleReset} style={[styles.resetButton, { backgroundColor: theme.background }]}>
            <RotateCcw size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.categoriesContainer}>
        {calculator.categories.map((category, index) => (
          <View key={index} style={[styles.categoryBadge, { backgroundColor: theme.background }]}>
            <Text style={[styles.categoryText, { color: theme.primary, fontSize: theme.fontSizes.caption }]}>{category}</Text>
          </View>
        ))}
      </View>

      <Text style={[styles.description, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>{calculator.description}</Text>

      <View style={styles.inputsContainer}>
        {calculator.inputs.map((input) => (
          <View key={input.key} style={styles.inputGroup}>
            <View style={styles.inputHeader}>
              <Text style={[styles.inputLabel, { color: theme.text, fontSize: theme.fontSizes.medium }]}>{input.label}</Text>
              <TouchableOpacity
                onPress={() => setShowTooltip(showTooltip === input.key ? null : input.key)}
                style={styles.infoButton}
              >
                <Info size={16} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            
            {showTooltip === input.key && (
              <View style={[styles.tooltip, { backgroundColor: theme.primary }]}>
                <Text style={[styles.tooltipText, { color: theme.primaryText, fontSize: theme.fontSizes.small }]}>{input.tooltip}</Text>
              </View>
            )}

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, { 
                  backgroundColor: theme.inputBackground, 
                  borderColor: theme.inputBorder, 
                  color: theme.inputText,
                  fontSize: theme.fontSizes.medium 
                }]}
                value={inputs[input.key] || ''}
                onChangeText={(value) => handleInputChange(input.key, value)}
                placeholder={input.placeholder[unitSystem]}
                placeholderTextColor={theme.inputPlaceholder}
                keyboardType="decimal-pad"
              />
              <Text style={[styles.unit, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>{input.unit[unitSystem]}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={[styles.resultContainer, { backgroundColor: theme.background }]}>
        <Text style={[styles.resultLabel, { color: theme.textSecondary, fontSize: theme.fontSizes.small }]}>Result</Text>
        <View style={styles.resultRow}>
          <Text style={[styles.resultValue, { color: theme.primary, fontSize: theme.fontSizes.title }]}>
            {result.value !== null ? result.value.toFixed(4) : '—'}
          </Text>
          <Text style={[styles.resultUnit, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>
            {result.unit[unitSystem]}
          </Text>
        </View>
        {renderScaleBar()}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 2,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 6,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  description: {
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  saveButton: {
    padding: 8,
    borderRadius: 8,
  },
  resetButton: {
    padding: 8,
    borderRadius: 8,
  },
  inputsContainer: {
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    flex: 1,
  },
  infoButton: {
    padding: 4,
  },
  tooltip: {
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  unit: {
    marginLeft: 12,
    fontSize: 14,
    minWidth: 50,
  },
  resultContainer: {
    borderRadius: 8,
    padding: 16,
  },
  resultLabel: {
    fontSize: 12,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  resultValue: {
    fontSize: 28,
    fontWeight: '600' as const,
  },
  resultUnit: {
    fontSize: 16,
    marginLeft: 8,
  },
  scaleContainer: {
    marginTop: 16,
  },
  scaleBar: {
    height: 8,
    borderRadius: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  scaleOptimal: {
    position: 'absolute',
    height: '100%',
  },
  scaleDot: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    top: -4,
    marginLeft: -8,
  },
  scaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleLabel: {
    fontSize: 10,
  },
  highlight: {
    backgroundColor: '#ffcccc',
    borderRadius: 3,
    paddingHorizontal: 2,
  },
});