import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { User, UserRole, UserStatus, AccessRequest, UnitSystem } from '@/types';

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
        setUser(JSON.parse(storedUser));
      } else if (storedUser && rememberMeEnabled !== 'false') {
        // For backward compatibility, keep user logged in if rememberMe is not explicitly false
        setUser(JSON.parse(storedUser));
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
    // Check if this is an admin user first
    const existingUsers = await AsyncStorage.getItem('approvedUsers');
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    const userAccount = users.find((user: User) => user.email === email);
    const isAdminUser = email === 'dolevb@cgwheels.com' || (userAccount && userAccount.role === 'admin');
    
    // Get max login attempts from admin settings
    const adminSettingsStr = await AsyncStorage.getItem('admin_settings');
    const adminSettings = adminSettingsStr ? JSON.parse(adminSettingsStr) : { maxLoginAttempts: 5 };
    const MAX_ATTEMPTS = adminSettings.maxLoginAttempts || 5;
    const LOCKOUT_DURATION_MINUTES = 15; // Keep this fixed for now, can be made configurable later
    
    // Check for account lockout (skip for admin users)
    if (!isAdminUser) {
      const loginAttemptsStr = await AsyncStorage.getItem('loginAttempts');
      const loginAttempts: LoginAttempt[] = loginAttemptsStr ? JSON.parse(loginAttemptsStr) : [];
      
      const userAttempts = loginAttempts.find(attempt => attempt.email === email);
      
      // Check if account is locked
      if (userAttempts && userAttempts.lockedUntil) {
        const lockTime = new Date(userAttempts.lockedUntil);
        const now = new Date();
        
        if (lockTime > now) {
          const minutesLeft = Math.ceil((lockTime.getTime() - now.getTime()) / (1000 * 60));
          throw new Error(`Account is locked due to multiple failed login attempts. Please try again in ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`);
        } else {
          // Lock period expired, reset attempts
          userAttempts.attempts = 0;
          userAttempts.lockedUntil = undefined;
        }
      }
    }
    // Check for maintenance mode
    const maintenanceMode = await AsyncStorage.getItem('maintenanceMode');
    if (maintenanceMode === 'true' && email !== 'dolevb@cgwheels.com') {
      throw new Error('System is currently under maintenance. Please try again later.');
    }
    
    // Helper function to handle failed login
    const handleFailedLogin = async (errorMessage: string) => {
      // Skip login attempt tracking for admin users
      if (isAdminUser) {
        // Log the failed attempt for admin users but don't lock them out
        const logs = await AsyncStorage.getItem('systemLogs');
        const systemLogs = logs ? JSON.parse(logs) : [];
        systemLogs.unshift({
          id: Date.now().toString(),
          type: 'info',
          message: `Admin user ${email} failed login attempt (admins exempt from lockout)`,
          timestamp: new Date(),
          user: email,
        });
        await AsyncStorage.setItem('systemLogs', JSON.stringify(systemLogs));
        throw new Error(errorMessage);
      }
      
      // Regular user login attempt tracking
      const loginAttemptsStr = await AsyncStorage.getItem('loginAttempts');
      const loginAttempts: LoginAttempt[] = loginAttemptsStr ? JSON.parse(loginAttemptsStr) : [];
      const userAttempts = loginAttempts.find(attempt => attempt.email === email);
      const now = new Date();
      
      if (!userAttempts) {
        // First failed attempt for this email
        loginAttempts.push({
          email,
          attempts: 1,
          lastAttempt: now
        });
      } else {
        // Increment attempts
        userAttempts.attempts += 1;
        userAttempts.lastAttempt = now;
        
        // Check if we should lock the account
        if (userAttempts.attempts >= MAX_ATTEMPTS) {
          const lockUntil = new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000);
          userAttempts.lockedUntil = lockUntil;
          
          // Log the lockout
          const logs = await AsyncStorage.getItem('systemLogs');
          const systemLogs = logs ? JSON.parse(logs) : [];
          systemLogs.unshift({
            id: Date.now().toString(),
            type: 'warning',
            message: `Account ${email} locked for ${LOCKOUT_DURATION_MINUTES} minutes after ${MAX_ATTEMPTS} failed login attempts`,
            timestamp: now,
            user: email,
          });
          await AsyncStorage.setItem('systemLogs', JSON.stringify(systemLogs));
          
          await AsyncStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
          throw new Error(`Too many failed login attempts. Account locked for ${LOCKOUT_DURATION_MINUTES} minutes.`);
        }
      }
      
      await AsyncStorage.setItem('loginAttempts', JSON.stringify(loginAttempts));
      
      const remainingAttempts = MAX_ATTEMPTS - (userAttempts?.attempts || 1);
      if (remainingAttempts <= 2 && remainingAttempts > 0) {
        throw new Error(`${errorMessage}\n\nWarning: ${remainingAttempts} attempt${remainingAttempts > 1 ? 's' : ''} remaining before account lockout.`);
      }
      
      throw new Error(errorMessage);
    };
    
    // Helper function to handle successful login
    const handleSuccessfulLogin = async (userData: User) => {
      // Clear login attempts for this user (only for non-admin users)
      if (!isAdminUser) {
        const loginAttemptsStr = await AsyncStorage.getItem('loginAttempts');
        const loginAttempts: LoginAttempt[] = loginAttemptsStr ? JSON.parse(loginAttemptsStr) : [];
        const userAttempts = loginAttempts.find(attempt => attempt.email === email);
        
        if (userAttempts) {
          const updatedAttempts = loginAttempts.filter(attempt => attempt.email !== email);
          await AsyncStorage.setItem('loginAttempts', JSON.stringify(updatedAttempts));
        }
      }
      
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      await AsyncStorage.setItem('guestMode', 'false');
      await AsyncStorage.setItem('rememberMe', rememberMe ? 'true' : 'false');
      setUser(userData);
      setIsGuest(false);
    };

    // Check if user exists in approved users (already loaded above)
    const approvedUser = userAccount;
    
    if (approvedUser) {
      // Check password - CRITICAL: Must validate password!
      if (approvedUser.password !== password) {
        await handleFailedLogin('Invalid credentials. Please check your email and password.');
        return; // This line won't be reached due to throw in handleFailedLogin
      }
      
      if (approvedUser.status === 'approved') {
        // Update last login
        const updatedUser = { ...approvedUser, lastLogin: new Date() };
        const updatedUsers = users.map((u: User) => u.id === approvedUser.id ? updatedUser : u);
        await AsyncStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
        await handleSuccessfulLogin(updatedUser);
        return;
      } else if (approvedUser.status === 'pending') {
        throw new Error('Your account is pending approval. Please wait for admin approval.');
      } else if (approvedUser.status === 'rejected' || approvedUser.status === 'suspended') {
        throw new Error('Your account access has been denied. Please contact support.');
      }
    }
    
    // Check if user has a pending request
    const pendingRequests = await AsyncStorage.getItem('pendingRequests');
    const requests = pendingRequests ? JSON.parse(pendingRequests) : [];
    const pendingRequest = requests.find((req: any) => req.email === email);
    
    if (pendingRequest) {
      throw new Error('Your access request is pending approval. Please wait for admin review.');
    }
    
    // Admin user - CRITICAL: Must check exact password!
    if (email === 'dolevb@cgwheels.com') {
      if (password === 'Do123456$$') {
        const adminUser: User = {
          id: 'admin-1',
          email,
          name: 'Dolev B',
          role: 'admin',
          status: 'approved',
          unitPreference: 'metric',
          createdAt: new Date(),
          lastLogin: new Date(),
        };
        await handleSuccessfulLogin(adminUser);
        return;
      } else {
        await handleFailedLogin('Invalid credentials. Please check your email and password.');
        return;
      }
    }
    
    await handleFailedLogin('Invalid credentials or user not found. Please check your email and password or request access.');
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
      const sentEmails = emails ? JSON.parse(emails) : [];
      
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
      const systemLogs = logs ? JSON.parse(logs) : [];
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
    const { email, name, password, company, position, country, preferredUnits } = data;
    
    // Check if user already exists
    const existingRequests = await AsyncStorage.getItem('pendingRequests');
    const requests = existingRequests ? JSON.parse(existingRequests) : [];
    
    const existingUser = requests.find((req: AccessRequest) => req.email === email);
    if (existingUser) {
      throw new Error('A request with this email already exists');
    }

    // Check if user is already approved
    const existingUsers = await AsyncStorage.getItem('approvedUsers');
    const users = existingUsers ? JSON.parse(existingUsers) : [];
    const approvedUser = users.find((user: User) => user.email === email);
    if (approvedUser) {
      throw new Error('A user with this email already exists');
    }

    const newRequest: AccessRequest = {
      id: Date.now().toString(),
      email,
      name,
      password, // In production, this should be hashed
      company,
      position,
      country,
      preferredUnits,
      role: 'starter' as UserRole,
      status: 'pending' as UserStatus,
      createdAt: new Date(),
      requestDate: new Date(),
    };

    // Add to pending requests
    requests.push(newRequest);
    await AsyncStorage.setItem('pendingRequests', JSON.stringify(requests));
    
    // Send confirmation email to user
    await sendEmail(
      email,
      'CGWise Access Request Received',
      `Dear ${name},\n\nThank you for requesting access to CGWise. Your request has been received and is currently under review.\n\nRequest Details:\n- Name: ${name}\n- Email: ${email}\n- Company: ${company}\n- Position: ${position}\n- Country: ${country}\n\nYou will receive another email once your request has been reviewed by our administrators.\n\nBest regards,\nCGWise Team`,
      'request'
    );
    
    // Send notification email to admin
    await sendEmail(
      'dolevb@cgwheels.com',
      'New Access Request - CGWise',
      `A new access request has been submitted:\n\nUser Details:\n- Name: ${name}\n- Email: ${email}\n- Company: ${company}\n- Position: ${position}\n- Country: ${country}\n- Preferred Units: ${preferredUnits}\n\nPlease review this request in the admin panel.\n\nCGWise Admin System`,
      'request'
    );
    
    // Add log entry
    const logs = await AsyncStorage.getItem('systemLogs');
    const systemLogs = logs ? JSON.parse(logs) : [];
    systemLogs.unshift({
      id: Date.now().toString(),
      type: 'info',
      message: `User ${name} (${email}) from ${company} requested access - Confirmation emails sent`,
      timestamp: new Date(),
      user: email,
    });
    await AsyncStorage.setItem('systemLogs', JSON.stringify(systemLogs));
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