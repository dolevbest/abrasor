import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
  PanResponder,
  useWindowDimensions,
  Image,
  Easing,
} from 'react-native';
import { Search, Settings, RefreshCw, X, Menu, Bell, User, Shield, Calculator, LogOut, UserPlus, TestTube } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useCalculators } from '@/hooks/calculators-context';
import CalculatorCard from '@/components/CalculatorCard';
import { useTheme } from '@/hooks/theme-context';
import { ThemeSelector } from '@/components/ThemeSelector';
import { useSettings } from '@/hooks/settings-context';
import { useAuth } from '@/hooks/auth-context';
import { useNotifications } from '@/hooks/notifications-context';
import AbrasorLogo from '@/components/AbrasorLogo';
import UnitToggle from '@/components/UnitToggle';
import GuestUpgradeForm from '@/components/GuestUpgradeForm';
import { trpc } from '@/lib/trpc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';



export default function MainScreen() {
  const { theme } = useTheme();
  const { calculators, categories, isLoading, reloadCalculators, updateUnitSystem } = useCalculators();
  const { unitSystem } = useSettings();
  const { isAuthenticated, user, isGuest, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const { width: screenWidth } = useWindowDimensions();
  const MENU_WIDTH = screenWidth * 0.8;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasUpdates, setHasUpdates] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showUpgradeForm, setShowUpgradeForm] = useState(false);
  const [showDebugButtons, setShowDebugButtons] = useState(false);
  const menuAnimation = useState(new Animated.Value(-MENU_WIDTH))[0];
  const overlayAnimation = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (!isAuthenticated && !isGuest) {
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, isGuest]);

  // Load calculators only once on mount - with delay to prevent hydration timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (reloadCalculators) {
        reloadCalculators();
      }
    }, 500); // Increased delay to allow hydration to complete
    
    return () => clearTimeout(timer);
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
      await new Promise(resolve => {
        if (resolve) {
          setTimeout(resolve, 500);
        }
      });
    } catch (error) {
      console.error('Failed to refresh calculators:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const toggleMenu = () => {
    const toValue = menuVisible ? -MENU_WIDTH : 0;
    const overlayValue = menuVisible ? 0 : 0.5;
    
    setMenuVisible(!menuVisible);
    
    Animated.parallel([
      Animated.spring(menuAnimation, {
        toValue,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(overlayAnimation, {
        toValue: overlayValue,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    if (menuVisible) {
      toggleMenu();
    }
  };

  const navigateToScreen = (screen: string) => {
    closeMenu();
    router.push(screen as any);
  };

  const handleLogout = async () => {
    closeMenu();
    try {
      await logout();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleUpgradeGuest = () => {
    closeMenu();
    setShowUpgradeForm(true);
  };

  const handleUpgradeSuccess = async () => {
    setShowUpgradeForm(false);
    await handleLogout();
  };

  const testBackend = async () => {
    try {
      console.log('🧪 Testing backend connection...');
      const result = await trpc.example.hi.mutate({ name: 'Test' });
      console.log('✅ Backend test result:', result);
      Alert.alert('Backend Test', `Success! Response: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('❌ Backend test failed:', error);
      Alert.alert('Backend Test', `Error: ${error}`);
    }
  };

  const clearCorruptedData = async () => {
    try {
      console.log('🧹 Clearing corrupted data...');
      const result = await trpc.calculators.clearCorrupted.mutate();
      console.log('✅ Clear corrupted result:', result);
      Alert.alert('Clear Corrupted Data', `Success! ${result.message || 'Data cleared'}`);
      // Refresh calculators after clearing
      if (reloadCalculators) {
        await reloadCalculators();
      }
    } catch (error) {
      console.error('❌ Clear corrupted failed:', error);
      Alert.alert('Clear Corrupted Data', `Error: ${error}`);
    }
  };

  const clearAsyncStorage = async () => {
    try {
      console.log('🧹 Clearing AsyncStorage...');
      const keys = ['user', 'rememberMe', 'settings', 'calculations', 'notifications'];
      await AsyncStorage.multiRemove(keys);
      console.log('✅ AsyncStorage cleared');
      Alert.alert('Clear AsyncStorage', 'AsyncStorage cleared successfully!');
    } catch (error) {
      console.error('❌ Clear AsyncStorage failed:', error);
      Alert.alert('Clear AsyncStorage', `Error: ${error}`);
    }
  };

  const panResponder = PanResponder.create({
    onMoveShouldSetPanResponder: (evt, gestureState) => {
      return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
    },
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dx > 0 && !menuVisible) {
        // Swiping right to open menu
        const progress = Math.min(gestureState.dx / MENU_WIDTH, 1);
        // Apply easing to make the movement feel more natural
        const easedProgress = Easing.out(Easing.quad)(progress);
        menuAnimation.setValue(-MENU_WIDTH + (MENU_WIDTH * easedProgress));
        overlayAnimation.setValue(0.5 * easedProgress);
      } else if (gestureState.dx < 0 && menuVisible) {
        // Swiping left to close menu
        const progress = Math.max(1 + (gestureState.dx / MENU_WIDTH), 0);
        // Apply easing to make the movement feel more natural
        const easedProgress = Easing.out(Easing.quad)(progress);
        menuAnimation.setValue(-MENU_WIDTH + (MENU_WIDTH * easedProgress));
        overlayAnimation.setValue(0.5 * easedProgress);
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (gestureState.dx > MENU_WIDTH / 3 && !menuVisible) {
        // Open menu
        setMenuVisible(true);
        Animated.parallel([
          Animated.spring(menuAnimation, {
            toValue: 0,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }),
          Animated.timing(overlayAnimation, {
            toValue: 0.5,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      } else if (gestureState.dx < -MENU_WIDTH / 3 && menuVisible) {
        // Close menu
        setMenuVisible(false);
        Animated.parallel([
          Animated.spring(menuAnimation, {
            toValue: -MENU_WIDTH,
            useNativeDriver: true,
            tension: 120,
            friction: 8,
          }),
          Animated.timing(overlayAnimation, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        // Snap back to current state
        const toValue = menuVisible ? 0 : -MENU_WIDTH;
        const overlayValue = menuVisible ? 0.5 : 0;
        Animated.parallel([
          Animated.spring(menuAnimation, {
            toValue,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
          }),
          Animated.timing(overlayAnimation, {
            toValue: overlayValue,
            duration: 250,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]).start();
      }
    },
  });

  const filteredCalculators = calculators.filter(calc => {
    const searchTerm = searchQuery?.trim() || '';
    const categoryFilter = selectedCategory?.trim() || '';
    
    const matchesSearch = !searchTerm || 
      calc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      calc.shortName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !categoryFilter || calc.categories.includes(categoryFilter);
    return matchesSearch && matchesCategory;
  });

  if (!isAuthenticated && !isGuest) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]} {...panResponder.panHandlers}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBackground, borderBottomColor: theme.border }]}>
        <SafeAreaView edges={['top']} style={styles.headerSafeArea} />
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.menuButton}
            onPress={toggleMenu}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Menu size={24} color={theme.headerText} />
          </TouchableOpacity>
          
          <View style={styles.headerTitle}>
            <AbrasorLogo size={28} />
          </View>
          
          <View style={styles.headerRight}>
            <UnitToggle />
          </View>
        </View>
      </View>

      {/* Main Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}

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
                  style={styles.clearButton}
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
            <TouchableOpacity
              style={[styles.themeToggle, { backgroundColor: theme.surface, borderColor: theme.border }]}
              onPress={() => setShowDebugButtons(!showDebugButtons)}
            >
              <TestTube size={20} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Theme Selector */}
        {showThemeSelector && (
          <View style={styles.themeSelectorContainer}>
            <ThemeSelector />
          </View>
        )}

        {/* Debug Buttons */}
        {showDebugButtons && (
          <View style={styles.debugContainer}>
            <Text style={[styles.debugTitle, { color: theme.text }]}>Debug Tools</Text>
            <View style={styles.debugButtons}>
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: theme.primary }]} 
                onPress={testBackend}
              >
                <Text style={[styles.debugButtonText, { color: theme.primaryText }]}>Test Backend</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: theme.error }]} 
                onPress={clearCorruptedData}
              >
                <Text style={[styles.debugButtonText, { color: theme.primaryText }]}>Clear Corrupted Data</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.debugButton, { backgroundColor: theme.warning || '#F59E0B' }]} 
                onPress={clearAsyncStorage}
              >
                <Text style={[styles.debugButtonText, { color: theme.primaryText }]}>Clear AsyncStorage</Text>
              </TouchableOpacity>
            </View>
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
              <Text style={[styles.loadingText, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>Updating Calculators...</Text>
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
                  ? 'No Calculators to Present. Please contact your administrator to add calculators.'
                  : 'Try adjusting your search or filters'}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Menu Overlay */}
      <Animated.View 
        style={[
          styles.overlay, 
          { 
            backgroundColor: 'rgba(0,0,0,0.5)',
            opacity: overlayAnimation,
            pointerEvents: menuVisible ? 'auto' : 'none'
          }
        ]}
      >
        <TouchableOpacity 
          style={styles.overlayTouchable}
          onPress={closeMenu}
          activeOpacity={1}
        />
      </Animated.View>

      {/* Side Menu */}
      <Animated.View 
        style={[
          styles.menu, 
          { 
            backgroundColor: theme.surface,
            transform: [{ translateX: menuAnimation }]
          }
        ]}
      >
        <View style={styles.menuContent}>
          <SafeAreaView edges={['top']} style={styles.menuSafeAreaTop} />
          {/* Menu Header */}
          <View style={[styles.menuHeader, { borderBottomColor: theme.border }]}>
            <AbrasorLogo size={32} />
          </View>

          {/* User Info Section */}
          {!isGuest && user && (
            <View style={[styles.userInfoSection, { borderBottomColor: theme.border }]}>
              <View style={styles.userProfileContainer}>
                <View style={styles.userAvatarLarge}>
                  {user.profileImage && user.profileImage.trim() ? (
                    <Image 
                      source={{ uri: user.profileImage }} 
                      style={styles.avatarImageLarge}
                      defaultSource={require('@/assets/images/icon.png')}
                    />
                  ) : (
                    <View style={[styles.avatarPlaceholderLarge, { backgroundColor: theme.primary }]}>
                      <Text style={[styles.avatarTextLarge, { color: theme.primaryText }]}>
                        {user.name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.userNameLarge, { color: theme.text, fontSize: theme.fontSizes.subtitle }]} numberOfLines={2}>
                  {user.name}
                </Text>
                <View style={[styles.userRoleChip, { backgroundColor: theme.primary }]}>
                  <Text style={[styles.userRoleText, { color: theme.primaryText, fontSize: theme.fontSizes.small }]}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Guest Info Section */}
          {isGuest && (
            <View style={[styles.userInfoSection, { borderBottomColor: theme.border }]}>
              <View style={styles.userProfileContainer}>
                <View style={styles.userAvatarLarge}>
                  <View style={[styles.avatarPlaceholderLarge, { backgroundColor: theme.textSecondary }]}>
                    <User size={32} color={theme.surface} />
                  </View>
                </View>
                <Text style={[styles.userNameLarge, { color: theme.text, fontSize: theme.fontSizes.subtitle }]}>
                  Guest User
                </Text>
                <View style={[styles.userRoleChip, { backgroundColor: theme.textSecondary }]}>
                  <Text style={[styles.userRoleText, { color: theme.surface, fontSize: theme.fontSizes.small }]}>
                    Limited Access
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Menu Items */}
          <View style={styles.menuItems}>
            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => navigateToScreen('/main')}
            >
              <Calculator size={24} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text, fontSize: theme.fontSizes.medium }]}>Calculators</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => navigateToScreen('/notifications')}
            >
              <View style={styles.menuItemIcon}>
                <Bell size={24} color={theme.text} />
                {unreadCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.error }]}>
                    <Text style={[styles.badgeText, { color: theme.primaryText }]}>{unreadCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuItemText, { color: theme.text, fontSize: theme.fontSizes.medium }]}>Notifications</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.menuItem, { borderBottomColor: theme.border }]}
              onPress={() => navigateToScreen('/profile')}
            >
              <User size={24} color={theme.text} />
              <Text style={[styles.menuItemText, { color: theme.text, fontSize: theme.fontSizes.medium }]}>Profile</Text>
            </TouchableOpacity>

            {user?.role === 'admin' && !isGuest && (
              <TouchableOpacity 
                style={[styles.menuItem, { borderBottomColor: theme.border }]}
                onPress={() => navigateToScreen('/admin')}
              >
                <Shield size={24} color={theme.text} />
                <Text style={[styles.menuItemText, { color: theme.text, fontSize: theme.fontSizes.medium }]}>Admin</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Logout/Upgrade Section */}
          <View style={styles.menuFooter}>
            {isGuest ? (
              <TouchableOpacity 
                style={[styles.createAccountButton, { backgroundColor: '#22C55E' }]}
                onPress={handleUpgradeGuest}
              >
                <UserPlus size={20} color="white" />
                <Text style={[styles.actionButtonText, { color: 'white' }]}>Create Account</Text>
              </TouchableOpacity>
            ) : null}
            
            <TouchableOpacity 
              style={[styles.logoutButton, { backgroundColor: '#EF4444' }]}
              onPress={handleLogout}
            >
              <LogOut size={20} color="white" />
              <Text style={[styles.actionButtonText, { color: 'white' }]}>
                {isGuest ? 'Exit Guest Mode' : 'Logout'}
              </Text>
            </TouchableOpacity>
          </View>
          
          <SafeAreaView edges={['bottom']} style={styles.menuSafeAreaBottom} />
        </View>
      </Animated.View>

      {/* Guest Upgrade Form */}
      {showUpgradeForm && (
        <GuestUpgradeForm
          onClose={() => setShowUpgradeForm(false)}
          onSuccess={handleUpgradeSuccess}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerRight: {
    marginLeft: 'auto',
  },
  scrollView: {
    flex: 1,
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
  clearButton: {
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
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  overlayTouchable: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: '80%',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    gap: 12,
  },
  menuTitle: {
    fontWeight: '600' as const,
  },
  userInfoSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  userProfileContainer: {
    alignItems: 'center',
    gap: 12,
  },
  userAvatarLarge: {
    width: 80,
    height: 80,
  },
  avatarImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholderLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTextLarge: {
    fontSize: 28,
    fontWeight: '600' as const,
  },
  userNameLarge: {
    fontWeight: '600' as const,
    textAlign: 'center' as const,
    marginTop: 4,
  },
  userRoleChip: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 4,
  },
  userRoleText: {
    fontWeight: '600' as const,
    textTransform: 'capitalize' as const,
  },
  userAvatar: {
    width: 48,
    height: 48,
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  userRole: {
    fontWeight: '500' as const,
    textTransform: 'capitalize' as const,
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    gap: 16,
  },
  menuItemIcon: {
    position: 'relative',
  },
  menuItemText: {
    fontWeight: '500' as const,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  headerSafeArea: {
    flex: 0,
  },
  menuSafeAreaTop: {
    flex: 0,
  },
  menuSafeAreaBottom: {
    flex: 0,
  },
  menuFooter: {
    marginTop: 'auto',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  debugContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  debugTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 12,
  },
  debugButtons: {
    gap: 8,
  },
  debugButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
});