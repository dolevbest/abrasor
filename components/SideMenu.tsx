import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  SafeAreaView,
  Easing,
} from 'react-native';
import {
  X,
  User,
  Calculator,
  Bell,
  Shield,
  LogOut,
  UserPlus,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useAuth } from '@/hooks/auth-context';
import { router } from 'expo-router';
import { useNotifications } from '@/hooks/notifications-context';



interface SideMenuProps {
  visible: boolean;
  onClose: () => void;
}

interface MenuItemAnimatedProps {
  item: {
    icon: any;
    label: string;
    route: string;
    badge?: number;
  };
  Icon: any;
  theme: any;
  onPress: () => void;
  index: number;
  visible: boolean;
}

function MenuItemAnimated({ item, Icon, theme, onPress, index, visible }: MenuItemAnimatedProps) {
  const itemOpacity = React.useRef(new Animated.Value(0)).current;
  const itemTranslateX = React.useRef(new Animated.Value(-20)).current;
  const itemScale = React.useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible) {
      const delay = index * 50; // Stagger each item by 50ms
      
      Animated.parallel([
        Animated.timing(itemOpacity, {
          toValue: 1,
          duration: 300,
          delay: delay + 150,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(itemTranslateX, {
          toValue: 0,
          duration: 400,
          delay: delay + 150,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.spring(itemScale, {
          toValue: 1,
          tension: 150,
          friction: 8,
          delay: delay + 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset for next opening
      itemOpacity.setValue(0);
      itemTranslateX.setValue(-20);
      itemScale.setValue(0.9);
    }
  }, [visible, index, itemOpacity, itemTranslateX, itemScale]);

  return (
    <Animated.View
      style={[
        styles.menuItemAnimated,
        {
          opacity: itemOpacity,
          transform: [
            { translateX: itemTranslateX },
            { scale: itemScale },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.menuItem, { borderBottomColor: theme.border }]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <View style={styles.menuItemLeft}>
          <Icon size={22} color={theme.text} />
          <Text style={[styles.menuItemText, { color: theme.text }]}>
            {item.label}
          </Text>
        </View>
        {item.badge && (
          <View style={[styles.badge, { backgroundColor: theme.error }]}>
            <Text style={[styles.badgeText, { color: theme.primaryText }]}>
              {item.badge}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function SideMenu({ visible, onClose }: SideMenuProps) {
  const { theme } = useTheme();
  const { user, isGuest, logout, upgradeFromGuest } = useAuth();
  const { unreadCount } = useNotifications();
  
  const [menuWidth] = React.useState(() => {
    const { width } = Dimensions.get('window');
    return width * 0.8;
  });
  
  const slideAnim = React.useRef(new Animated.Value(-menuWidth)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;
  const menuItemsOpacity = React.useRef(new Animated.Value(0)).current;
  const menuItemsTranslateY = React.useRef(new Animated.Value(20)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.95)).current;

  React.useEffect(() => {
    if (visible) {
      // Reset values for opening animation
      menuItemsOpacity.setValue(0);
      menuItemsTranslateY.setValue(20);
      scaleAnim.setValue(0.95);
      
      // Staggered opening animation
      Animated.parallel([
        // Slide in with spring physics
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: true,
        }),
        // Overlay fade in
        Animated.timing(overlayOpacity, {
          toValue: 0.8,
          duration: 350,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        // Scale animation for satisfying feel
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 120,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Menu items fade in after panel is visible
        Animated.parallel([
          Animated.timing(menuItemsOpacity, {
            toValue: 1,
            duration: 200,
            delay: 100,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(menuItemsTranslateY, {
            toValue: 0,
            duration: 250,
            delay: 100,
            easing: Easing.out(Easing.back(1.2)),
            useNativeDriver: true,
          }),
        ]).start();
      });
    } else {
      // Closing animation - faster and snappier
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -menuWidth,
          duration: 280,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: 280,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Menu items fade out immediately
        Animated.timing(menuItemsOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayOpacity, menuItemsOpacity, menuItemsTranslateY, scaleAnim, menuWidth]);

  const handleNavigate = (route: string) => {
    onClose();
    setTimeout(() => {
      router.push(route as any);
    }, 250);
  };

  const handleLogout = () => {
    onClose();
    setTimeout(async () => {
      await logout();
      router.replace('/(auth)/login');
    }, 250);
  };

  const handleCreateAccount = () => {
    onClose();
    setTimeout(() => {
      upgradeFromGuest();
      router.push('/(auth)/request-access');
    }, 250);
  };

  const menuItems = [
    {
      icon: Calculator,
      label: 'Calculators',
      route: '/calculators',
      show: true,
    },
    {
      icon: Bell,
      label: 'Notifications',
      route: '/notifications',
      show: true,
      badge: unreadCount > 0 ? unreadCount : undefined,
    },
    {
      icon: User,
      label: 'Profile',
      route: '/profile',
      show: true,
    },
    {
      icon: Shield,
      label: 'Admin',
      route: '/admin',
      show: user?.role === 'admin' && !isGuest,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Darker Overlay */}
        <Animated.View
          style={[
            styles.overlay,
            {
              opacity: overlayOpacity,
              backgroundColor: '#000000', // Pure black for maximum darkness
            },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouchable}
            onPress={onClose}
            activeOpacity={1}
          />
        </Animated.View>

        {/* Menu Panel */}
        <Animated.View
          style={[
            styles.menuPanel,
            {
              backgroundColor: theme.surface,
              transform: [
                { translateX: slideAnim },
                { scale: scaleAnim },
              ],
            },
          ]}
        >
          <SafeAreaView style={styles.menuContent}>
            {/* Header */}
            <View style={[styles.menuHeader, { borderBottomColor: theme.border }]}>
              <View style={styles.userInfo}>
                <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                  <User size={24} color={theme.primaryText} />
                </View>
                <View style={styles.userDetails}>
                  <Text style={[styles.userName, { color: theme.text }]}>
                    {isGuest ? 'Guest User' : user?.name || 'User'}
                  </Text>
                  <Text style={[styles.userRole, { color: theme.textSecondary }]}>
                    {isGuest ? 'Guest Mode' : user?.role?.toUpperCase() || 'USER'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: theme.background }]}
                onPress={onClose}
              >
                <X size={20} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <Animated.View 
              style={[
                styles.menuItems,
                {
                  opacity: menuItemsOpacity,
                  transform: [{ translateY: menuItemsTranslateY }],
                },
              ]}
            >
              {menuItems
                .filter(item => item.show)
                .map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <MenuItemAnimated
                      key={item.route}
                      item={item}
                      Icon={Icon}
                      theme={theme}
                      onPress={() => handleNavigate(item.route)}
                      index={index}
                      visible={visible}
                    />
                  );
                })}
            </Animated.View>

            {/* Bottom Actions */}
            <Animated.View 
              style={[
                styles.bottomActions,
                {
                  opacity: menuItemsOpacity,
                  transform: [{ translateY: menuItemsTranslateY }],
                },
              ]}
            >
              {isGuest && (
                <TouchableOpacity
                  style={[styles.createAccountButton, { backgroundColor: theme.success }]}
                  onPress={handleCreateAccount}
                >
                  <UserPlus size={20} color={theme.surface} />
                  <Text style={[styles.createAccountText, { color: theme.surface }]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              )}
              
              <TouchableOpacity
                style={[styles.logoutButton, { backgroundColor: theme.error }]}
                onPress={handleLogout}
              >
                <LogOut size={20} color={theme.surface} />
                <Text style={[styles.logoutText, { color: theme.surface }]}>
                  {isGuest ? 'Exit Guest Mode' : 'Logout'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayTouchable: {
    flex: 1,
  },
  menuPanel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  menuContent: {
    flex: 1,
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 2,
  },
  userRole: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItems: {
    flex: 1,
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '500' as const,
    marginLeft: 16,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  bottomActions: {
    padding: 20,
    gap: 12,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  createAccountText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  menuItemAnimated: {
    // Base style for animated menu items
  },
});