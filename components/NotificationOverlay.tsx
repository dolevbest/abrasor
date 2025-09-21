import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import {
  Bell,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  X,
} from 'lucide-react-native';
import { Shadows } from '@/constants/colors';
import { useNotifications } from '@/hooks/notifications-context';
import { useTheme } from '@/hooks/theme-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const NotificationOverlay: React.FC = () => {
  const { activeNotification, dismissActiveNotification } = useNotifications();
  const { theme, isDark } = useTheme();
  const slideAnim = useRef(new Animated.Value(-200)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (activeNotification) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Slide out and fade out
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -200,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [activeNotification]);

  if (!activeNotification) {
    return null;
  }

  const getIcon = () => {
    const iconProps = {
      size: 24,
      color: theme.primaryText,
    };

    switch (activeNotification.icon) {
      case 'error':
        return <AlertCircle {...iconProps} />;
      case 'warning':
        return <AlertTriangle {...iconProps} />;
      case 'success':
        return <CheckCircle {...iconProps} />;
      case 'info':
        return <Info {...iconProps} />;
      case 'bell':
      default:
        return <Bell {...iconProps} />;
    }
  };

  const getIconColor = () => {
    switch (activeNotification.icon) {
      case 'error':
        return theme.error;
      case 'warning':
        return theme.warning;
      case 'success':
        return theme.success;
      case 'info':
        return theme.info;
      case 'bell':
      default:
        return theme.primary;
    }
  };

  return (
    <Modal
      transparent
      visible={!!activeNotification}
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Blur background */}
        {Platform.OS !== 'web' ? (
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFillObject}
          />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
            ]}
          />
        )}

        {/* Notification card */}
        <Animated.View
          style={[
            styles.notificationCard,
            { backgroundColor: theme.surface },
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim,
            },
            Shadows.large,
          ]}
        >
          <View style={[styles.iconContainer, { backgroundColor: getIconColor() }]}>
            {getIcon()}
          </View>

          <View style={styles.content}>
            <Text style={[styles.title, { color: theme.text }]}>
              {activeNotification.title}
            </Text>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              {activeNotification.body}
            </Text>
            
            <View style={styles.footer}>
              <Text style={[styles.priority, { color: theme.textSecondary }]}>
                Priority: {activeNotification.priority.toUpperCase()}
              </Text>
              <Text style={[styles.duration, { color: theme.textSecondary }]}>
                Auto-dismiss in {activeNotification.displayDuration}s
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={dismissActiveNotification}
          >
            <X size={20} color={theme.text} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  notificationCard: {
    borderRadius: 16,
    padding: 20,
    width: Math.min(SCREEN_WIDTH - 40, 400),
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priority: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  duration: {
    fontSize: 12,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    padding: 4,
  },
});

export default NotificationOverlay;