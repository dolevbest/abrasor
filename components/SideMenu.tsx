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

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0.8, // Darker overlay (was probably 0.5 before)
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -menuWidth,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayOpacity, menuWidth]);

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
              transform: [{ translateX: slideAnim }],
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
            <View style={styles.menuItems}>
              {menuItems
                .filter(item => item.show)
                .map((item) => {
                  const Icon = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.route}
                      style={[styles.menuItem, { borderBottomColor: theme.border }]}
                      onPress={() => handleNavigate(item.route)}
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
                  );
                })}
            </View>

            {/* Bottom Actions */}
            <View style={styles.bottomActions}>
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
            </View>
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
});