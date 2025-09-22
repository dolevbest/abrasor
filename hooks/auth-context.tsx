import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { User, UserRole, UserStatus, AccessRequest, UnitSystem } from '@/types';
import { trpcClient } from '@/lib/trpc';

interface RequestAccessData {
  email: string;
  name: string;
  password: string;
  company: string;
  position: string;
  country: string;
  preferredUnits: UnitSystem;
}

interface LoginAttempt {
  email: string;
  attempts: number;
  lastAttempt: Date;
  lockedUntil?: Date;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isGuest: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  requestAccess: (data: RequestAccessData) => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  upgradeFromGuest: () => void;
}

export const [AuthProvider, useAuth] = createContextHook<AuthState>(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const rememberMeEnabled = await AsyncStorage.getItem('rememberMe');
      const storedUser = await AsyncStorage.getItem('user');
      const guestMode = await AsyncStorage.getItem('guestMode');
      
      if (rememberMeEnabled === 'true' && storedUser) {
        // Auto-login if remember me was enabled
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          await AsyncStorage.removeItem('user');
        }
      } else if (storedUser && rememberMeEnabled !== 'false') {
        // For backward compatibility, keep user logged in if rememberMe is not explicitly false
        try {
          setUser(JSON.parse(storedUser));
        } catch (error) {
          console.error('Failed to parse stored user data:', error);
          await AsyncStorage.removeItem('user');
        }
      } else if (guestMode === 'true') {
        setIsGuest(true);
      } else {
        // Clear user data if remember me is disabled
        await AsyncStorage.removeItem('user');
      }
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const result = await trpcClient.auth.login.mutate({ email, password, rememberMe });
      
      if (result) {
        // Store user data locally
        await AsyncStorage.setItem('user', JSON.stringify(result.user));
        await AsyncStorage.setItem('guestMode', 'false');
        await AsyncStorage.setItem('rememberMe', result.rememberMe ? 'true' : 'false');
        
        setUser(result.user);
        setIsGuest(false);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      throw new Error(error.message || 'Login failed');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('guestMode');
    await AsyncStorage.removeItem('rememberMe');
    setUser(null);
    setIsGuest(false);
  };

  const sendEmail = async (to: string, subject: string, body: string, type: 'request' | 'approval' | 'rejection') => {
    try {
      // Simulate email sending using Gmail SMTP
      const emailData = {
        from: 'noreplay.cgw@gmail.com',
        to,
        subject,
        text: body,
        html: body.replace(/\n/g, '<br>'),
      };
      
      // In a real implementation, you would use a proper email service
      // For now, we'll simulate the email sending process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Store email in mock email system
      const emails = await AsyncStorage.getItem('sentEmails');
      let sentEmails = [];
      try {
        sentEmails = emails ? JSON.parse(emails) : [];
      } catch (error) {
        console.error('Failed to parse sent emails:', error);
        sentEmails = [];
      }
      
      const emailRecord = {
        id: Date.now().toString(),
        from: 'noreplay.cgw@gmail.com',
        to,
        subject,
        body,
        type,
        sentAt: new Date(),
        status: 'sent'
      };
      
      sentEmails.unshift(emailRecord);
      await AsyncStorage.setItem('sentEmails', JSON.stringify(sentEmails));
      
      // Add to system logs
      const logs = await AsyncStorage.getItem('systemLogs');
      let systemLogs = [];
      try {
        systemLogs = logs ? JSON.parse(logs) : [];
      } catch (error) {
        console.error('Failed to parse system logs:', error);
        systemLogs = [];
      }
      systemLogs.unshift({
        id: Date.now().toString(),
        type: 'info',
        message: `Email sent from noreplay.cgw@gmail.com to ${to}: ${subject}`,
        timestamp: new Date(),
        user: 'system',
      });
      await AsyncStorage.setItem('systemLogs', JSON.stringify(systemLogs));
      
      console.log(`📧 Email sent from noreplay.cgw@gmail.com to ${to}:`, { subject, body, type });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw new Error('Failed to send email notification');
    }
  };

  const requestAccess = async (data: RequestAccessData) => {
    try {
      await trpcClient.auth.requestAccess.mutate(data);
    } catch (error: any) {
      console.error('Request access error:', error);
      throw new Error(error.message || 'Failed to submit access request');
    }
  };

  const updateProfile = async (updates: Partial<User>) => {
    if (!user) return;
    
    const updatedUser = { ...user, ...updates };
    await AsyncStorage.setItem('user', JSON.stringify(updatedUser));
    setUser(updatedUser);
  };

  const continueAsGuest = async () => {
    // Check if guest mode is enabled
    const guestModeEnabled = await AsyncStorage.getItem('guestModeEnabled');
    if (guestModeEnabled === 'false') {
      throw new Error('Guest mode is currently disabled. Please create an account or login.');
    }
    
    // Check for maintenance mode
    const maintenanceMode = await AsyncStorage.getItem('maintenanceMode');
    if (maintenanceMode === 'true') {
      throw new Error('System is currently under maintenance. Please try again later.');
    }
    
    await AsyncStorage.setItem('guestMode', 'true');
    await AsyncStorage.removeItem('user');
    setIsGuest(true);
    setUser(null);
  };

  const upgradeFromGuest = () => {
    setIsGuest(false);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user.status === 'approved',
    isGuest,
    login,
    logout,
    requestAccess,
    updateProfile,
    continueAsGuest,
    upgradeFromGuest,
  };
});