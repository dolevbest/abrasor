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
    if (userSettingsQuery.data) {
      setUnitSystem(userSettingsQuery.data.unitPreference);
    }
  }, [userSettingsQuery.data]);

  const loadSettings = useCallback(async () => {
    try {
      if (user?.unitPreference) {
        setUnitSystem(user.unitPreference);
      } else {
        const stored = await AsyncStorage.getItem('unitSystem');
        if (stored) {
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
      if (stored) {
        try {
          setNotifications(JSON.parse(stored));
        } catch (error) {
          console.error('Failed to parse stored notifications:', error);
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
    setUnitSystem(newSystem);
    await AsyncStorage.setItem('unitSystem', newSystem);
    
    if (user) {
      try {
        await updateSettingsMutation.mutateAsync({ unitPreference: newSystem });
        await updateProfile({ unitPreference: newSystem });
      } catch (error) {
        console.error('Failed to update unit system:', error);
        // Revert on error
        setUnitSystem(unitSystem);
      }
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
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
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
      await AsyncStorage.setItem('notifications', JSON.stringify(updated));
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