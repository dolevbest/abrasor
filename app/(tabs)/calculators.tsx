import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Search, Settings, RefreshCw, X } from 'lucide-react-native';

import { useCalculators } from '@/hooks/calculators-context';
import CalculatorCard from '@/components/CalculatorCard';
import { useTheme } from '@/hooks/theme-context';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useSettings } from '@/hooks/settings-context';
export default function CalculatorsScreen() {
  const { theme } = useTheme();
  const { calculators, categories, isLoading, reloadCalculators, updateUnitSystem, clearCorruptedCalculators } = useCalculators();
  const { unitSystem } = useSettings();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load calculators only once on mount
  useEffect(() => {
    if (reloadCalculators) {
      reloadCalculators();
    }
  }, [reloadCalculators]);

  // Sync unit system from settings to calculators context
  useEffect(() => {
    if (updateUnitSystem) {
      updateUnitSystem(unitSystem);
    }
  }, [unitSystem, updateUnitSystem]);

  // Check for updates periodically but don't auto-refresh
  useEffect(() => {
    const checkForUpdates = async () => {
      // This could check a timestamp or version number
      // For now, we'll rely on admin notifications
    };
    
    const interval = setInterval(checkForUpdates, 10000); // Check every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      if (reloadCalculators) {
        await reloadCalculators();
      }
      setHasUpdates(false);
      // Small delay to show the refresh animation
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Failed to refresh calculators:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCorrupted = async () => {
    if (isClearing) return;
    
    setIsClearing(true);
    try {
      if (clearCorruptedCalculators) {
        const result = await clearCorruptedCalculators();
        console.log('Cleared corrupted calculators:', result);
      }
    } catch (error) {
      console.error('Failed to clear corrupted calculators:', error);
    } finally {
      setIsClearing(false);
    }
  };



  const filteredCalculators = calculators.filter(calc => {
    const searchTerm = searchQuery?.trim() || '';
    const categoryFilter = selectedCategory?.trim() || '';
    
    const matchesSearch = !searchTerm || 
      calc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calc.shortName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || calc.categories.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleManualRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
            progressViewOffset={0}
          />
        }
      >
      {/* Search Bar and Theme Toggle */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <View style={[styles.searchBar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Search size={20} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text, fontSize: theme.fontSizes.medium }]}
              placeholder="Search calculators..."
              placeholderTextColor={theme.inputPlaceholder}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                style={styles.clearSearchButton}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[
              styles.refreshButton, 
              { backgroundColor: theme.surface, borderColor: theme.border },
              hasUpdates && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={handleManualRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <RefreshCw 
                size={20} 
                color={hasUpdates ? theme.primaryText : theme.text} 
              />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.themeToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
            onPress={() => setShowThemeSelector(!showThemeSelector)}
          >
            <Settings size={20} color={theme.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Theme Selector */}
      {showThemeSelector && (
        <View style={styles.themeSelectorContainer}>
          <ThemeSelector />
        </View>
      )}

      {/* Categories */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesScrollView}
        contentContainerStyle={styles.categoriesContent}
      >
        <TouchableOpacity
          style={[
            styles.categoryChip,
            { backgroundColor: theme.surface, borderColor: theme.border },
            !selectedCategory && { backgroundColor: theme.primary, borderColor: theme.primary }
          ]}
          onPress={() => setSelectedCategory(null)}
        >
          <Text style={[
            styles.categoryText,
            { color: theme.text, fontSize: theme.fontSizes.medium },
            !selectedCategory && { color: theme.primaryText }
          ]}>All</Text>
        </TouchableOpacity>
        {categories.map(category => (
          <TouchableOpacity
            key={category}
            style={[
              styles.categoryChip,
              { backgroundColor: theme.surface, borderColor: theme.border },
              selectedCategory === category && { backgroundColor: theme.primary, borderColor: theme.primary }
            ]}
            onPress={() => {
              const validCategory = category?.trim();
              if (validCategory && validCategory.length <= 50) {
                setSelectedCategory(validCategory);
              }
            }}
          >
            <Text style={[
              styles.categoryText,
              { color: theme.text, fontSize: theme.fontSizes.medium },
              selectedCategory === category && { color: theme.primaryText }
            ]}>{category}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Calculators List */}
      <View style={styles.calculatorsList}>
        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>Loading calculators...</Text>
          </View>
        ) : filteredCalculators.length > 0 ? (
          filteredCalculators.map(calculator => (
            <CalculatorCard key={calculator.id} calculator={calculator} searchQuery={searchQuery} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: theme.text, fontSize: theme.fontSizes.subtitle }]}>No calculators found</Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>
              {calculators.length === 0 
                ? 'No calculators have been added yet. Admin can add calculators from the admin panel.'
                : 'Try adjusting your search or filters'}
            </Text>
            {calculators.length === 0 && (
              <TouchableOpacity
                style={[styles.clearCorruptedButton, { backgroundColor: theme.error, marginTop: 16 }]}
                onPress={handleClearCorrupted}
                disabled={isClearing}
              >
                {isClearing ? (
                  <ActivityIndicator size="small" color={theme.primaryText} />
                ) : (
                  <Text style={[styles.clearButtonText, { color: theme.primaryText }]}>Clear Corrupted Data</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  pullToRefreshIndicator: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  refreshContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  pullToRefreshText: {
    fontSize: 14,
    fontWeight: '500' as const,
    marginTop: 12,
    textAlign: 'center' as const,
  },
  refreshIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    width: 200,
    height: 3,
    borderRadius: 2,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  content: {
    paddingBottom: 32,
    flexGrow: 1,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  themeToggle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  refreshButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  themeSelectorContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
  },
  clearSearchButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoriesScrollView: {
    maxHeight: 60,
    flexGrow: 0,
  },
  categoriesContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    fontWeight: '500' as const,
    whiteSpace: 'nowrap' as const,
    textAlign: 'center' as const,
  },
  calculatorsList: {
    padding: 16,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  loadingState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 12,
  },
  clearCorruptedButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    fontWeight: '600' as const,
    fontSize: 14,
  },
});