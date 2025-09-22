import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useAuth } from './auth-context';

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  icon: 'info' | 'warning' | 'error' | 'success' | 'bell';
  targetGroups: ('starter' | 'premium' | 'admin' | 'all')[];
  displayDuration: number; // in seconds
  createdAt: Date;
  createdBy: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
}



// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const [NotificationsProvider, useNotifications] = createContextHook<{
  notifications: AppNotification[];
  unreadCount: number;
  activeNotification: AppNotification | null;
  pushToken: string | null;
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAll: () => Promise<void>;
  dismissActiveNotification: () => void;
  showActiveNotification: (notification: AppNotification) => void;
}>(() => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const displayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastBroadcastRef = useRef<string | null>(null);

  const loadNotifications = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem('userNotifications');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
        } catch (error) {
          console.error('Failed to parse user notifications:', error);
          await AsyncStorage.removeItem('userNotifications');
          setNotifications([]);
        }
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  }, []);

  const saveNotifications = useCallback(async (notifs: AppNotification[]) => {
    try {
      await AsyncStorage.setItem('userNotifications', JSON.stringify(notifs));
    } catch (error) {
      console.error('Failed to save notifications:', error);
    }
  }, []);

  const shouldShowNotification = useCallback((notification: AppNotification): boolean => {
    if (!user) return false;
    
    if (notification.targetGroups.includes('all')) {
      return true;
    }
    
    const userRole = user.role || 'starter';
    return notification.targetGroups.includes(userRole as any);
  }, [user]);

  const showActiveNotification = useCallback((notification: AppNotification) => {
    // Clear any existing timeout
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
    }

    setActiveNotification(notification);

    // Auto-hide after specified duration
    displayTimeoutRef.current = setTimeout(() => {
      setActiveNotification(null);
    }, notification.displayDuration * 1000);
  }, []);

  const handleIncomingNotification = useCallback(async (notification: any) => {
    const notificationData = notification.request.content.data as AppNotification;
    
    // Check if user is in target group
    if (!shouldShowNotification(notificationData)) {
      return;
    }

    // Add to notifications list
    const newNotification: AppNotification = {
      ...notificationData,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false,
    };

    setNotifications(prev => {
      const updated = [newNotification, ...prev];
      saveNotifications(updated);
      return updated;
    });

    // Show as active notification if app is in foreground
    showActiveNotification(newNotification);
  }, [shouldShowNotification, showActiveNotification, saveNotifications]);

  // Load notifications and set up listeners
  useEffect(() => {
    loadNotifications();
    registerForPushNotifications();

    // Set up notification listeners
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('📱 Notification received:', notification);
      handleIncomingNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('📱 Notification response:', response);
      // Handle notification tap
    });

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
      if (displayTimeoutRef.current) {
        clearTimeout(displayTimeoutRef.current);
      }
    };
  }, [loadNotifications, handleIncomingNotification]);

  // Poll for broadcast notifications from admin panel
  useEffect(() => {
    const checkBroadcastNotifications = async () => {
      try {
        const broadcast = await AsyncStorage.getItem('broadcastNotification');
        if (broadcast) {
          let notification;
          try {
            notification = JSON.parse(broadcast);
          } catch (error) {
            console.error('Failed to parse broadcast notification:', error);
            await AsyncStorage.removeItem('broadcastNotification');
            return;
          }
          const notificationKey = `${notification.createdAt}-${notification.title}`;
          
          // Check if this is a new broadcast
          if (lastBroadcastRef.current !== notificationKey) {
            lastBroadcastRef.current = notificationKey;
            console.log('📢 Broadcast notification received:', notification);
            
            // Add the notification if user is in target group
            if (shouldShowNotification(notification)) {
              const newNotification: AppNotification = {
                ...notification,
                id: Date.now().toString(),
                read: false,
              };
              
              setNotifications(prev => {
                const updated = [newNotification, ...prev];
                saveNotifications(updated);
                return updated;
              });
              showActiveNotification(newNotification);
            }
          }
        }
      } catch (error) {
        console.error('Failed to check broadcast notifications:', error);
      }
    };

    // Check immediately
    checkBroadcastNotifications();
    
    // Check for broadcast notifications every 2 seconds
    const broadcastInterval = setInterval(checkBroadcastNotifications, 2000);

    return () => {
      clearInterval(broadcastInterval);
    };
  }, [shouldShowNotification, showActiveNotification, saveNotifications]);



  const registerForPushNotifications = async () => {
    if (Platform.OS === 'web') {
      console.log('Push notifications not supported on web');
      return;
    }

    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return;
    }

    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Failed to get push token for push notification!');
        return;
      }
      
      // Try to get project ID from different sources
      const projectId = Constants.expoConfig?.extra?.eas?.projectId || 
                       Constants.manifest?.extra?.eas?.projectId ||
                       Constants.manifest2?.extra?.eas?.projectId;
      
      console.log('📱 Using project ID:', projectId);
      
      let token: string;
      if (projectId) {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      } else {
        // Fallback: try without projectId (for development)
        console.log('📱 No project ID found, trying without it...');
        token = (await Notifications.getExpoPushTokenAsync()).data;
      }
      
      console.log('📱 Push token:', token);
      setPushToken(token);
      
      // Store token for admin to use
      await AsyncStorage.setItem('pushToken', token);
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      // For development, we'll continue without push notifications
      console.log('📱 Continuing without push notifications in development mode');
    }
  };

  const sendPushNotification = useCallback(async (notification: AppNotification) => {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title,
          body: notification.body,
          data: notification as any,
          sound: true,
          priority: notification.priority === 'high' ? 
            Notifications.AndroidNotificationPriority.HIGH : 
            Notifications.AndroidNotificationPriority.DEFAULT,
        },
        trigger: null, // Send immediately
      });
    } catch (error) {
      console.error('Failed to send push notification:', error);
    }
  }, []);

  const addNotification = useCallback(async (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: Date.now().toString(),
      createdAt: new Date(),
      read: false,
    };

    // Check if should show to current user
    if (shouldShowNotification(newNotification)) {
      setNotifications(prev => {
        const updated = [newNotification, ...prev];
        saveNotifications(updated);
        return updated;
      });
      
      // Show as active notification
      showActiveNotification(newNotification);
    }

    // Send push notification
    if (Platform.OS !== 'web' && pushToken) {
      await sendPushNotification(newNotification);
    }
  }, [shouldShowNotification, showActiveNotification, saveNotifications, pushToken, sendPushNotification]);



  const markAsRead = useCallback(async (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const markAllAsRead = useCallback(async () => {
    setNotifications(prev => {
      const updated = prev.map(n => ({ ...n, read: true }));
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    setNotifications(prev => {
      const updated = prev.filter(n => n.id !== notificationId);
      saveNotifications(updated);
      return updated;
    });
  }, [saveNotifications]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    await AsyncStorage.removeItem('userNotifications');
  }, []);

  const dismissActiveNotification = useCallback(() => {
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
    }
    setActiveNotification(null);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    unreadCount,
    activeNotification,
    pushToken,
    addNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
    dismissActiveNotification,
    showActiveNotification,
  };
});