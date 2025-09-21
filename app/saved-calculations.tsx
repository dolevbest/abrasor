import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
  PanResponder,
  Animated,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { 
  Trash2, 
  Download, 
  Calendar,
  Calculator,
  ChevronRight
} from 'lucide-react-native';
import { Shadows } from '@/constants/colors';
import { useCalculations, SavedCalculation } from '@/hooks/calculations-context';
import { useAuth } from '@/hooks/auth-context';
import { useTheme } from '@/hooks/theme-context';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

interface SwipeableCardProps {
  calculation: SavedCalculation;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onDelete: () => void;
  onExportPDF: () => void;
  theme: any;
  formatDate: (date: Date) => string;
}

const SwipeableCard = React.memo(function SwipeableCard({ 
  calculation, 
  isExpanded, 
  onToggleExpand, 
  onDelete, 
  onExportPDF, 
  theme, 
  formatDate 
}: SwipeableCardProps) {
  const { width: screenWidth } = useWindowDimensions();
  const translateX = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [isSwipeActive, setIsSwipeActive] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);
  const isAnimating = useRef(false);
  const lastDirection = useRef<'left' | 'right' | null>(null);
  const startX = useRef(0);
  const isTap = useRef(true);

  // Handle expand/collapse animation
  React.useEffect(() => {
    Animated.timing(rotateAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, rotateAnim]);

  const resetCard = useCallback(() => {
    if (isAnimating.current) return;
    isAnimating.current = true;
    
    translateX.flattenOffset();
    
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 100,
      friction: 7,
      velocity: 0,
    }).start(() => {
      translateX.setOffset(0);
      isAnimating.current = false;
      setIsSwipeActive(false);
      setSwipeDirection(null);
      lastDirection.current = null;
      isTap.current = true;
    });
  }, [translateX]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gestureState) => {
      const { dx, dy } = gestureState;
      // Only capture if horizontal movement is significant
      const shouldCapture = Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5;
      if (shouldCapture) {
        isTap.current = false;
      }
      return shouldCapture;
    },
    onPanResponderGrant: (evt) => {
      if (isAnimating.current) return;
      startX.current = evt.nativeEvent.pageX;
      isTap.current = true;
      
      translateX.stopAnimation();
      translateX.setOffset(0);
      translateX.setValue(0);
      setIsSwipeActive(true);
    },
    onPanResponderMove: (evt, gestureState) => {
      if (isAnimating.current) return;
      
      const { dx } = gestureState;
      
      // Mark as not a tap if moved significantly
      if (Math.abs(dx) > 8) {
        isTap.current = false;
      }
      
      // Apply resistance at edges
      const resistance = 0.6;
      const maxSwipe = screenWidth * 0.4;
      let translationX = dx;
      
      if (Math.abs(dx) > maxSwipe) {
        const overflow = Math.abs(dx) - maxSwipe;
        const resistedOverflow = overflow * resistance;
        translationX = dx > 0 
          ? maxSwipe + resistedOverflow
          : -(maxSwipe + resistedOverflow);
      }
      
      translateX.setValue(translationX);
      
      // Update swipe direction indicator
      const newDirection = Math.abs(dx) > 30 ? (dx > 0 ? 'right' : 'left') : null;
      if (newDirection !== lastDirection.current) {
        lastDirection.current = newDirection;
        setSwipeDirection(newDirection);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (isAnimating.current) return;
      
      const { dx, vx } = gestureState;
      
      // Check if it's a tap
      if (isTap.current && Math.abs(dx) < 8) {
        resetCard();
        onToggleExpand();
        return;
      }
      
      const threshold = screenWidth * 0.25;
      const velocityThreshold = 0.3;
      
      const shouldTriggerAction = 
        (Math.abs(dx) > threshold || Math.abs(vx) > velocityThreshold) && 
        !isTap.current;
      
      if (shouldTriggerAction) {
        isAnimating.current = true;
        const direction = dx > 0 ? 'right' : 'left';
        
        Animated.timing(translateX, {
          toValue: direction === 'right' ? screenWidth * 0.8 : -screenWidth * 0.8,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Trigger action
          setTimeout(() => {
            if (direction === 'right') {
              onExportPDF();
            } else {
              onDelete();
            }
          }, 50);
          
          // Reset after action
          setTimeout(() => {
            translateX.setValue(0);
            translateX.setOffset(0);
            isAnimating.current = false;
            setIsSwipeActive(false);
            setSwipeDirection(null);
            lastDirection.current = null;
            isTap.current = true;
          }, 300);
        });
      } else {
        resetCard();
      }
    },
    onPanResponderTerminate: () => {
      resetCard();
    },
  }), [screenWidth, translateX, onExportPDF, onDelete, onToggleExpand, resetCard]);



  const leftActionOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-screenWidth * 0.4, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });
  }, [translateX, screenWidth]);

  const rightActionOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 50, screenWidth * 0.4],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });
  }, [translateX, screenWidth]);

  const leftActionScale = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-screenWidth * 0.4, -50, 0],
      outputRange: [1.1, 1, 0.95],
      extrapolate: 'clamp',
    });
  }, [translateX, screenWidth]);

  const rightActionScale = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 50, screenWidth * 0.4],
      outputRange: [0.95, 1, 1.1],
      extrapolate: 'clamp',
    });
  }, [translateX, screenWidth]);

  const leftBackgroundOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [-screenWidth * 0.4, -50, 0],
      outputRange: [1, 0.3, 0],
      extrapolate: 'clamp',
    });
  }, [translateX, screenWidth]);

  const rightBackgroundOpacity = useMemo(() => {
    return translateX.interpolate({
      inputRange: [0, 50, screenWidth * 0.4],
      outputRange: [0, 0.3, 1],
      extrapolate: 'clamp',
    });
  }, [translateX, screenWidth]);

  const chevronRotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });



  return (
    <View style={styles.swipeContainer}>
      {/* Background actions */}
      <View style={[styles.actionsContainer, { backgroundColor: theme.surface }]}>
        {/* Delete action background (left) */}
        <Animated.View 
          style={[
            styles.actionBackgroundLeft,
            { 
              backgroundColor: swipeDirection === 'left' ? '#DC2626' : '#EF4444',
              opacity: leftBackgroundOpacity,
            }
          ]}
        />
        
        {/* Export action background (right) */}
        <Animated.View 
          style={[
            styles.actionBackgroundRight,
            { 
              backgroundColor: swipeDirection === 'right' ? '#059669' : '#10B981',
              opacity: rightBackgroundOpacity,
            }
          ]}
        />
        
        {/* Export action content (left) */}
        <Animated.View 
          style={[
            styles.actionLeft,
            { 
              opacity: rightActionOpacity,
              transform: [{ scale: rightActionScale }],
            }
          ]}
        >
          <Download size={24} color="white" />
          <Text style={styles.actionText}>Export to PDF</Text>
        </Animated.View>
        
        {/* Delete action content (right) */}
        <Animated.View 
          style={[
            styles.actionRight,
            { 
              opacity: leftActionOpacity,
              transform: [{ scale: leftActionScale }],
            }
          ]}
        >
          <Trash2 size={24} color="white" />
          <Text style={styles.actionText}>Delete</Text>
        </Animated.View>
      </View>
      
      {/* Main card */}
      <Animated.View
        style={[
          { transform: [{ translateX }] },
          isSwipeActive && styles.swipingCard
        ]}
        {...panResponder.panHandlers}
      >
        <View
          style={[
            styles.card, 
            { 
              backgroundColor: theme.surface,
            }, 
            Shadows.small
          ]}
        >
          <View style={styles.cardHeader}>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{calculation.calculatorName}</Text>
              <Text style={[styles.cardSubtitle, { color: theme.primary }]}>{calculation.calculatorShortName}</Text>
              <View style={styles.cardMeta}>
                <Calendar size={14} color={theme.textSecondary} />
                <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{formatDate(calculation.savedAt)}</Text>
              </View>
            </View>
            <Animated.View
              style={[styles.chevronContainer, {
                transform: [{ rotate: chevronRotation }]
              }]}
            >
              <ChevronRight 
                size={20} 
                color={theme.textSecondary}
              />
            </Animated.View>
          </View>

          <View style={[styles.cardResult, { backgroundColor: theme.background }]}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Result</Text>
            <Text style={[styles.resultValue, { color: theme.primary }]}>
              {calculation.result.value?.toFixed(4) || '—'} {calculation.result.unit[calculation.unitSystem]}
            </Text>
          </View>

          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: theme.border }]}>
              <View style={styles.inputsSection}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Input Values</Text>
                {Object.entries(calculation.inputs).map(([key, value]) => (
                  <View key={key} style={styles.inputRow}>
                    <Text style={[styles.inputKey, { color: theme.textSecondary }]}>{key}:</Text>
                    <Text style={[styles.inputValue, { color: theme.text }]}>{value}</Text>
                  </View>
                ))}
              </View>

              {calculation.result.scale && (
                <View style={styles.scaleSection}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Scale Analysis</Text>
                  <Text style={[styles.scaleText, { color: theme.text }]}>
                    Range: {calculation.result.scale.min.toFixed(2)} - {calculation.result.scale.max.toFixed(2)}
                  </Text>
                  <Text style={[styles.scaleText, { color: theme.text }]}>
                    Optimal: {calculation.result.scale.optimal.min.toFixed(2)} - {calculation.result.scale.optimal.max.toFixed(2)}
                  </Text>
                </View>
              )}

              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.background, borderColor: theme.border }]}
                  onPress={onExportPDF}
                >
                  <Download size={18} color={theme.primary} />
                  <Text style={[styles.actionButtonText, { color: theme.primary }]}>Download PDF</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: theme.error + '10', borderColor: theme.error + '30' }]}
                  onPress={onDelete}
                >
                  <Trash2 size={18} color={theme.error} />
                  <Text style={[styles.actionButtonText, { color: theme.error }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
});

