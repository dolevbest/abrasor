import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Switch,
  Modal,
  FlatList,
  PanResponder,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { 
  Users, 
  Calculator, 
  Settings, 
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Edit2,
  Trash2,
  Plus,
  Search,
  Download,
  Mail,
  Shield,
  Database,
  Activity,
  AlertCircle,
  Filter,
  X,
  Bell,
  Send,
  AlertTriangle,
  Info,
  Globe,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  TrendingUp,
  Eye,
  RefreshCw,
  UserCheck,
  Crown,
  Star,
  UserX,
} from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppNotification } from '@/hooks/notifications-context';
import { useAuth } from '@/hooks/auth-context';
import { SafeAreaView } from 'react-native-safe-area-context';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'premium' | 'starter';
  status: 'approved' | 'pending' | 'suspended';
  createdAt: Date;
  lastLogin?: Date;
  unitPreference: 'metric' | 'imperial';
  company?: string;
  position?: string;
  country?: string;
}

interface CalculatorInput {
  id: string;
  name: string;
  label: string;
  unit: string;
  unitMetric?: string;
  unitImperial?: string;
  type: 'number';
  placeholder?: string;
  placeholderMetric?: string;
  placeholderImperial?: string;
  defaultValue?: number;
}

interface FormulaNode {
  id: string;
  type: 'input' | 'number' | 'operator' | 'function';
  value: string;
  label?: string;
  children?: FormulaNode[];
}

interface CalculatorConfig {
  id: string;
  name: string;
  categories: string[];
  enabled: boolean;
  usageCount: number;
  lastModified: Date;
  inputs: CalculatorInput[];
  formula: FormulaNode;
  resultUnit: string;
  resultUnitMetric?: string;
  resultUnitImperial?: string;
  description?: string;
  shortName?: string;
}

interface SystemLog {
  id: string;
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  user?: string;
}

interface Visitor {
  id: string;
  ipAddress: string;
  location: {
    country: string;
    city: string;
    region: string;
    countryCode: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  device: {
    type: 'mobile' | 'tablet' | 'desktop';
    os: string;
    browser: string;
  };
  visitTime: Date;
  duration: number; // in seconds
  pagesVisited: string[];
  referrer?: string;
  isReturning: boolean;
}

type TabType = 'overview' | 'users' | 'calculators' | 'notifications' | 'settings' | 'logs' | 'visitors';

export default function AdminScreen() {
  let user = null;
  let isAuthenticated = false;
  let isGuest = false;
  
  try {
    const authContext = useAuth();
    if (authContext) {
      user = authContext.user;
      isAuthenticated = authContext.isAuthenticated;
      isGuest = authContext.isGuest;
    }
  } catch (error) {
    console.error('Error accessing auth context:', error);
  }

  // Security check: Only allow admin users to access this screen
  if (isGuest) {
    return (
      <SafeAreaView style={styles.accessDenied} edges={['top', 'bottom']}>
        <Shield size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          Guest users cannot access the admin panel. Please log in with an admin account.
        </Text>
      </SafeAreaView>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <SafeAreaView style={styles.accessDenied} edges={['top', 'bottom']}>
        <Shield size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Authentication Required</Text>
        <Text style={styles.accessDeniedText}>
          Please log in to access the admin panel.
        </Text>
      </SafeAreaView>
    );
  }

  if (user.role !== 'admin') {
    return (
      <SafeAreaView style={styles.accessDenied} edges={['top', 'bottom']}>
        <Shield size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Admin Access Required</Text>
        <Text style={styles.accessDeniedText}>
          Only administrators can access this panel. Your role: {user.role}
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <Text style={styles.title}>Admin Panel</Text>
        <Text style={styles.subtitle}>Welcome, {user.name}</Text>
        
        <View style={styles.quickStats}>
          <View style={[styles.statCard, Shadows.small]}>
            <Users size={24} color={Colors.primary} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          
          <View style={[styles.statCard, Shadows.small]}>
            <Calculator size={24} color={Colors.success} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Calculators</Text>
          </View>
          
          <View style={[styles.statCard, Shadows.small]}>
            <Activity size={24} color={Colors.warning} />
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>Active Sessions</Text>
          </View>
        </View>
        
        <View style={styles.adminActions}>
          <TouchableOpacity style={[styles.actionButton, Shadows.small]}>
            <Users size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Manage Users</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, Shadows.small]}>
            <Calculator size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>Manage Calculators</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, Shadows.small]}>
            <Settings size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>System Settings</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.actionButton, Shadows.small]}>
            <FileText size={20} color={Colors.primary} />
            <Text style={styles.actionButtonText}>View Logs</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
  },
  quickStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  adminActions: {
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  accessDenied: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 32,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.error,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  accessDeniedText: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});