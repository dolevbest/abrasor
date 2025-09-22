import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Modal,
  PanResponder,
  Animated,
  Dimensions,
} from 'react-native';
import { Info, CheckCircle, AlertCircle, XCircle, Trash2, X, Bell, AlertTriangle } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { useNotifications, AppNotification } from '@/hooks/notifications-context';
import { useTheme } from '@/hooks/theme-context';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

const getIcon = (icon: AppNotification['icon']) => {
  switch (icon) {
    case 'success':
      return <CheckCircle size={20} color={Colors.success} />;
    case 'warning':
      return <AlertTriangle size={20} color={Colors.warning} />;
    case 'error':
      return <AlertCircle size={20} color={Colors.error} />;
    case 'bell':
      return <Bell size={20} color={Colors.primary} />;
    case 'info':
    default:
      return <Info size={20} color={Colors.info} />;
  }
};

interface SwipeableNotificationProps {
  notification: AppNotification;
  onPress: () => void;
  onDelete: () => void;
}

const SwipeableNotification: React.FC<SwipeableNotificationProps> = ({ 
  notification, 
  onPress, 
  onDelete 
}) => {
  const { theme, isDark } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const deleteOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        // Add damping for smoother movement
        const dampedDx = gestureState.dx * 0.9;
        translateX.setValue(dampedDx);
        const opacity = Math.min(Math.abs(dampedDx) / SWIPE_THRESHOLD, 1);
        deleteOpacity.setValue(opacity);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (Math.abs(gestureState.dx) > SWIPE_THRESHOLD) {
          // Swipe out and delete with smoother animation
          const direction = gestureState.dx > 0 ? screenWidth : -screenWidth;
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: direction,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            })
          ]).start(() => {
            onDelete();
          });
        } else {
          // Snap back with smoother spring
          Animated.parallel([
            Animated.spring(translateX, {
              toValue: 0,
              useNativeDriver: true,
              tension: 40,
              friction: 8,
            }),
            Animated.timing(deleteOpacity, {
              toValue: 0,
              duration: 250,
              useNativeDriver: true,
            })
          ]).start();
        }
      },
    })
  ).current;

  const dynamicStyles = {
    notificationCard: {
      backgroundColor: isDark ? theme.surface : Colors.surface,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? theme.border : 'transparent',
    },
    unreadCard: {
      borderLeftColor: theme.primary,
      backgroundColor: isDark ? theme.surface : Colors.surface,
    },
    title: {
      color: theme.text,
    },
    message: {
      color: theme.textSecondary,
    },
    time: {
      color: theme.textSecondary,
    },
    unreadDot: {
      backgroundColor: theme.primary,
    },
  };

  return (
    <View style={styles.swipeContainer}>
      <Animated.View 
        style={[
          styles.deleteBackground,
          {
            opacity: deleteOpacity,
          }
        ]}
      >
        <View style={styles.deleteLeft}>
          <Trash2 size={24} color="white" />
        </View>
        <View style={styles.deleteRight}>
          <Trash2 size={24} color="white" />
        </View>
      </Animated.View>
      
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          { transform: [{ translateX }] },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.notificationCard,
            dynamicStyles.notificationCard,
            !notification.read && styles.unreadCard,
            !notification.read && dynamicStyles.unreadCard,
            Shadows.small
          ]}
          onPress={onPress}
          activeOpacity={0.9}
        >
          <View style={styles.iconContainer}>
            {getIcon(notification.icon)}
          </View>
          <View style={styles.content}>
            <Text style={[
              styles.title,
              dynamicStyles.title,
              !notification.read && styles.unreadTitle
            ]}>
              {notification.title}
            </Text>
            <Text style={[styles.message, dynamicStyles.message]} numberOfLines={2}>
              {notification.body}
            </Text>
            <Text style={[styles.time, dynamicStyles.time]}>
              {new Date(notification.createdAt).toLocaleDateString()}
            </Text>
          </View>
          {!notification.read && <View style={[styles.unreadDot, dynamicStyles.unreadDot]} />}
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