export default function SavedCalculationsScreen() {
  const { savedCalculations, deleteCalculation, clearAllCalculations } = useCalculations();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const formatDate = useCallback((date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }, []);

  const handleDelete = useCallback((id: string) => {
    Alert.alert(
      'Delete Calculation',
      'Are you sure you want to delete this saved calculation?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => deleteCalculation(id)
        }
      ]
    );
  }, [deleteCalculation]);

  const handleClearAll = useCallback(() => {
    Alert.alert(
      'Clear All',
      'Are you sure you want to delete all saved calculations?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: clearAllCalculations
        }
      ]
    );
  }, [clearAllCalculations]);

  const generatePDFContent = useCallback((calculation: SavedCalculation) => {
    const inputsHtml = Object.entries(calculation.inputs)
      .map(([key, value]) => `
        <tr>
          <td style="padding: 8px; border: 1px solid #fca5a5;">${key}</td>
          <td style="padding: 8px; border: 1px solid #fca5a5;">${value}</td>
        </tr>
      `).join('');

    const scaleHtml = calculation.result.scale ? `
      <div style="margin-top: 20px;">
        <h3 style="color: #dc2626;">Scale Analysis</h3>
        <p>Min: ${calculation.result.scale.min.toFixed(2)}</p>
        <p>Max: ${calculation.result.scale.max.toFixed(2)}</p>
        <p>Optimal Range: ${calculation.result.scale.optimal.min.toFixed(2)} - ${calculation.result.scale.optimal.max.toFixed(2)}</p>
      </div>
    ` : '';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${calculation.calculatorName} - Calculation Report</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              color: #333;
            }
            h1 { color: #dc2626; }
            h2 { color: #dc2626; margin-top: 30px; }
            h3 { color: #dc2626; }
            .header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #dc2626;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header-content {
              flex: 1;
            }
            .logo {
              width: 60px;
              height: 60px;
              margin-left: 20px;
            }
            .info-row {
              margin: 10px 0;
              font-size: 14px;
            }
            .result-box {
              background: #fef2f2;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              border: 2px solid #dc2626;
            }
            .result-value {
              font-size: 32px;
              font-weight: bold;
              color: #dc2626;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
            }
            th {
              background: #dc2626;
              color: white;
              padding: 10px;
              text-align: left;
            }
            td {
              background: #fef2f2;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="header-content">
              <h1>Abrasor Calculation Report</h1>
              <div class="info-row"><strong>User:</strong> ${user?.name || 'Unknown'}</div>
              <div class="info-row"><strong>Email:</strong> ${user?.email || 'Unknown'}</div>
              <div class="info-row"><strong>Date:</strong> ${formatDate(calculation.savedAt)}</div>
            </div>
            <img src="https://i.imgur.com/black-abrasor-logo.png" alt="Abrasor Logo" class="logo" />
          </div>

          <h2>${calculation.calculatorName}</h2>
          <p><strong>${calculation.calculatorShortName}</strong></p>
          
          <h3>Input Values</h3>
          <table>
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              ${inputsHtml}
            </tbody>
          </table>

          <div class="result-box">
            <h3>Result</h3>
            <div class="result-value">
              ${calculation.result.value?.toFixed(4) || '—'} ${calculation.result.unit[calculation.unitSystem]}
            </div>
            <p>Unit System: ${calculation.unitSystem === 'metric' ? 'Metric' : 'Imperial'}</p>
          </div>

          ${scaleHtml}

          ${calculation.notes ? `
            <div style="margin-top: 30px;">
              <h3 style="color: #dc2626;">Notes</h3>
              <p>${calculation.notes}</p>
            </div>
          ` : ''}

          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #fca5a5; font-size: 12px; color: #666;">
            <p>Generated by Abrasor Calculator System</p>
            <p>${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `;
  }, [user, formatDate]);

  const handleDownloadPDF = useCallback(async (calculation: SavedCalculation) => {
    try {
      const html = generatePDFContent(calculation);
      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Save Calculation Report'
        });
      } else {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = uri;
        link.download = `${calculation.calculatorName}_${Date.now()}.pdf`;
        link.click();
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  }, [generatePDFContent]);

  const handleDownloadAllPDF = useCallback(async () => {
    if (savedCalculations.length === 0) {
      Alert.alert('No Data', 'No calculations to export.');
      return;
    }

    try {
      const allCalculationsHtml = savedCalculations.map(calc => {
        const inputsHtml = Object.entries(calc.inputs)
          .map(([key, value]) => `${key}: ${value}`).join(', ');
        
        return `
          <div style="page-break-after: always; margin-bottom: 30px;">
            <h2>${calc.calculatorName}</h2>
            <p><strong>Date:</strong> ${formatDate(calc.savedAt)}</p>
            <p><strong>Inputs:</strong> ${inputsHtml}</p>
            <p><strong>Result:</strong> ${calc.result.value?.toFixed(4) || '—'} ${calc.result.unit[calc.unitSystem]}</p>
            <hr style="margin: 20px 0;">
          </div>
        `;
      }).join('');

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>All Calculations Report</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
              h1 { color: #dc2626; }
              h2 { color: #dc2626; margin-top: 20px; }
              .header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                border-bottom: 2px solid #dc2626;
                padding-bottom: 20px;
                margin-bottom: 30px;
              }
              .header-content {
                flex: 1;
              }
              .logo {
                width: 60px;
                height: 60px;
                margin-left: 20px;
              }
              hr {
                border: none;
                border-top: 1px solid #fca5a5;
                margin: 20px 0;
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="header-content">
                <h1>Abrasor - All Calculations Report</h1>
                <p><strong>User:</strong> ${user?.name}</p>
                <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
              </div>
              <img src="https://i.imgur.com/black-abrasor-logo.png" alt="Abrasor Logo" class="logo" />
            </div>
            ${allCalculationsHtml}
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        await Sharing.shareAsync(uri, {
          UTI: '.pdf',
          mimeType: 'application/pdf',
          dialogTitle: 'Save All Calculations Report'
        });
      } else {
        const link = document.createElement('a');
        link.href = uri;
        link.download = `all_calculations_${Date.now()}.pdf`;
        link.click();
      }
    } catch {
      Alert.alert('Error', 'Failed to generate PDF. Please try again.');
    }
  }, [savedCalculations, user, formatDate]);

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Saved Calculations',
          headerRight: () => (
            <View style={styles.headerButtons}>
              <TouchableOpacity onPress={handleDownloadAllPDF} style={styles.headerButton}>
                <Download size={20} color={theme.primary} />
              </TouchableOpacity>
              {savedCalculations.length > 0 && (
                <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
                  <Trash2 size={20} color={theme.error} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }} 
      />
      
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.content}>
          {savedCalculations.length === 0 ? (
            <View style={styles.emptyState}>
              <Calculator size={48} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Calculations</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Save calculations from the calculator screen to view them here
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.summary}>
                <Text style={[styles.summaryText, { color: theme.textSecondary }]}>
                  {savedCalculations.length} saved calculation{savedCalculations.length !== 1 ? 's' : ''}
                </Text>
              </View>

              <View style={styles.swipeHint}>
                <Text style={[styles.swipeHintText, { color: theme.textSecondary }]}>
                  💡 Swipe right to export PDF • Swipe left to delete • Tap to expand
                </Text>
              </View>

              {savedCalculations.map((calculation) => {
                const toggleExpand = () => setExpandedId(expandedId === calculation.id ? null : calculation.id);
                const deleteCalc = () => handleDelete(calculation.id);
                const exportPDF = () => handleDownloadPDF(calculation);
                
                return (
                  <SwipeableCard
                    key={calculation.id}
                    calculation={calculation}
                    isExpanded={expandedId === calculation.id}
                    onToggleExpand={toggleExpand}
                    onDelete={deleteCalc}
                    onExportPDF={exportPDF}
                    theme={theme}
                    formatDate={formatDate}
                  />
                );
              })}
            </>
          )}
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    padding: 4,
  },
  summary: {
    marginBottom: 16,
  },
  summaryText: {
    fontSize: 14,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 12,
  },

  cardResult: {
    borderRadius: 8,
    padding: 12,
  },
  resultLabel: {
    fontSize: 11,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  resultValue: {
    fontSize: 20,
    fontWeight: '600' as const,
  },
  expandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  inputsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    marginBottom: 8,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  inputKey: {
    fontSize: 14,
  },
  inputValue: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  scaleSection: {
    marginBottom: 16,
  },
  scaleText: {
    fontSize: 14,
    marginBottom: 4,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  swipeContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  actionsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 12,
    overflow: 'hidden',
  },
  actionBackgroundLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  actionBackgroundRight: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
  actionLeft: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionRight: {
    position: 'absolute',
    right: 20,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600' as const,
  },
  chevronContainer: {
    padding: 4,
  },
  swipingCard: {
    elevation: 8,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  swipeHint: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  swipeHintText: {
    fontSize: 13,
    textAlign: 'center',
    fontStyle: 'italic' as const,
  },
});