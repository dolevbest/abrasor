import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { UnitSystem, Notification } from '@/types';
import { useAuth } from '@/hooks/auth-context';
import { trpc } from '@/lib/trpc';

interface SettingsState {
  unitSystem: UnitSystem;
  notifications: Notification[];
  unreadCount: number;
  toggleUnitSystem: () => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  deleteNotification: (id: string) => void;
}

export const [SettingsProvider, useSettings] = createContextHook<SettingsState>(() => {
  const { user, updateProfile } = useAuth();
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('metric');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isTogglingUnit, setIsTogglingUnit] = useState(false);

  const safeJsonParse = (jsonString: string | null, fallback: any = null) => {
    if (!jsonString || typeof jsonString !== 'string') {
      return fallback;
    }
    
    const trimmed = jsonString.trim();
    if (!trimmed || trimmed === 'undefined' || trimmed === 'null') {
      return fallback;
    }
    
    // Check for common corruption patterns
    if (trimmed.includes('object Object') || trimmed.includes('[object') || 
        trimmed.includes('NaN') || trimmed.includes('Infinity')) {
      console.warn('⚠️ Detected corrupted JSON data:', trimmed.substring(0, 50));
      return fallback;
    }
    
    // Validate JSON structure
    if (!((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
          (trimmed.startsWith('[') && trimmed.endsWith(']')))) {
      console.warn('⚠️ Invalid JSON structure:', trimmed.substring(0, 50));
      return fallback;
    }
    
    try {
      return JSON.parse(trimmed);
    } catch (error) {
      console.error('❌ JSON parse error:', error, 'Data:', trimmed.substring(0, 100));
      return fallback;
    }
  };

  // tRPC queries and mutations
  const notificationsQuery = trpc.settings.notifications.getAll.useQuery({
    enabled: !!user,
    refetchOnWindowFocus: false
  });
  
  const userSettingsQuery = trpc.settings.userSettings.get.useQuery({
    enabled: !!user,
    refetchOnWindowFocus: false
  });
  
  const markReadMutation = trpc.settings.notifications.markRead.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    }
  });
  
  const deleteNotificationMutation = trpc.settings.notifications.delete.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    }
  });
  
  const clearNotificationsMutation = trpc.settings.notifications.clearAll.useMutation({
    onSuccess: () => {
      notificationsQuery.refetch();
    }
  });
  
  const updateSettingsMutation = trpc.settings.userSettings.update.useMutation({
    onSuccess: () => {
      userSettingsQuery.refetch();
    }
  });

  useEffect(() => {
    if (user) {
      loadSettings();
    } else {
      loadNotifications();
    }
  }, [user]);
  
  useEffect(() => {
    if (notificationsQuery.data) {
      setNotifications(notificationsQuery.data);
    }
  }, [notificationsQuery.data]);
  
  useEffect(() => {
    if (userSettingsQuery.data && !isTogglingUnit) {
      console.log('🔄 Settings: Loading unit system from server:', userSettingsQuery.data.unitPreference);
      setUnitSystem(userSettingsQuery.data.unitPreference);
    }
  }, [userSettingsQuery.data, isTogglingUnit]);

  const loadSettings = useCallback(async () => {
    try {
      if (user?.unitPreference) {
        setUnitSystem(user.unitPreference);
      } else {
        const stored = await AsyncStorage.getItem('unitSystem');
        if (stored && stored.trim() && (stored === 'metric' || stored === 'imperial')) {
          setUnitSystem(stored as UnitSystem);
        }
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored && stored.trim()) {
        const parsed = safeJsonParse(stored, []);
        if (Array.isArray(parsed)) {
          setNotifications(parsed);
        } else {
          console.error('Failed to parse stored notifications, clearing corrupted data');
          await AsyncStorage.removeItem('notifications');
          setNotifications([]);
        }
      } else {
        // Mock notifications
        const mockNotifications: Notification[] = [
          {
            id: '1',
            title: 'Welcome to CGWise',
            message: 'Start exploring our grinding calculators',
            type: 'info',
            read: false,
            createdAt: new Date(),
          },
        ];
        setNotifications(mockNotifications);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const toggleUnitSystem = useCallback(async () => {
    const newSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    console.log('🔄 Toggling unit system from', unitSystem, 'to', newSystem);
    setIsTogglingUnit(true);
    setUnitSystem(newSystem);
    
    try {
      await AsyncStorage.setItem('unitSystem', newSystem);
      console.log('✅ Unit system saved to AsyncStorage:', newSystem);
      
      if (user) {
        try {
          await updateSettingsMutation.mutateAsync({ unitPreference: newSystem });
          await updateProfile({ unitPreference: newSystem });
          console.log('✅ Unit system updated in backend:', newSystem);
        } catch (error) {
          console.error('❌ Failed to update unit system in backend:', error);
          // Don't revert on backend error, keep local change
        }
      }
    } catch (error) {
      console.error('❌ Failed to save unit system to AsyncStorage:', error);
      // Revert on AsyncStorage error
      setUnitSystem(unitSystem);
    } finally {
      // Reset the toggling flag after a delay to allow server sync
      setTimeout(() => {
        setIsTogglingUnit(false);
      }, 1000);
    }
  }, [unitSystem, user, updateSettingsMutation, updateProfile]);

  const markNotificationRead = useCallback(async (id: string) => {
    if (user) {
      try {
        await markReadMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    } else {
      // Fallback for guest users
      const updated = notifications.map(n => 
        n.id === id ? { ...n, read: true } : n
      );
      setNotifications(updated);
      try {
        await AsyncStorage.setItem('notifications', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }
    }
  }, [user, markReadMutation, notifications]);

  const clearNotifications = useCallback(async () => {
    if (user) {
      try {
        await clearNotificationsMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    } else {
      // Fallback for guest users
      setNotifications([]);
      await AsyncStorage.removeItem('notifications');
    }
  }, [user, clearNotificationsMutation]);

  const deleteNotification = useCallback(async (id: string) => {
    if (user) {
      try {
        await deleteNotificationMutation.mutateAsync({ id });
      } catch (error) {
        console.error('Failed to delete notification:', error);
      }
    } else {
      // Fallback for guest users
      const updated = notifications.filter(n => n.id !== id);
      setNotifications(updated);
      try {
        await AsyncStorage.setItem('notifications', JSON.stringify(updated));
      } catch (error) {
        console.error('Failed to save notifications:', error);
      }
    }
  }, [user, deleteNotificationMutation, notifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  return useMemo(() => ({
    unitSystem,
    notifications,
    unreadCount,
    toggleUnitSystem,
    markNotificationRead,
    clearNotifications,
    deleteNotification,
  }), [unitSystem, notifications, unreadCount, toggleUnitSystem, markNotificationRead, clearNotifications, deleteNotification]);
});