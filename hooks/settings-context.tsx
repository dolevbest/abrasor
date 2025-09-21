import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { UnitSystem, Notification } from '@/types';
import { useAuth } from '@/hooks/auth-context';

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

  useEffect(() => {
    loadSettings();
    loadNotifications();
  }, [user]);

  const loadSettings = async () => {
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
  };

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('notifications');
      if (stored) {
        setNotifications(JSON.parse(stored));
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

  const toggleUnitSystem = async () => {
    const newSystem = unitSystem === 'metric' ? 'imperial' : 'metric';
    setUnitSystem(newSystem);
    await AsyncStorage.setItem('unitSystem', newSystem);
    
    if (user) {
      await updateProfile({ unitPreference: newSystem });
    }
  };

  const markNotificationRead = async (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    await AsyncStorage.setItem('notifications', JSON.stringify(updated));
  };

  const clearNotifications = async () => {
    setNotifications([]);
    await AsyncStorage.removeItem('notifications');
  };

  const deleteNotification = async (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    setNotifications(updated);
    await AsyncStorage.setItem('notifications', JSON.stringify(updated));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    unitSystem,
    notifications,
    unreadCount,
    toggleUnitSystem,
    markNotificationRead,
    clearNotifications,
    deleteNotification,
  };
});