export default function NotificationsScreen() {
  const { notifications, markAsRead, clearAll, deleteNotification } = useNotifications();
  const { theme, isDark } = useTheme();
  const [selectedNotification, setSelectedNotification] = useState<AppNotification | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const handleNotificationPress = (notification: AppNotification) => {
    setSelectedNotification(notification);
    setModalVisible(true);
    if (!notification.read) {
      markAsRead(notification.id);
    }
  };

  const handleDeleteNotification = (id: string) => {
    deleteNotification(id);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedNotification(null);
  };

  const handleDeleteFromModal = () => {
    if (selectedNotification) {
      deleteNotification(selectedNotification.id);
      handleCloseModal();
    }
  };

  const dynamicStyles = {
    container: {
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      borderBottomColor: theme.border,
    },
    headerText: {
      color: theme.textSecondary,
    },
    emptyText: {
      color: theme.text,
    },
    emptySubtext: {
      color: theme.textSecondary,
    },
    modalOverlay: {
      backgroundColor: isDark ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: theme.surface,
    },
    modalTitle: {
      color: theme.text,
    },
    modalMessage: {
      color: theme.textSecondary,
    },
    modalTime: {
      color: theme.textSecondary,
    },
  };

  return (
    <View style={[styles.container, dynamicStyles.container]}>
      {notifications.length > 0 && (
        <View style={[styles.header, dynamicStyles.header]}>
          <Text style={[styles.headerText, dynamicStyles.headerText]}>
            {notifications.filter(n => !n.read).length} unread
          </Text>
          <TouchableOpacity onPress={clearAll}>
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      )}

      <ScrollView 
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {notifications.length > 0 ? (
          notifications.map(notification => (
            <SwipeableNotification
              key={notification.id}
              notification={notification}
              onPress={() => handleNotificationPress(notification)}
              onDelete={() => handleDeleteNotification(notification.id)}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Info size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyText, dynamicStyles.emptyText]}>No notifications</Text>
            <Text style={[styles.emptySubtext, dynamicStyles.emptySubtext]}>You're all caught up!</Text>
          </View>
        )}
      </ScrollView>

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, dynamicStyles.modalOverlay]} 
          activeOpacity={1} 
          onPress={handleCloseModal}
        >
          <TouchableOpacity 
            style={[styles.modalContent, dynamicStyles.modalContent, Shadows.medium]} 
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedNotification && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalIcon}>
                    {getIcon(selectedNotification.icon)}
                  </View>
                  <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
                    <X size={24} color={theme.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.modalTitle, dynamicStyles.modalTitle]}>
                  {selectedNotification.title}
                </Text>
                
                <Text style={[styles.modalMessage, dynamicStyles.modalMessage]}>
                  {selectedNotification.body}
                </Text>
                
                <Text style={[styles.modalTime, dynamicStyles.modalTime]}>
                  {new Date(selectedNotification.createdAt).toLocaleString()}
                </Text>
                
                <View style={styles.modalActions}>
                  <TouchableOpacity 
                    style={[styles.deleteButton, { backgroundColor: Colors.error }]}
                    onPress={handleDeleteFromModal}
                  >
                    <Trash2 size={18} color="white" />
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  list: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  swipeContainer: {
    marginBottom: 12,
    position: 'relative',
  },
  deleteBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.error,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteLeft: {
    alignItems: 'center',
  },
  deleteRight: {
    alignItems: 'center',
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 16,
  },
  unreadCard: {
    borderLeftWidth: 3,
  },
  iconContainer: {
    marginRight: 12,
    paddingTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  unreadTitle: {
    fontWeight: '600' as const,
  },
  message: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 8,
    lineHeight: 20,
  },
  time: {
    fontSize: 12,
    color: Colors.textLight,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    position: 'absolute',
    top: 16,
    right: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  modalIcon: {
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 24,
    marginBottom: 16,
  },
  modalTime: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  deleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500' as const,
  },
});