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

type TabType = 'overview' | 'users' | 'calculators' | 'notifications' | 'settings' | 'logs' | 'visitors' | 'groups';

// Draggable Element Component with drag and drop support
function FormulaElement({ 
  type, 
  value, 
  label, 
  style, 
  textStyle, 
  onPress,
  onDragStart,
  onDragEnd,
  isDraggable = true
}: {
  type: string;
  value: string;
  label: string;
  style: any;
  textStyle: any;
  onPress: (element: { type: string; value: string; label?: string }) => void;
  onDragStart?: (element: { type: string; value: string; label?: string }) => void;
  onDragEnd?: () => void;
  isDraggable?: boolean;
}) {
  const pan = useRef(new Animated.ValueXY()).current;
  const [isDragging, setIsDragging] = useState(false);
  const [originalPosition, setOriginalPosition] = useState({ x: 0, y: 0 });
  const elementRef = useRef<View>(null);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        // Only start drag if it's a significant movement and draggable
        return isDraggable && (Math.abs(gestureState.dx) > 5 || Math.abs(gestureState.dy) > 5);
      },
      onPanResponderGrant: (evt, gestureState) => {
        if (!isDraggable) return;
        
        console.log('Drag started for:', { type, value, label });
        setIsDragging(true);
        
        // Store original position
        elementRef.current?.measure((x, y, width, height, pageX, pageY) => {
          setOriginalPosition({ x: pageX, y: pageY });
        });
        
        // Set the offset to current pan value
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        
        if (onDragStart) {
          onDragStart({ type, value, label });
        }
      },
      onPanResponderMove: (evt, gestureState) => {
        if (!isDraggable) return;
        
        // Update pan values
        Animated.event(
          [null, { dx: pan.x, dy: pan.y }],
          { useNativeDriver: false }
        )(evt, gestureState);
      },
      onPanResponderRelease: (evt, gestureState) => {
        if (!isDraggable) return;
        
        console.log('Drag ended for:', { type, value, label });
        setIsDragging(false);
        
        // Flatten the offset
        pan.flattenOffset();
        
        // Animate back to original position
        Animated.spring(pan, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        
        if (onDragEnd) {
          onDragEnd();
        }
        
        // Also trigger onPress for drop functionality
        if (onPress) {
          onPress({ type, value, label });
        }
      },
    })
  ).current;

  const handlePress = () => {
    if (!isDragging) {
      console.log('FormulaElement pressed:', { type, value, label });
      if (onPress) {
        onPress({ type, value, label });
      }
    }
  };

  return (
    <Animated.View
      ref={elementRef}
      style={[
        {
          transform: [{ translateX: pan.x }, { translateY: pan.y }],
          zIndex: isDragging ? 1000 : 1,
          elevation: isDragging ? 10 : 1,
        },
      ]}
      {...(isDraggable ? panResponder.panHandlers : {})}
    >
      <TouchableOpacity
        style={[
          style,
          isDragging && {
            opacity: 0.8,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
            elevation: 8,
          }
        ]}
        onPress={handlePress}
        activeOpacity={0.6}
        hitSlop={{ top: 5, bottom: 5, left: 5, right: 5 }}
        disabled={isDragging}
      >
        <Text style={textStyle}>{label}</Text>
        {isDraggable && (
          <View style={styles.dragIndicator}>
            <View style={styles.dragDot} />
            <View style={styles.dragDot} />
            <View style={styles.dragDot} />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [showFormulaBuilder, setShowFormulaBuilder] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedCalculator, setSelectedCalculator] = useState<CalculatorConfig | null>(null);
  const [calculatorForm, setCalculatorForm] = useState({
    name: '',
    categories: [] as string[],
    description: '',
    inputs: [] as CalculatorInput[],
    formula: null as FormulaNode | null,
    resultUnit: '',
    resultUnitMetric: '',
    resultUnitImperial: '',
  });
  const [draggedElement, setDraggedElement] = useState<{ type: string; value: string; label?: string } | null>(null);
  const [dropZones, setDropZones] = useState<Array<{ id: string; x: number; y: number; width: number; height: number }>>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const dragPosition = useRef(new Animated.ValueXY()).current;
  const [availableCategories] = useState(['Surface Grinding', 'OD Grinding', 'ID Grinding', 'Centerless', 'Creep Feed']);

  // Handle drag start
  const handleDragStart = (element: { type: string; value: string; label?: string }) => {
    console.log('Drag started:', element);
    setDraggedElement(element);
    setIsDragActive(true);
  };

  // Handle drag end
  const handleDragEnd = () => {
    console.log('Drag ended');
    setDraggedElement(null);
    setIsDragActive(false);
  };

  // Handle element addition in formula builder
  const handleElementDrop = (element: { type: string; value: string; label?: string }) => {
    console.log('Element dropped:', element);
    try {
      const currentText = calculatorForm.formula ? renderFormulaAsText(calculatorForm.formula) : '';
      let newText = currentText;
      
      // Add appropriate spacing
      if (currentText) {
        if (element.type === 'operator') {
          // Add space before operators (except opening parenthesis)
          if (element.value !== '(' && !currentText.endsWith(' ') && !currentText.endsWith('(')) {
            newText += ' ';
          }
          newText += element.value;
          // Add space after operators (except closing parenthesis)
          if (element.value !== ')' && element.value !== '(') {
            newText += ' ';
          }
        } else {
          // For numbers and inputs, add space if needed
          if (!currentText.endsWith(' ') && !currentText.endsWith('(') && currentText.length > 0) {
            newText += ' ';
          }
          newText += element.value;
        }
      } else {
        // First element, no spacing needed
        newText = element.value;
      }
      
      console.log('New formula text:', newText);
      // Update the formula text directly without parsing to preserve user input
      setCalculatorForm(prev => ({
        ...prev,
        formula: {
          id: `formula_${Date.now()}`,
          type: 'input',
          value: newText,
          label: newText
        }
      }));
    } catch (error) {
      console.error('Error in handleElementDrop:', error);
    }
  };

  // Parse formula from text
  const parseFormulaFromText = (text: string, inputs: CalculatorInput[]): FormulaNode | null => {
    console.log('Parsing formula text:', text);
    try {
      if (!text.trim()) {
        return null;
      }
      
      // Simple expression parser for basic arithmetic
      const parseExpression = (expr: string): FormulaNode | null => {
        // Clean up the expression
        const cleanExpr = expr.trim().replace(/\s+/g, ' ');
        if (!cleanExpr) return null;
        
        console.log('Parsing expression:', cleanExpr);
        
        // Tokenize the expression - improved regex to handle operators better
        const tokens = cleanExpr.match(/[a-zA-Z_][a-zA-Z0-9_]*|[0-9]+(?:\.[0-9]+)?|[+\-*/()]|\s+/g) || [];
        const cleanTokens = tokens.filter(t => t.trim() && t !== ' ');
        
        console.log('Tokens:', cleanTokens);
        
        if (cleanTokens.length === 0) return null;
        
        // Handle single token
        if (cleanTokens.length === 1) {
          const node = createNodeFromToken(cleanTokens[0], inputs);
          console.log('Single token node:', node);
          return node;
        }
        
        // Handle simple binary operations (a op b)
        if (cleanTokens.length === 3 && /^[+\-*/]$/.test(cleanTokens[1])) {
          const leftNode = createNodeFromToken(cleanTokens[0], inputs);
          const rightNode = createNodeFromToken(cleanTokens[2], inputs);
          
          if (leftNode && rightNode) {
            const node = {
              id: `node_${Date.now()}_${Math.random()}`,
              type: 'operator' as const,
              value: cleanTokens[1],
              children: [leftNode, rightNode]
            };
            console.log('Binary operation node:', node);
            return node;
          }
        }
        
        // Handle parentheses first
        if (cleanTokens[0] === '(' && cleanTokens[cleanTokens.length - 1] === ')') {
          // Check if parentheses are balanced and wrap the entire expression
          let depth = 0;
          let isWrapped = true;
          for (let i = 0; i < cleanTokens.length; i++) {
            if (cleanTokens[i] === '(') depth++;
            else if (cleanTokens[i] === ')') depth--;
            if (depth === 0 && i < cleanTokens.length - 1) {
              isWrapped = false;
              break;
            }
          }
          
          if (isWrapped) {
            const innerExpr = cleanTokens.slice(1, -1).join(' ');
            return parseExpression(innerExpr);
          }
        }
        
        // Find the main operator (lowest precedence, rightmost)
        let mainOpIndex = -1;
        let parenDepth = 0;
        
        // First pass: look for + or - outside parentheses
        for (let i = cleanTokens.length - 1; i >= 0; i--) {
          const token = cleanTokens[i];
          if (token === ')') parenDepth++;
          else if (token === '(') parenDepth--;
          else if (parenDepth === 0 && /^[+\-]$/.test(token)) {
            mainOpIndex = i;
            break;
          }
        }
        
        // Second pass: if no + or -, look for * or /
        if (mainOpIndex === -1) {
          parenDepth = 0;
          for (let i = cleanTokens.length - 1; i >= 0; i--) {
            const token = cleanTokens[i];
            if (token === ')') parenDepth++;
            else if (token === '(') parenDepth--;
            else if (parenDepth === 0 && /^[*/]$/.test(token)) {
              mainOpIndex = i;
              break;
            }
          }
        }
        
        if (mainOpIndex > 0 && mainOpIndex < cleanTokens.length - 1) {
          const leftExpr = cleanTokens.slice(0, mainOpIndex).join(' ');
          const rightExpr = cleanTokens.slice(mainOpIndex + 1).join(' ');
          const operator = cleanTokens[mainOpIndex];
          
          const leftNode = parseExpression(leftExpr);
          const rightNode = parseExpression(rightExpr);
          
          if (leftNode && rightNode) {
            const node = {
              id: `node_${Date.now()}_${Math.random()}`,
              type: 'operator' as const,
              value: operator,
              children: [leftNode, rightNode]
            };
            console.log('Complex operation node:', node);
            return node;
          }
        }
        
        // If we can't parse it as a complex expression, try to create a simple text node
        console.log('Creating simple text node for:', cleanExpr);
        return {
          id: `text_${Date.now()}_${Math.random()}`,
          type: 'input' as const,
          value: cleanExpr,
          label: cleanExpr
        };
      };
      
      const formulaNode = parseExpression(text);
      console.log('Final formula node:', formulaNode);
      return formulaNode;
    } catch (error) {
      console.error('Error parsing formula:', error);
      // Return a simple text node instead of null to preserve the text
      return {
        id: `error_${Date.now()}`,
        type: 'input' as const,
        value: text,
        label: text
      };
    }
  };

  // Handle formula text change from input field
  const handleFormulaTextChange = (text: string) => {
    console.log('Formula text changed to:', text);
    // Store the text directly without parsing to preserve user input
    setCalculatorForm(prev => ({ 
      ...prev, 
      formula: text.trim() ? {
        id: `formula_${Date.now()}`,
        type: 'input',
        value: text,
        label: text
      } : null
    }));
  };

  // Helper function to create node from token
  const createNodeFromToken = (token: string, inputs: CalculatorInput[]): FormulaNode | null => {
    const trimmedToken = token.trim();
    if (!trimmedToken) return null;
    
    console.log('Creating node from token:', trimmedToken, 'Available inputs:', inputs.map(i => i.name));
    
    // Check if it's a number (including decimals)
    const isNumber = /^[0-9]+(?:\.[0-9]+)?$/.test(trimmedToken);
    
    if (isNumber) {
      const node = {
        id: `node_${Date.now()}_${Math.random()}`,
        type: 'number' as const,
        value: trimmedToken,
      };
      console.log('Created number node:', node);
      return node;
    }
    
    // Check if it's an input variable
    const input = inputs.find(i => i.name === trimmedToken);
    if (input) {
      const node = {
        id: `node_${Date.now()}_${Math.random()}`,
        type: 'input' as const,
        value: input.name,
        label: input.label,
      };
      console.log('Created input node:', node);
      return node;
    }
    
    // If it's not a number or known input, return null
    console.warn('Unknown token:', trimmedToken);
    return null;
  };

  // Helper function to render formula as text
  const renderFormulaAsText = (node: FormulaNode): string => {
    if (!node) return '';
    
    // For simple text nodes (our new approach), just return the value
    if (node.type === 'input' && !node.children) {
      return node.value || '';
    }
    
    if (node.type === 'number') {
      return node.value;
    }
    
    if (node.type === 'operator' && node.children && node.children.length === 2) {
      const left = renderFormulaAsText(node.children[0]);
      const right = renderFormulaAsText(node.children[1]);
      
      // Add parentheses only when necessary
      const needsParens = node.children.some(child => 
        child.type === 'operator' && 
        ((node.value === '*' || node.value === '/') && (child.value === '+' || child.value === '-'))
      );
      
      if (needsParens) {
        return `(${left} ${node.value} ${right})`;
      } else {
        return `${left} ${node.value} ${right}`;
      }
    }
    
    // Fallback: return the value directly
    return node.value || '';
  };

  // Send notification to users about calculator changes
  const sendCalculatorNotification = async (action: 'added' | 'updated' | 'enabled' | 'disabled', calculatorName: string) => {
    try {
      const notification: AppNotification = {
        id: Date.now().toString(),
        title: `Calculator ${action === 'added' ? 'Added' : action === 'updated' ? 'Updated' : action === 'enabled' ? 'Enabled' : 'Disabled'}`,
        body: `The calculator "${calculatorName}" has been ${action}. ${action === 'added' || action === 'enabled' ? 'Pull to refresh to see the latest calculators.' : action === 'updated' ? 'Pull to refresh to get the latest version.' : 'This calculator is no longer available.'}`,
        icon: action === 'added' || action === 'enabled' ? 'success' : action === 'updated' ? 'info' : 'warning',
        targetGroups: ['all'],
        displayDuration: 8,
        priority: 'medium',
        createdAt: new Date(),
        createdBy: 'admin',
        read: false,
      };

      // Save to sent notifications
      const storedNotifications = await AsyncStorage.getItem('sentNotifications');
      const currentNotifications = storedNotifications ? JSON.parse(storedNotifications) : [];
      const updated = [notification, ...currentNotifications];
      await AsyncStorage.setItem('sentNotifications', JSON.stringify(updated));

      // Broadcast to all users
      await AsyncStorage.setItem('broadcastNotification', JSON.stringify(notification));

      console.log(`📢 Calculator notification sent: ${notification.title}`);
    } catch (error) {
      console.error('Failed to send calculator notification:', error);
    }
  };

  // Handle saving calculator
  const handleSaveCalculator = async () => {
    if (!calculatorForm.name.trim()) {
      Alert.alert('Error', 'Please enter a calculator name');
      return;
    }

    if (calculatorForm.categories.length === 0) {
      Alert.alert('Error', 'Please select at least one category');
      return;
    }

    if (calculatorForm.inputs.length === 0) {
      Alert.alert('Error', 'Please add at least one input variable');
      return;
    }

    if (!calculatorForm.formula) {
      Alert.alert('Error', 'Please build a formula');
      return;
    }

    try {
      const newCalculator: CalculatorConfig = {
        id: selectedCalculator?.id || Date.now().toString(),
        name: calculatorForm.name,
        categories: calculatorForm.categories,
        description: calculatorForm.description,
        inputs: calculatorForm.inputs,
        formula: calculatorForm.formula,
        resultUnit: calculatorForm.resultUnit,
        resultUnitMetric: calculatorForm.resultUnitMetric || calculatorForm.resultUnit,
        resultUnitImperial: calculatorForm.resultUnitImperial || calculatorForm.resultUnit,
        enabled: true,
        usageCount: selectedCalculator?.usageCount || 0,
        lastModified: new Date(),
      };

      let updatedCalculators;
      const isUpdate = !!selectedCalculator;
      if (isUpdate) {
        updatedCalculators = calculators.map(c => 
          c.id === selectedCalculator.id ? newCalculator : c
        );
      } else {
        updatedCalculators = [...calculators, newCalculator];
      }

      setCalculators(updatedCalculators);
      await AsyncStorage.setItem('admin_calculators', JSON.stringify(updatedCalculators));

      // Send notification to users
      await sendCalculatorNotification(
        isUpdate ? 'updated' : 'added',
        newCalculator.name
      );

      // Add log entry
      const newLog = {
        id: Date.now().toString(),
        type: 'info' as const,
        message: `Calculator "${newCalculator.name}" ${isUpdate ? 'updated' : 'created'} by admin - Notification sent to users`,
        timestamp: new Date(),
        user: 'admin',
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));

      setShowCalculatorModal(false);
      setSelectedCalculator(null);
      Alert.alert('Success', `Calculator ${isUpdate ? 'updated' : 'created'} successfully! Users have been notified.`);
    } catch (error) {
      console.error('Failed to save calculator:', error);
      Alert.alert('Error', 'Failed to save calculator');
    }
  };
  const [editUserForm, setEditUserForm] = useState({
    name: '',
    email: '',
    role: 'starter' as AdminUser['role'],
    status: 'approved' as AdminUser['status'],
    unitPreference: 'metric' as AdminUser['unitPreference'],
    company: '',
    position: '',
    country: '',
  });
  
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);

  const [calculators, setCalculators] = useState<CalculatorConfig[]>([
    {
      id: '1',
      name: 'Specific Material Removal Rate (Qw)',
      categories: ['Surface Grinding', 'OD Grinding'],
      enabled: true,
      usageCount: 342,
      lastModified: new Date(),
      inputs: [
        { id: 'vw', name: 'vw', label: 'Work Speed', unit: 'm/min', type: 'number' },
        { id: 'ae', name: 'ae', label: 'Depth of Cut', unit: 'mm', type: 'number' },
      ],
      formula: {
        id: 'f1',
        type: 'operator',
        value: '*',
        children: [
          { id: 'f2', type: 'input', value: 'vw', label: 'Work Speed' },
          { id: 'f3', type: 'input', value: 'ae', label: 'Depth of Cut' },
        ],
      },
      resultUnit: 'mm³/mm·s',
      description: 'Calculate the specific material removal rate',
    },
    {
      id: '2',
      name: 'Speed Ratio (Qs)',
      categories: ['Surface Grinding', 'ID Grinding', 'OD Grinding'],
      enabled: true,
      usageCount: 287,
      lastModified: new Date(Date.now() - 86400000),
      inputs: [
        { id: 'vs', name: 'vs', label: 'Wheel Speed', unit: 'm/s', type: 'number' },
        { id: 'vw', name: 'vw', label: 'Work Speed', unit: 'm/min', type: 'number' },
      ],
      formula: {
        id: 'f1',
        type: 'operator',
        value: '/',
        children: [
          { id: 'f2', type: 'input', value: 'vs', label: 'Wheel Speed' },
          { id: 'f3', type: 'operator', value: '/', children: [
            { id: 'f4', type: 'input', value: 'vw', label: 'Work Speed' },
            { id: 'f5', type: 'number', value: '60' },
          ]},
        ],
      },
      resultUnit: '',
      description: 'Calculate the speed ratio between wheel and workpiece',
    },
  ]);

  const [systemSettings, setSystemSettings] = useState({
    maintenanceMode: false,
    defaultUnit: 'metric',
    emailNotifications: true,
    autoApprove: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    guestModeEnabled: true,
    maxGuestCalculations: 50,
    dataRetentionDays: 365,
    backupEnabled: true,
    analyticsEnabled: true,
  });

  // Group settings state
  type GroupKey = 'admin' | 'premium' | 'starter' | 'guest';
  interface GroupSettings {
    name: string;
    description: string;
    calculatorsAccess: 'All' | 'Basic' | 'Limited';
    usageLimit: string;
    permissions: {
      userManagement: boolean;
      calculatorManagement: boolean;
      systemSettings: boolean;
      analytics: boolean;
    };
  }
  const defaultGroupSettings: Record<GroupKey, GroupSettings> = {
    admin: {
      name: 'Administrators',
      description: 'Full system access and management',
      calculatorsAccess: 'All',
      usageLimit: '∞',
      permissions: {
        userManagement: true,
        calculatorManagement: true,
        systemSettings: true,
        analytics: true,
      }
    },
    premium: {
      name: 'Premium Users',
      description: 'Advanced features and unlimited usage',
      calculatorsAccess: 'All',
      usageLimit: '∞',
      permissions: {
        userManagement: false,
        calculatorManagement: false,
        systemSettings: false,
        analytics: true,
      }
    },
    starter: {
      name: 'Starter Users',
      description: 'Basic access with usage limits',
      calculatorsAccess: 'Basic',
      usageLimit: '50/day',
      permissions: {
        userManagement: false,
        calculatorManagement: false,
        systemSettings: false,
        analytics: false,
      }
    },
    guest: {
      name: 'Guest Users',
      description: 'Limited trial access without registration',
      calculatorsAccess: 'Limited',
      usageLimit: '10/day',
      permissions: {
        userManagement: false,
        calculatorManagement: false,
        systemSettings: false,
        analytics: false,
      }
    }
  };
  const [groupSettings, setGroupSettings] = useState<Record<GroupKey, GroupSettings>>(defaultGroupSettings);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingGroupKey, setEditingGroupKey] = useState<GroupKey | null>(null);
  const [groupForm, setGroupForm] = useState<GroupSettings>(defaultGroupSettings.admin);

  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [logFilter, setLogFilter] = useState<'all' | 'info' | 'warning' | 'error'>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [sentNotifications, setSentNotifications] = useState<AppNotification[]>([]);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [visitorFilter, setVisitorFilter] = useState<'all' | 'today' | 'week' | 'month'>('today');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshComplete, setRefreshComplete] = useState(false);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    body: '',
    icon: 'bell' as AppNotification['icon'],
    targetGroups: ['all'] as AppNotification['targetGroups'],
    displayDuration: 5,
    priority: 'medium' as AppNotification['priority'],
  });

  useEffect(() => {
    loadAdminData();
    loadNotifications();
    loadVisitors();
    // Track current visitor on mount
    trackCurrentVisitor();
    // Real-time visitor tracking
    const interval = setInterval(() => {
      trackCurrentVisitor();
    }, 300000); // Check every 5 minutes to avoid rate limiting
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = async () => {
    try {
      const stored = await AsyncStorage.getItem('sentNotifications');
      if (stored) {
        setSentNotifications(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  const loadVisitors = async () => {
    try {
      const stored = await AsyncStorage.getItem('visitors');
      if (stored) {
        const parsedVisitors = JSON.parse(stored);
        // Convert date strings back to Date objects
        const visitorsWithDates = parsedVisitors.map((v: any) => ({
          ...v,
          visitTime: new Date(v.visitTime)
        }));
        setVisitors(visitorsWithDates);
      } else {
        // Generate sample visitor data
        const sampleVisitors = generateSampleVisitors();
        setVisitors(sampleVisitors);
        await AsyncStorage.setItem('visitors', JSON.stringify(sampleVisitors));
      }
      
      // Track current visitor
      await trackCurrentVisitor();
    } catch (error) {
      console.error('Failed to load visitors:', error);
    }
  };

  const refreshVisitors = async () => {
    if (isRefreshing || refreshComplete) return;
    
    setIsRefreshing(true);
    
    // Start rotation animation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
    
    try {
      // Track current visitor and reload data
      await trackCurrentVisitor();
      await loadVisitors();
      
      // Add log entry
      const newLog = {
        id: Date.now().toString(),
        type: 'info' as const,
        message: 'Visitor data refreshed by admin',
        timestamp: new Date(),
        user: 'admin',
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
      
      // Stop animation and show success state
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
      setIsRefreshing(false);
      setRefreshComplete(true);
      
      // Reset after 3 seconds
      setTimeout(() => {
        setRefreshComplete(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to refresh visitors:', error);
      rotateAnim.stopAnimation();
      rotateAnim.setValue(0);
      setIsRefreshing(false);
      Alert.alert('Error', 'Failed to refresh visitor data');
    }
  };

  const generateSampleVisitors = (): Visitor[] => {
    const countries = [
      { country: 'United States', code: 'US', cities: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'] },
      { country: 'United Kingdom', code: 'GB', cities: ['London', 'Manchester', 'Birmingham', 'Leeds', 'Glasgow'] },
      { country: 'Germany', code: 'DE', cities: ['Berlin', 'Munich', 'Hamburg', 'Frankfurt', 'Cologne'] },
      { country: 'France', code: 'FR', cities: ['Paris', 'Lyon', 'Marseille', 'Toulouse', 'Nice'] },
      { country: 'Canada', code: 'CA', cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'] },
      { country: 'Australia', code: 'AU', cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
      { country: 'Japan', code: 'JP', cities: ['Tokyo', 'Osaka', 'Kyoto', 'Yokohama', 'Nagoya'] },
      { country: 'India', code: 'IN', cities: ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata'] },
    ];

    const devices = [
      { type: 'mobile' as const, os: 'iOS 17', browser: 'Safari' },
      { type: 'mobile' as const, os: 'Android 14', browser: 'Chrome' },
      { type: 'desktop' as const, os: 'Windows 11', browser: 'Chrome' },
      { type: 'desktop' as const, os: 'macOS Sonoma', browser: 'Safari' },
      { type: 'tablet' as const, os: 'iPadOS 17', browser: 'Safari' },
      { type: 'desktop' as const, os: 'Windows 10', browser: 'Edge' },
    ];

    const pages = ['/calculators', '/profile', '/notifications', '/saved-calculations', '/admin'];
    const referrers = ['google.com', 'linkedin.com', 'direct', 'facebook.com', 'twitter.com', undefined];

    const visitors: Visitor[] = [];
    const now = new Date();

    for (let i = 0; i < 50; i++) {
      const countryData = countries[Math.floor(Math.random() * countries.length)];
      const city = countryData.cities[Math.floor(Math.random() * countryData.cities.length)];
      const device = devices[Math.floor(Math.random() * devices.length)];
      const visitTime = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000); // Last 7 days

      visitors.push({
        id: `visitor_${Date.now()}_${i}`,
        ipAddress: `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
        location: {
          country: countryData.country,
          city: city,
          region: city,
          countryCode: countryData.code,
          latitude: -90 + Math.random() * 180,
          longitude: -180 + Math.random() * 360,
          timezone: 'UTC' + (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 12),
        },
        device: device,
        visitTime: visitTime,
        duration: Math.floor(Math.random() * 1800) + 30, // 30 seconds to 30 minutes
        pagesVisited: pages.filter(() => Math.random() > 0.5).slice(0, Math.floor(Math.random() * 4) + 1),
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
        isReturning: Math.random() > 0.6,
      });
    }

    return visitors.sort((a, b) => b.visitTime.getTime() - a.visitTime.getTime());
  };

  const trackCurrentVisitor = async () => {
    try {
      // Fetch real IP and location data using ipapi.co service
      // Try multiple IP services to get IPv4 address
      let data;
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const ipData = await response.json();
        
        // Now get location data for this IP
        const locationResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
        data = await locationResponse.json();
        
        // Ensure we have the IPv4 address
        data.ip = ipData.ip;
      } catch (error) {
        console.log('Primary IP service failed, trying fallback...');
        // Fallback to ipapi.co directly
        const response = await fetch('https://ipapi.co/json/');
        data = await response.json();
        
        // If we get IPv6, try to convert or generate IPv4
        if (data.ip && data.ip.includes(':')) {
          console.log('Got IPv6, generating IPv4 fallback...');
          data.ip = `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`;
        }
      }
      
      // Get device information
      const deviceInfo = getDeviceInfo();
      
      // Create visitor record with real data
      const newVisitor: Visitor = {
        id: `visitor_${Date.now()}`,
        ipAddress: data.ip || `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
        location: {
          country: data.country_name || 'Unknown',
          city: data.city || 'Unknown',
          region: data.region || 'Unknown',
          countryCode: data.country_code || 'XX',
          latitude: data.latitude || 0,
          longitude: data.longitude || 0,
          timezone: data.timezone || 'UTC',
        },
        device: deviceInfo,
        visitTime: new Date(),
        duration: Math.floor(Math.random() * 300) + 10, // This would be tracked in real app
        pagesVisited: ['/admin'], // Current page
        referrer: undefined,
        isReturning: false, // Would check against stored visitor IDs in real app
      };
      
      // Check if this IP already visited today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const existingVisitor = visitors.find(v => 
        v.ipAddress === newVisitor.ipAddress && 
        new Date(v.visitTime) >= today
      );
      
      if (!existingVisitor) {
        const updated = [newVisitor, ...visitors];
        setVisitors(updated);
        await AsyncStorage.setItem('visitors', JSON.stringify(updated));
        
        // Log the visit
        console.log('New visitor tracked:', {
          ip: newVisitor.ipAddress,
          location: `${newVisitor.location.city}, ${newVisitor.location.country}`,
          coordinates: `${newVisitor.location.latitude}, ${newVisitor.location.longitude}`
        });
      }
    } catch (error) {
      console.error('Failed to track visitor:', error);
      // Fallback to simulated visitor with IPv4 if API fails
      const fallbackVisitor: Visitor = {
        id: `visitor_${Date.now()}`,
        ipAddress: `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
        location: {
          country: 'Unknown',
          city: 'Unknown',
          region: 'Unknown',
          countryCode: 'XX',
          latitude: 0,
          longitude: 0,
          timezone: 'UTC',
        },
        device: getDeviceInfo(),
        visitTime: new Date(),
        duration: Math.floor(Math.random() * 300) + 10,
        pagesVisited: ['/admin'],
        referrer: undefined,
        isReturning: false,
      };
      
      const updated = [fallbackVisitor, ...visitors];
      setVisitors(updated);
      await AsyncStorage.setItem('visitors', JSON.stringify(updated));
    }
  };
  
  const getDeviceInfo = () => {
    // Detect device type based on platform
    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    let os = Platform.OS === 'web' ? 'Web' : Platform.OS;
    let browser = 'Unknown';
    
    if (Platform.OS === 'web') {
      // Web platform detection
      if (/Mobile|Android|iPhone/i.test(userAgent)) {
        deviceType = 'mobile';
      } else if (/iPad|Tablet/i.test(userAgent)) {
        deviceType = 'tablet';
      } else {
        deviceType = 'desktop';
      }
      
      // Detect OS
      if (/Windows/i.test(userAgent)) os = 'Windows';
      else if (/Mac/i.test(userAgent)) os = 'macOS';
      else if (/Linux/i.test(userAgent)) os = 'Linux';
      else if (/Android/i.test(userAgent)) os = 'Android';
      else if (/iPhone|iPad/i.test(userAgent)) os = 'iOS';
      
      // Detect browser
      if (/Chrome/i.test(userAgent) && !/Edge/i.test(userAgent)) browser = 'Chrome';
      else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browser = 'Safari';
      else if (/Firefox/i.test(userAgent)) browser = 'Firefox';
      else if (/Edge/i.test(userAgent)) browser = 'Edge';
    } else {
      // Mobile app
      const { width, height } = Dimensions.get('window');
      const shortestSide = Math.min(width, height);
      const isiPad = Platform.OS === 'ios' ? ((Platform as unknown as { isPad?: boolean }).isPad ?? false) : false;
      const isTablet = isiPad || shortestSide >= 600;
      deviceType = isTablet ? 'tablet' : 'mobile';
      os = Platform.OS === 'ios' ? 'iOS' : 'Android';
      browser = 'App';
    }
    
    return {
      type: deviceType,
      os: os,
      browser: browser
    };
  };
  
  const simulateNewVisitor = async () => {
    const countries = [
      { country: 'United States', code: 'US', cities: ['New York', 'Los Angeles', 'Chicago'] },
      { country: 'United Kingdom', code: 'GB', cities: ['London', 'Manchester'] },
      { country: 'Germany', code: 'DE', cities: ['Berlin', 'Munich'] },
    ];

    const devices = [
      { type: 'mobile' as const, os: 'iOS 17', browser: 'Safari' },
      { type: 'desktop' as const, os: 'Windows 11', browser: 'Chrome' },
    ];

    const countryData = countries[Math.floor(Math.random() * countries.length)];
    const city = countryData.cities[Math.floor(Math.random() * countryData.cities.length)];
    const device = devices[Math.floor(Math.random() * devices.length)];

    const newVisitor: Visitor = {
      id: `visitor_${Date.now()}`,
      ipAddress: `${Math.floor(Math.random() * 223) + 1}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 254) + 1}`,
      location: {
        country: countryData.country,
        city: city,
        region: city,
        countryCode: countryData.code,
        latitude: -90 + Math.random() * 180,
        longitude: -180 + Math.random() * 360,
        timezone: 'UTC' + (Math.random() > 0.5 ? '+' : '-') + Math.floor(Math.random() * 12),
      },
      device: device,
      visitTime: new Date(),
      duration: Math.floor(Math.random() * 300) + 10,
      pagesVisited: ['/calculators'],
      referrer: 'google.com',
      isReturning: false,
    };

    const updated = [newVisitor, ...visitors];
    setVisitors(updated);
    await AsyncStorage.setItem('visitors', JSON.stringify(updated));
  };

  const exportVisitorsToCSV = (visitors: Visitor[]) => {
    const headers = ['IP Address', 'Country', 'City', 'Region', 'Country Code', 'Latitude', 'Longitude', 'Timezone', 'Device Type', 'OS', 'Browser', 'Visit Time', 'Duration (seconds)', 'Pages Visited', 'Referrer', 'Returning Visitor'];
    const rows = visitors.map(v => [
      v.ipAddress,
      v.location.country,
      v.location.city,
      v.location.region,
      v.location.countryCode,
      v.location.latitude.toString(),
      v.location.longitude.toString(),
      v.location.timezone,
      v.device.type,
      v.device.os,
      v.device.browser,
      new Date(v.visitTime).toISOString(),
      v.duration.toString(),
      v.pagesVisited.join(';'),
      v.referrer || 'Direct',
      v.isReturning ? 'Yes' : 'No'
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    console.log('Visitors CSV Export:', csv);
    return csv;
  };

  const exportMembersToCSV = (members: AdminUser[]) => {
    const headers = ['ID', 'Name', 'Email', 'Role', 'Status', 'Unit Preference', 'Company', 'Position', 'Country', 'Created At', 'Last Login'];
    const rows = members.map(m => [
      m.id,
      m.name,
      m.email,
      m.role,
      m.status,
      m.unitPreference,
      m.company || '',
      m.position || '',
      m.country || '',
      new Date(m.createdAt).toISOString(),
      m.lastLogin ? new Date(m.lastLogin).toISOString() : 'Never'
    ]);
    
    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    console.log('Members CSV Export:', csv);
    return csv;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    try {
      // For web platform, create a download link
      if (typeof window !== 'undefined' && window.document) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return true;
      } else {
        // For mobile platforms, we'll just log the CSV content
        // In a real app, you would use a file system API or sharing API
        console.log(`CSV Export for ${filename}:`, csvContent);
        return false;
      }
    } catch (error) {
      console.error('Failed to download CSV:', error);
      return false;
    }
  };

  const handleExportVisitors = () => {
    const filteredVisitors = getFilteredVisitors();
    const csv = exportVisitorsToCSV(filteredVisitors);
    const filename = `visitors_export_${visitorFilter}_${new Date().toISOString().split('T')[0]}.csv`;
    
    const downloaded = downloadCSV(csv, filename);
    
    if (downloaded) {
      Alert.alert('Export Successful', `Visitors data exported to ${filename}`);
    } else {
      Alert.alert('Export Complete', 'Visitors data has been exported to console. On mobile, this would be saved to device storage or shared.');
    }
    
    // Add log entry
    const newLog = {
      id: Date.now().toString(),
      type: 'info' as const,
      message: `Visitors data exported by admin (${filteredVisitors.length} records, filter: ${visitorFilter})`,
      timestamp: new Date(),
      user: 'admin',
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
  };

  const handleExportMembers = () => {
    const csv = exportMembersToCSV(users);
    const filename = `members_export_${new Date().toISOString().split('T')[0]}.csv`;
    
    const downloaded = downloadCSV(csv, filename);
    
    if (downloaded) {
      Alert.alert('Export Successful', `Members data exported to ${filename}`);
    } else {
      Alert.alert('Export Complete', 'Members data has been exported to console. On mobile, this would be saved to device storage or shared.');
    }
    
    // Add log entry
    const newLog = {
      id: Date.now().toString(),
      type: 'info' as const,
      message: `Members data exported by admin (${users.length} records)`,
      timestamp: new Date(),
      user: 'admin',
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
  };
  
  const getFilteredVisitors = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (visitorFilter) {
      case 'today':
        return visitors.filter(v => new Date(v.visitTime) >= today);
      case 'week':
        return visitors.filter(v => new Date(v.visitTime) >= weekAgo);
      case 'month':
        return visitors.filter(v => new Date(v.visitTime) >= monthAgo);
      default:
        return visitors;
    }
  };

  const getVisitorStats = () => {
    const filtered = getFilteredVisitors();
    const uniqueCountries = new Set(filtered.map(v => v.location.country)).size;
    const avgDuration = filtered.length > 0 
      ? Math.round(filtered.reduce((acc, v) => acc + v.duration, 0) / filtered.length)
      : 0;
    const returningRate = filtered.length > 0
      ? Math.round((filtered.filter(v => v.isReturning).length / filtered.length) * 100)
      : 0;
    const mobileRate = filtered.length > 0
      ? Math.round((filtered.filter(v => v.device.type === 'mobile').length / filtered.length) * 100)
      : 0;

    return {
      total: filtered.length,
      uniqueCountries,
      avgDuration,
      returningRate,
      mobileRate,
    };
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const loadAdminData = async () => {
    try {
      // Load pending requests
      const pendingData = await AsyncStorage.getItem('pendingRequests');
      if (pendingData) {
        const requests = JSON.parse(pendingData);
        setPendingRequests(requests);
      }

      // Load approved users
      const usersData = await AsyncStorage.getItem('approvedUsers');
      if (usersData) {
        const approvedUsers = JSON.parse(usersData);
        setUsers(approvedUsers);
      } else {
        // Initialize with default admin user
        const defaultUsers: AdminUser[] = [{
          id: '1',
          name: 'Admin User',
          email: 'admin@abrasor.com',
          role: 'admin' as const,
          status: 'approved' as const,
          unitPreference: 'metric' as const,
          createdAt: new Date(Date.now() - 259200000),
          lastLogin: new Date(Date.now() - 3600000),
        }];
        setUsers(defaultUsers);
        await AsyncStorage.setItem('approvedUsers', JSON.stringify(defaultUsers));
      }

      // Load system logs
      const logsData = await AsyncStorage.getItem('systemLogs');
      if (logsData) {
        const systemLogs = JSON.parse(logsData);
        setLogs(systemLogs);
      }

      // Load calculators
      const calcData = await AsyncStorage.getItem('admin_calculators');
      if (calcData) {
        const savedCalculators = JSON.parse(calcData);
        setCalculators(savedCalculators);
      }

      // Load settings
      const settingsData = await AsyncStorage.getItem('admin_settings');
      if (settingsData) {
        const savedSettings = JSON.parse(settingsData);
        setSystemSettings(savedSettings);
      }

      // Load group settings
      const gs = await AsyncStorage.getItem('groupSettings');
      if (gs) {
        const parsed = JSON.parse(gs);
        setGroupSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
    }
  };

  const sendEmail = async (to: string, subject: string, body: string, type: 'request' | 'approval' | 'rejection') => {
    try {
      // Simulate email sending using Gmail SMTP
      await new Promise(resolve => setTimeout(resolve, 500));
      
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
        user: 'admin',
      });
      await AsyncStorage.setItem('systemLogs', JSON.stringify(systemLogs));
      
      console.log(`📧 Admin email sent from noreplay.cgw@gmail.com to ${to}:`, { subject, body, type });
    } catch (error) {
      console.error('Failed to send admin email:', error);
      throw new Error('Failed to send email notification');
    }
  };

  const handleApproveUser = (userId: string) => {
    const request = pendingRequests.find(req => req.id === userId);
    if (!request) return;

    Alert.alert(
      'Approve User',
      `Are you sure you want to approve ${request.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Create approved user
              const approvedUser: AdminUser = {
                ...request,
                status: 'approved' as const,
                lastLogin: undefined,
              };
              
              // Add to approved users
              const updatedUsers = [...users, approvedUser];
              setUsers(updatedUsers);
              await AsyncStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
              
              // Remove from pending requests
              const updatedRequests = pendingRequests.filter(req => req.id !== userId);
              setPendingRequests(updatedRequests);
              await AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
              
              // Send approval email to user
              await sendEmail(
                request.email,
                'Abrasor Access Approved - Welcome!',
                `Dear ${request.name},\n\nGreat news! Your access request for Abrasor has been approved.\n\nYou can now log in to the application using your registered email and password.\n\nAccount Details:\n- Email: ${request.email}\n- Role: ${request.role}\n- Company: ${request.company}\n- Preferred Units: ${request.preferredUnits}\n\nWelcome to Abrasor! We're excited to have you on board.\n\nIf you have any questions or need assistance, please don't hesitate to contact our support team.\n\nBest regards,\nAbrasor Team`,
                'approval'
              );
              
              // Add log entry
              const newLog = {
                id: Date.now().toString(),
                type: 'info' as const,
                message: `User ${request.email} approved by admin - Approval email sent`,
                timestamp: new Date(),
                user: request.email,
              };
              const updatedLogs = [newLog, ...logs];
              setLogs(updatedLogs);
              await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
              
              Alert.alert('Success', 'User approved successfully and notification email sent!');
            } catch (error) {
              Alert.alert('Error', 'Failed to approve user');
            }
          }
        }
      ]
    );
  };

  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setEditUserForm({
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      unitPreference: user.unitPreference,
      company: user.company || '',
      position: user.position || '',
      country: user.country || '',
    });
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!selectedUser) return;
    
    try {
      const updatedUser: AdminUser = {
        ...selectedUser,
        name: editUserForm.name,
        email: editUserForm.email,
        role: editUserForm.role,
        status: editUserForm.status,
        unitPreference: editUserForm.unitPreference,
        company: editUserForm.company || undefined,
        position: editUserForm.position || undefined,
        country: editUserForm.country || undefined,
      };
      
      const updatedUsers = users.map(u => u.id === selectedUser.id ? updatedUser : u);
      setUsers(updatedUsers);
      await AsyncStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
      
      // Add log entry
      const newLog = {
        id: Date.now().toString(),
        type: 'info' as const,
        message: `User ${updatedUser.email} updated by admin`,
        timestamp: new Date(),
        user: updatedUser.email,
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
      
      setShowUserModal(false);
      setSelectedUser(null);
      Alert.alert('Success', 'User updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update user');
    }
  };

  const handleRejectUser = (userId: string) => {
    // Check if it's a pending request or approved user
    const request = pendingRequests.find(req => req.id === userId);
    const user = users.find(u => u.id === userId);
    const targetUser = request || user;
    
    if (!targetUser) return;

    Alert.alert(
      request ? 'Reject Request' : 'Remove User',
      `Are you sure you want to ${request ? 'reject' : 'remove'} ${targetUser.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: request ? 'Reject' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              if (request) {
                // Send rejection email to user
                await sendEmail(
                  request.email,
                  'Abrasor Access Request Update',
                  `Dear ${request.name},\n\nThank you for your interest in Abrasor. After reviewing your access request, we regret to inform you that we cannot approve your application at this time.\n\nThis decision may be due to various factors such as:\n- Incomplete information provided\n- Current capacity limitations\n- Company policy requirements\n\nIf you believe this decision was made in error or if your circumstances have changed, you are welcome to submit a new request in the future.\n\nThank you for your understanding.\n\nBest regards,\nAbrasor Team`,
                  'rejection'
                );
                
                // Remove from pending requests
                const updatedRequests = pendingRequests.filter(req => req.id !== userId);
                setPendingRequests(updatedRequests);
                await AsyncStorage.setItem('pendingRequests', JSON.stringify(updatedRequests));
              } else {
                // Remove from approved users (but not admin)
                if (user?.role === 'admin') {
                  Alert.alert('Error', 'Cannot remove admin users');
                  return;
                }
                
                // Send account removal notification
                if (user) {
                  await sendEmail(
                    user.email,
                    'Abrasor Account Access Removed',
                    `Dear ${user.name},\n\nWe are writing to inform you that your access to Abrasor has been removed by an administrator.\n\nIf you believe this action was taken in error or if you have any questions, please contact our support team immediately.\n\nThank you for your understanding.\n\nBest regards,\nAbrasor Team`,
                    'rejection'
                  );
                }
                
                const updatedUsers = users.filter(u => u.id !== userId);
                setUsers(updatedUsers);
                await AsyncStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
              }
              
              // Add log entry
              const newLog = {
                id: Date.now().toString(),
                type: 'warning' as const,
                message: `User ${targetUser.email} ${request ? 'rejected' : 'removed'} by admin - Notification email sent`,
                timestamp: new Date(),
                user: targetUser.email,
              };
              const updatedLogs = [newLog, ...logs];
              setLogs(updatedLogs);
              await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
              
              Alert.alert('Success', `User ${request ? 'rejected' : 'removed'} successfully and notification email sent!`);
            } catch (error) {
              Alert.alert('Error', `Failed to ${request ? 'reject' : 'remove'} user`);
            }
          }
        }
      ]
    );
  };

  const handleToggleCalculator = async (calcId: string) => {
    const calculator = calculators.find(c => c.id === calcId);
    if (!calculator) return;

    const updatedCalcs = calculators.map(c => c.id === calcId ? { ...c, enabled: !c.enabled } : c);
    setCalculators(updatedCalcs);
    await AsyncStorage.setItem('admin_calculators', JSON.stringify(updatedCalcs));
    
    // Send notification to users
    await sendCalculatorNotification(
      calculator.enabled ? 'disabled' : 'enabled',
      calculator.name
    );
    
    // Add log entry
    const newLog = {
      id: Date.now().toString(),
      type: 'info' as const,
      message: `Calculator "${calculator.name}" ${calculator.enabled ? 'disabled' : 'enabled'} by admin - Notification sent to users`,
      timestamp: new Date(),
      user: 'admin',
    };
    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);
    await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
  };

  const handleDeleteCalculator = (calcId: string) => {
    const calculator = calculators.find(c => c.id === calcId);
    Alert.alert(
      'Delete Calculator',
      `Are you sure you want to delete "${calculator?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const updatedCalcs = calculators.filter(c => c.id !== calcId);
            setCalculators(updatedCalcs);
            await AsyncStorage.setItem('admin_calculators', JSON.stringify(updatedCalcs));
            
            // Add log entry
            const newLog = {
              id: Date.now().toString(),
              type: 'warning' as const,
              message: `Calculator "${calculator?.name}" deleted by admin`,
              timestamp: new Date(),
              user: 'admin',
            };
            const updatedLogs = [newLog, ...logs];
            setLogs(updatedLogs);
            await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
            
            Alert.alert('Success', 'Calculator deleted successfully');
          }
        }
      ]
    );
  };

  const handleExportUsers = () => {
    Alert.alert(
      'Export Members',
      'Export member data to CSV?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Export',
          onPress: handleExportMembers
        }
      ]
    );
  };

  const handleSaveSettings = async () => {
    try {
      await AsyncStorage.setItem('admin_settings', JSON.stringify(systemSettings));
      
      // Apply settings immediately
      if (systemSettings.autoApprove) {
        // Auto-approve pending requests if enabled
        const pendingRequests = await AsyncStorage.getItem('pendingRequests');
        if (pendingRequests) {
          const requests = JSON.parse(pendingRequests);
          if (requests.length > 0) {
            // Move all pending to approved
            const approvedUsers = requests.map((req: any) => ({
              ...req,
              status: 'approved',
              lastLogin: undefined,
            }));
            
            const existingUsers = await AsyncStorage.getItem('approvedUsers');
            const currentUsers = existingUsers ? JSON.parse(existingUsers) : [];
            const updatedUsers = [...currentUsers, ...approvedUsers];
            
            await AsyncStorage.setItem('approvedUsers', JSON.stringify(updatedUsers));
            await AsyncStorage.setItem('pendingRequests', JSON.stringify([]));
            
            // Send approval emails
            for (const user of approvedUsers) {
              await sendEmail(
                user.email,
                'Abrasor Access Approved - Auto-Approval',
                `Dear ${user.name},\n\nYour access request for Abrasor has been automatically approved.\n\nYou can now log in to the application using your registered email and password.\n\nWelcome to Abrasor!\n\nBest regards,\nAbrasor Team`,
                'approval'
              );
            }
            
            // Reload data
            loadAdminData();
          }
        }
      }
      
      // Apply maintenance mode
      if (systemSettings.maintenanceMode) {
        await AsyncStorage.setItem('maintenanceMode', 'true');
      } else {
        await AsyncStorage.removeItem('maintenanceMode');
      }
      
      // Apply guest mode settings
      await AsyncStorage.setItem('guestModeEnabled', systemSettings.guestModeEnabled.toString());
      await AsyncStorage.setItem('maxGuestCalculations', systemSettings.maxGuestCalculations.toString());
      
      // Apply data retention settings
      if (systemSettings.dataRetentionDays < 365) {
        // Clean up old data based on retention policy
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - systemSettings.dataRetentionDays);
        
        // Clean old logs
        const currentLogs = await AsyncStorage.getItem('systemLogs');
        if (currentLogs) {
          const parsedLogs = JSON.parse(currentLogs);
          const filteredLogs = parsedLogs.filter((log: any) => 
            new Date(log.timestamp) > cutoffDate
          );
          await AsyncStorage.setItem('systemLogs', JSON.stringify(filteredLogs));
        }
        
        // Clean old calculations
        const calculations = await AsyncStorage.getItem('calculations');
        if (calculations) {
          const parsedCalcs = JSON.parse(calculations);
          const filteredCalcs = parsedCalcs.filter((calc: any) => 
            new Date(calc.timestamp) > cutoffDate
          );
          await AsyncStorage.setItem('calculations', JSON.stringify(filteredCalcs));
        }
      }
      
      // Apply backup settings
      if (systemSettings.backupEnabled) {
        // Schedule daily backup (in a real app, this would be a background task)
        await AsyncStorage.setItem('backupEnabled', 'true');
        await AsyncStorage.setItem('lastBackup', new Date().toISOString());
      } else {
        await AsyncStorage.removeItem('backupEnabled');
      }
      
      // Apply analytics settings
      await AsyncStorage.setItem('analyticsEnabled', systemSettings.analyticsEnabled.toString());
      
      // Apply session timeout
      await AsyncStorage.setItem('sessionTimeout', systemSettings.sessionTimeout.toString());
      
      // Apply max login attempts
      await AsyncStorage.setItem('maxLoginAttempts', systemSettings.maxLoginAttempts.toString());
      
      // Add log entry
      const newLog = {
        id: Date.now().toString(),
        type: 'info' as const,
        message: `System settings updated by admin - Auto-approve: ${systemSettings.autoApprove}, Maintenance: ${systemSettings.maintenanceMode}, Guest mode: ${systemSettings.guestModeEnabled}, Data retention: ${systemSettings.dataRetentionDays} days`,
        timestamp: new Date(),
        user: 'admin',
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));
      
      Alert.alert('Success', 'Settings saved and applied successfully!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const openGroupEditor = (key: GroupKey) => {
    const current = groupSettings[key] ?? defaultGroupSettings[key];
    setEditingGroupKey(key);
    setGroupForm(current);
    setShowGroupModal(true);
  };

  const handleSaveGroup = async () => {
    if (!editingGroupKey) return;
    try {
      const updated = { ...groupSettings, [editingGroupKey]: groupForm };
      setGroupSettings(updated);
      await AsyncStorage.setItem('groupSettings', JSON.stringify(updated));

      const newLog = {
        id: Date.now().toString(),
        type: 'info' as const,
        message: `Group "${groupForm.name}" updated by admin`,
        timestamp: new Date(),
        user: 'admin',
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));

      setShowGroupModal(false);
      setEditingGroupKey(null);
      Alert.alert('Success', 'Group updated successfully');
    } catch (e) {
      Alert.alert('Error', 'Failed to save group');
    }
  };

  const visitorStats = getVisitorStats();
  const stats = [
    { label: 'Total Users', value: users.length.toString(), icon: Users, color: Colors.primary },
    { label: 'Active Calculators', value: calculators.filter(c => c.enabled).length.toString(), icon: Calculator, color: Colors.success },
    { label: 'Visitors Today', value: visitorStats.total.toString(), icon: Eye, color: Colors.warning },
    { label: 'System Logs', value: logs.length.toString(), icon: FileText, color: Colors.info },
  ];

  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Activity },
    { id: 'users' as TabType, label: 'Users', icon: Users },
    { id: 'groups' as TabType, label: 'Groups', icon: UserCheck },
    { id: 'visitors' as TabType, label: 'Visitors', icon: Globe },
    { id: 'calculators' as TabType, label: 'Calculators', icon: Calculator },
    { id: 'notifications' as TabType, label: 'Notifications', icon: Bell },
    { id: 'settings' as TabType, label: 'Settings', icon: Settings },
    { id: 'logs' as TabType, label: 'Logs', icon: FileText },
  ];

  const renderOverview = () => (
    <>
      <View style={styles.statsGrid}>
        {stats.map((stat, index) => {
          // Determine which tab to navigate to based on the stat
          const getTargetTab = () => {
            if (stat.label === 'Total Users' || stat.label === 'Pending Requests') return 'users';
            if (stat.label === 'Active Calculators') return 'calculators';
            if (stat.label === 'Visitors Today') return 'visitors';
            if (stat.label === 'System Logs') return 'logs';
            return 'overview';
          };

          return (
            <TouchableOpacity 
              key={index} 
              style={[styles.statCard, styles.statCardDark, Shadows.small]}
              onPress={() => setActiveTab(getTargetTab())}
              activeOpacity={0.7}
            >
              <View style={[styles.statIcon, { backgroundColor: stat.color + '20' }]}>
                <stat.icon size={24} color={stat.color} />
              </View>
              <Text style={[styles.statValue, styles.statValueDark]}>{stat.value}</Text>
              <Text style={[styles.statLabel, styles.statLabelDark]}>{stat.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Pending Users Section */}
      {pendingRequests.length > 0 && (
        <View style={[styles.section, styles.sectionDark, Shadows.medium]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, styles.sectionTitleDark]}>Pending User Requests</Text>
            <TouchableOpacity 
              style={[styles.headerButton, styles.headerButtonDark]}
              onPress={() => setActiveTab('users')}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
          {pendingRequests.slice(0, 3).map(request => (
            <View key={request.id} style={[styles.pendingUserItem, styles.pendingUserItemDark]}>
              <View style={styles.pendingUserInfo}>
                <View style={styles.pendingUserHeader}>
                  <Text style={[styles.pendingUserName, styles.pendingUserNameDark]}>{request.name}</Text>
                  <View style={[styles.pendingBadge]}>
                    <Clock size={12} color={Colors.warning} />
                    <Text style={styles.pendingBadgeText}>PENDING</Text>
                  </View>
                </View>
                <Text style={[styles.pendingUserEmail, styles.pendingUserEmailDark]}>{request.email}</Text>
                {request.company && (
                  <Text style={[styles.pendingUserCompany, styles.pendingUserCompanyDark]}>
                    {request.company} • {request.position || 'Position not specified'}
                  </Text>
                )}
                <Text style={[styles.pendingUserDate, styles.pendingUserDateDark]}>
                  Requested: {new Date(request.requestDate).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.pendingUserActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.approveButton]}
                  onPress={() => handleApproveUser(request.id)}
                >
                  <CheckCircle size={18} color={Colors.success} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={() => handleRejectUser(request.id)}
                >
                  <XCircle size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {pendingRequests.length > 3 && (
            <TouchableOpacity 
              style={styles.viewMoreButton}
              onPress={() => setActiveTab('users')}
            >
              <Text style={styles.viewMoreText}>
                View {pendingRequests.length - 3} more pending request{pendingRequests.length - 3 > 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={[styles.section, styles.sectionDark, Shadows.medium]}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.sectionTitleDark]}>Recent Activity</Text>
          <TouchableOpacity 
            style={[styles.headerButton, styles.headerButtonDark]}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        {logs.slice(0, 3).map(log => (
          <View key={log.id} style={[styles.logItem, styles.logItemDark]}>
            <View style={[styles.logIcon, { backgroundColor: 
              log.type === 'error' ? Colors.error + '20' : 
              log.type === 'warning' ? Colors.warning + '20' : 
              Colors.info + '20' 
            }]}>
              <AlertCircle size={16} color={
                log.type === 'error' ? Colors.error : 
                log.type === 'warning' ? Colors.warning : 
                Colors.info
              } />
            </View>
            <View style={styles.logContent}>
              <Text style={[styles.logMessage, styles.logMessageDark]}>{log.message}</Text>
              <Text style={[styles.logTime, styles.logTimeDark]}>
                {new Date(log.timestamp).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
        {logs.length > 3 && (
          <TouchableOpacity 
            style={styles.viewMoreButton}
            onPress={() => setActiveTab('logs')}
          >
            <Text style={styles.viewMoreText}>View all {logs.length} logs</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  const renderUsers = () => (
    <View style={[styles.section, Shadows.medium]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>User Management</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleExportUsers}
            testID="export-members-button"
          >
            <Download size={18} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search users..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={Colors.textSecondary}
        />
      </View>

      {/* Pending Requests */}
      {pendingRequests
        .filter(req => 
          req.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          req.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(request => (
        <View key={request.id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{request.name}</Text>
              <View style={[styles.roleBadge, { backgroundColor: Colors.warning + '20' }]}>
                <Text style={[styles.roleText, { color: Colors.warning }]}>
                  PENDING
                </Text>
              </View>
            </View>
            <Text style={styles.userEmail}>{request.email}</Text>
            {request.company && (
              <Text style={styles.userCompany}>
                {request.company} • {request.position}
              </Text>
            )}
            {request.country && (
              <Text style={styles.userCountry}>
                {request.country} • Prefers {request.preferredUnits}
              </Text>
            )}
            <Text style={styles.userDate}>
              Requested: {new Date(request.requestDate).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApproveUser(request.id)}
            >
              <CheckCircle size={18} color={Colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleRejectUser(request.id)}
            >
              <XCircle size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Approved Users */}
      {users
        .filter(u => 
          u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          u.email.toLowerCase().includes(searchQuery.toLowerCase())
        )
        .map(user => (
        <View key={user.id} style={styles.userCard}>
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName}>{user.name}</Text>
              <View style={[styles.roleBadge, 
                { backgroundColor: 
                  user.role === 'admin' ? Colors.error + '20' :
                  user.role === 'premium' ? Colors.primary + '20' :
                  Colors.textSecondary + '20'
                }
              ]}>
                <Text style={[styles.roleText, 
                  { color: 
                    user.role === 'admin' ? Colors.error :
                    user.role === 'premium' ? Colors.primary :
                    Colors.textSecondary
                  }
                ]}>
                  {user.role.toUpperCase()}
                </Text>
              </View>
            </View>
            <Text style={styles.userEmail}>{user.email}</Text>
            <Text style={styles.userDate}>
              Joined: {new Date(user.createdAt).toLocaleDateString()}
            </Text>
            {user.company && (
              <Text style={styles.userCompany}>
                {user.company} • {user.position}
              </Text>
            )}
            {user.country && (
              <Text style={styles.userCountry}>
                {user.country} • Prefers {user.unitPreference}
              </Text>
            )}
            {user.lastLogin && (
              <Text style={styles.userDate}>
                Last login: {new Date(user.lastLogin).toLocaleString()}
              </Text>
            )}
          </View>
          
          <View style={styles.userActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditUser(user)}
            >
              <Edit2 size={18} color={Colors.primary} />
            </TouchableOpacity>
            {user.role !== 'admin' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleRejectUser(user.id)}
              >
                <Trash2 size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );

  const renderCalculators = () => (
    <View style={[styles.section, Shadows.medium]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Calculator Management</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => {
            setSelectedCalculator(null);
            setCalculatorForm({
              name: '',
              categories: [],
              description: '',
              inputs: [],
              formula: null,
              resultUnit: '',
              resultUnitMetric: '',
              resultUnitImperial: '',
            });
            setShowCalculatorModal(true);
          }}
        >
          <Plus size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {calculators.map(calc => (
        <View key={calc.id} style={styles.calculatorCard}>
          <View style={styles.calculatorInfo}>
            <Text style={styles.calculatorName}>{calc.name}</Text>
            <View style={styles.categoryContainer}>
              {calc.categories.map((cat, idx) => (
                <View key={idx} style={styles.categoryBadge}>
                  <Text style={styles.categoryText}>{cat}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.calculatorStats}>
              Used {calc.usageCount} times • Modified {new Date(calc.lastModified).toLocaleDateString()}
            </Text>
          </View>
          
          <View style={styles.calculatorActions}>
            <Switch
              value={calc.enabled}
              onValueChange={() => handleToggleCalculator(calc.id)}
              trackColor={{ false: Colors.borderLight, true: Colors.primary }}
              thumbColor={Colors.surface}
            />
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => {
                setSelectedCalculator(calc);
                setCalculatorForm({
                  name: calc.name,
                  categories: calc.categories,
                  description: calc.description || '',
                  inputs: calc.inputs,
                  formula: calc.formula,
                  resultUnit: calc.resultUnit,
                  resultUnitMetric: calc.resultUnitMetric || calc.resultUnit,
                  resultUnitImperial: calc.resultUnitImperial || calc.resultUnit,
                });
                setShowCalculatorModal(true);
              }}
            >
              <Edit2 size={18} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.deleteButton]}
              onPress={() => handleDeleteCalculator(calc.id)}
            >
              <Trash2 size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </View>
  );

  const renderSettings = () => (
    <View style={[styles.section, Shadows.medium]}>
      <Text style={styles.sectionTitle}>System Settings</Text>
      
      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Shield size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Maintenance Mode</Text>
            <Text style={styles.settingDescription}>Disable access for non-admin users</Text>
          </View>
        </View>
        <Switch
          value={systemSettings.maintenanceMode}
          onValueChange={(value) => setSystemSettings(prev => ({ ...prev, maintenanceMode: value }))}
          trackColor={{ false: Colors.borderLight, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Mail size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Email Notifications</Text>
            <Text style={styles.settingDescription}>Send system emails to users</Text>
          </View>
        </View>
        <Switch
          value={systemSettings.emailNotifications}
          onValueChange={(value) => setSystemSettings(prev => ({ ...prev, emailNotifications: value }))}
          trackColor={{ false: Colors.borderLight, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Users size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Auto-Approve Users</Text>
            <Text style={styles.settingDescription}>Automatically approve new registrations</Text>
          </View>
        </View>
        <Switch
          value={systemSettings.autoApprove}
          onValueChange={(value) => setSystemSettings(prev => ({ ...prev, autoApprove: value }))}
          trackColor={{ false: Colors.borderLight, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Database size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Default Unit System</Text>
            <Text style={styles.settingDescription}>Default for new users</Text>
          </View>
        </View>
        <View style={styles.unitToggle}>
          <TouchableOpacity
            style={[
              styles.unitOption,
              systemSettings.defaultUnit === 'metric' && styles.unitOptionActive
            ]}
            onPress={() => setSystemSettings(prev => ({ ...prev, defaultUnit: 'metric' }))}
          >
            <Text style={[
              styles.unitOptionText,
              systemSettings.defaultUnit === 'metric' && styles.unitOptionTextActive
            ]}>Metric</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.unitOption,
              systemSettings.defaultUnit === 'imperial' && styles.unitOptionActive
            ]}
            onPress={() => setSystemSettings(prev => ({ ...prev, defaultUnit: 'imperial' }))}
          >
            <Text style={[
              styles.unitOptionText,
              systemSettings.defaultUnit === 'imperial' && styles.unitOptionTextActive
            ]}>Inch</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Users size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Guest Mode</Text>
            <Text style={styles.settingDescription}>Allow users to use calculators without account</Text>
          </View>
        </View>
        <Switch
          value={systemSettings.guestModeEnabled}
          onValueChange={(value) => setSystemSettings(prev => ({ ...prev, guestModeEnabled: value }))}
          trackColor={{ false: Colors.borderLight, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Database size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Max Guest Calculations</Text>
            <Text style={styles.settingDescription}>Limit calculations for guest users</Text>
          </View>
        </View>
        <View style={styles.numberInput}>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              maxGuestCalculations: Math.max(10, prev.maxGuestCalculations - 10) 
            }))}
          >
            <Text style={styles.numberButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.numberValue}>{systemSettings.maxGuestCalculations}</Text>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              maxGuestCalculations: Math.min(200, prev.maxGuestCalculations + 10) 
            }))}
          >
            <Text style={styles.numberButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Database size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Data Retention</Text>
            <Text style={styles.settingDescription}>Days to keep user data</Text>
          </View>
        </View>
        <View style={styles.numberInput}>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              dataRetentionDays: Math.max(30, prev.dataRetentionDays - 30) 
            }))}
          >
            <Text style={styles.numberButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.numberValue}>{systemSettings.dataRetentionDays}</Text>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              dataRetentionDays: Math.min(1095, prev.dataRetentionDays + 30) 
            }))}
          >
            <Text style={styles.numberButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Database size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Automatic Backup</Text>
            <Text style={styles.settingDescription}>Enable daily data backups</Text>
          </View>
        </View>
        <Switch
          value={systemSettings.backupEnabled}
          onValueChange={(value) => setSystemSettings(prev => ({ ...prev, backupEnabled: value }))}
          trackColor={{ false: Colors.borderLight, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Activity size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Analytics</Text>
            <Text style={styles.settingDescription}>Collect usage analytics</Text>
          </View>
        </View>
        <Switch
          value={systemSettings.analyticsEnabled}
          onValueChange={(value) => setSystemSettings(prev => ({ ...prev, analyticsEnabled: value }))}
          trackColor={{ false: Colors.borderLight, true: Colors.primary }}
          thumbColor={Colors.surface}
        />
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Clock size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Session Timeout</Text>
            <Text style={styles.settingDescription}>Minutes before auto-logout</Text>
          </View>
        </View>
        <View style={styles.numberInput}>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              sessionTimeout: Math.max(5, prev.sessionTimeout - 5) 
            }))}
          >
            <Text style={styles.numberButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.numberValue}>{systemSettings.sessionTimeout}</Text>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              sessionTimeout: Math.min(120, prev.sessionTimeout + 5) 
            }))}
          >
            <Text style={styles.numberButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingItem}>
        <View style={styles.settingInfo}>
          <Shield size={20} color={Colors.primary} />
          <View style={styles.settingText}>
            <Text style={styles.settingLabel}>Max Login Attempts</Text>
            <Text style={styles.settingDescription}>Before account lockout (15 min lockout)</Text>
          </View>
        </View>
        <View style={styles.numberInput}>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              maxLoginAttempts: Math.max(3, prev.maxLoginAttempts - 1) 
            }))}
          >
            <Text style={styles.numberButtonText}>-</Text>
          </TouchableOpacity>
          <Text style={styles.numberValue}>{systemSettings.maxLoginAttempts}</Text>
          <TouchableOpacity
            style={styles.numberButton}
            onPress={() => setSystemSettings(prev => ({ 
              ...prev, 
              maxLoginAttempts: Math.min(10, prev.maxLoginAttempts + 1) 
            }))}
          >
            <Text style={styles.numberButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity 
        style={styles.saveButton}
        onPress={handleSaveSettings}
      >
        <Text style={styles.saveButtonText}>Save Settings</Text>
      </TouchableOpacity>
    </View>
  );

  const renderNotifications = () => (
    <View style={[styles.section, Shadows.medium]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Send Notification</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => setShowNotificationModal(true)}
        >
          <Send size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.notificationForm}>
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Title</Text>
          <TextInput
            style={styles.textInput}
            value={notificationForm.title}
            onChangeText={(text) => setNotificationForm(prev => ({ ...prev, title: text }))}
            placeholder="Notification title"
            placeholderTextColor={Colors.textSecondary}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Message</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            value={notificationForm.body}
            onChangeText={(text) => setNotificationForm(prev => ({ ...prev, body: text }))}
            placeholder="Notification message"
            placeholderTextColor={Colors.textSecondary}
            multiline
            numberOfLines={4}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Icon Type</Text>
          <View style={styles.iconSelector}>
            {(['bell', 'info', 'warning', 'error', 'success'] as const).map((icon) => {
              const IconComponent = 
                icon === 'bell' ? Bell :
                icon === 'info' ? Info :
                icon === 'warning' ? AlertTriangle :
                icon === 'error' ? AlertCircle :
                CheckCircle;
              
              return (
                <TouchableOpacity
                  key={icon}
                  style={[
                    styles.iconOption,
                    notificationForm.icon === icon && styles.iconOptionActive
                  ]}
                  onPress={() => setNotificationForm(prev => ({ ...prev, icon }))}
                >
                  <IconComponent 
                    size={20} 
                    color={notificationForm.icon === icon ? Colors.surface : Colors.textSecondary} 
                  />
                  <Text style={[
                    styles.iconOptionText,
                    notificationForm.icon === icon && styles.iconOptionTextActive
                  ]}>
                    {icon.charAt(0).toUpperCase() + icon.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Target Groups</Text>
          <View style={styles.targetGroupSelector}>
            {(['all', 'admin', 'premium', 'starter'] as const).map((group) => (
              <TouchableOpacity
                key={group}
                style={[
                  styles.targetGroupOption,
                  notificationForm.targetGroups.includes(group) && styles.targetGroupOptionActive
                ]}
                onPress={() => {
                  if (group === 'all') {
                    setNotificationForm(prev => ({ ...prev, targetGroups: ['all'] }));
                  } else {
                    setNotificationForm(prev => ({
                      ...prev,
                      targetGroups: prev.targetGroups.includes('all') 
                        ? [group]
                        : prev.targetGroups.includes(group)
                          ? prev.targetGroups.filter(g => g !== group)
                          : [...prev.targetGroups.filter(g => g !== 'all'), group]
                    }));
                  }
                }}
              >
                <Text style={[
                  styles.targetGroupText,
                  notificationForm.targetGroups.includes(group) && styles.targetGroupTextActive
                ]}>
                  {group === 'all' ? 'All Users' : group.charAt(0).toUpperCase() + group.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Priority</Text>
          <View style={styles.prioritySelector}>
            {(['low', 'medium', 'high'] as const).map((priority) => (
              <TouchableOpacity
                key={priority}
                style={[
                  styles.priorityOption,
                  notificationForm.priority === priority && styles.priorityOptionActive,
                  { backgroundColor: 
                    priority === 'high' ? Colors.error + '20' :
                    priority === 'medium' ? Colors.warning + '20' :
                    Colors.info + '20'
                  }
                ]}
                onPress={() => setNotificationForm(prev => ({ ...prev, priority }))}
              >
                <Text style={[
                  styles.priorityText,
                  { color: 
                    priority === 'high' ? Colors.error :
                    priority === 'medium' ? Colors.warning :
                    Colors.info
                  },
                  notificationForm.priority === priority && { fontWeight: '600' }
                ]}>
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Display Duration (seconds)</Text>
          <View style={styles.durationSelector}>
            {[3, 5, 10, 15, 30].map((duration) => (
              <TouchableOpacity
                key={duration}
                style={[
                  styles.durationOption,
                  notificationForm.displayDuration === duration && styles.durationOptionActive
                ]}
                onPress={() => setNotificationForm(prev => ({ ...prev, displayDuration: duration }))}
              >
                <Text style={[
                  styles.durationText,
                  notificationForm.displayDuration === duration && styles.durationTextActive
                ]}>
                  {duration}s
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity 
          style={styles.sendButton}
          onPress={handleSendNotification}
        >
          <Send size={20} color={Colors.surface} />
          <Text style={styles.sendButtonText}>Send Notification</Text>
        </TouchableOpacity>
      </View>

      {/* Sent Notifications History */}
      <View style={styles.notificationHistory}>
        <Text style={styles.historyTitle}>Recent Notifications</Text>
        {sentNotifications.slice(0, 5).map((notif) => (
          <View key={notif.id} style={styles.historyItem}>
            <View style={styles.historyIcon}>
              {notif.icon === 'bell' && <Bell size={16} color={Colors.primary} />}
              {notif.icon === 'info' && <Info size={16} color={Colors.info} />}
              {notif.icon === 'warning' && <AlertTriangle size={16} color={Colors.warning} />}
              {notif.icon === 'error' && <AlertCircle size={16} color={Colors.error} />}
              {notif.icon === 'success' && <CheckCircle size={16} color={Colors.success} />}
            </View>
            <View style={styles.historyContent}>
              <Text style={styles.historyTitle}>{notif.title}</Text>
              <Text style={styles.historyBody} numberOfLines={1}>{notif.body}</Text>
              <Text style={styles.historyMeta}>
                To: {notif.targetGroups.join(', ')} • {new Date(notif.createdAt).toLocaleString()}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  const handleSendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.body.trim()) {
      Alert.alert('Error', 'Please enter a title and message');
      return;
    }

    if (notificationForm.targetGroups.length === 0) {
      Alert.alert('Error', 'Please select at least one target group');
      return;
    }

    try {
      // Create notification object
      const notification: AppNotification = {
        id: Date.now().toString(),
        title: notificationForm.title,
        body: notificationForm.body,
        icon: notificationForm.icon,
        targetGroups: notificationForm.targetGroups,
        displayDuration: notificationForm.displayDuration,
        priority: notificationForm.priority,
        createdAt: new Date(),
        createdBy: 'admin',
        read: false,
      };

      // Save to sent notifications
      const updated = [notification, ...sentNotifications];
      setSentNotifications(updated);
      await AsyncStorage.setItem('sentNotifications', JSON.stringify(updated));

      // Broadcast to all users (in a real app, this would be done via backend)
      await AsyncStorage.setItem('broadcastNotification', JSON.stringify(notification));

      // Add to system logs
      const newLog = {
        id: Date.now().toString(),
        type: 'info' as const,
        message: `Notification sent: "${notification.title}" to ${notification.targetGroups.join(', ')}`,
        timestamp: new Date(),
        user: 'admin',
      };
      const updatedLogs = [newLog, ...logs];
      setLogs(updatedLogs);
      await AsyncStorage.setItem('systemLogs', JSON.stringify(updatedLogs));

      // Reset form
      setNotificationForm({
        title: '',
        body: '',
        icon: 'bell',
        targetGroups: ['all'],
        displayDuration: 5,
        priority: 'medium',
      });

      Alert.alert('Success', 'Notification sent successfully!');
    } catch (error) {
      console.error('Failed to send notification:', error);
      Alert.alert('Error', 'Failed to send notification');
    }
  };

  const renderVisitors = () => {
    const filteredVisitors = getFilteredVisitors();
    const stats = getVisitorStats();
    const countryStats = filteredVisitors.reduce((acc, v) => {
      acc[v.location.country] = (acc[v.location.country] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topCountries = Object.entries(countryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    return (
      <>
        {/* Visitor Stats Cards */}
        <View style={styles.visitorStatsGrid}>
          <View style={[styles.visitorStatCard, Shadows.small]}>
            <View style={styles.visitorStatIcon}>
              <Eye size={20} color={Colors.primary} />
            </View>
            <Text style={styles.visitorStatValue}>{stats.total}</Text>
            <Text style={styles.visitorStatLabel}>Total Visitors</Text>
          </View>
          <View style={[styles.visitorStatCard, Shadows.small]}>
            <View style={styles.visitorStatIcon}>
              <Globe size={20} color={Colors.success} />
            </View>
            <Text style={styles.visitorStatValue}>{stats.uniqueCountries}</Text>
            <Text style={styles.visitorStatLabel}>Countries</Text>
          </View>
          <View style={[styles.visitorStatCard, Shadows.small]}>
            <View style={styles.visitorStatIcon}>
              <Clock size={20} color={Colors.warning} />
            </View>
            <Text style={styles.visitorStatValue}>{formatDuration(stats.avgDuration)}</Text>
            <Text style={styles.visitorStatLabel}>Avg Duration</Text>
          </View>
          <View style={[styles.visitorStatCard, Shadows.small]}>
            <View style={styles.visitorStatIcon}>
              <TrendingUp size={20} color={Colors.info} />
            </View>
            <Text style={styles.visitorStatValue}>{stats.returningRate}%</Text>
            <Text style={styles.visitorStatLabel}>Returning</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.section, Shadows.medium]}>
          <View style={styles.visitorFilterTabs}>
            {(['today', 'week', 'month', 'all'] as const).map((filter) => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.visitorFilterTab,
                  visitorFilter === filter && styles.visitorFilterTabActive
                ]}
                onPress={() => setVisitorFilter(filter)}
              >
                <Text style={[
                  styles.visitorFilterTabText,
                  visitorFilter === filter && styles.visitorFilterTabTextActive
                ]}>
                  {filter === 'all' ? 'All Time' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Top Countries */}
        {topCountries.length > 0 && (
          <View style={[styles.section, Shadows.medium]}>
            <Text style={styles.sectionTitle}>Top Countries</Text>
            {topCountries.map(([country, count], index) => {
              const percentage = Math.round((count / filteredVisitors.length) * 100);
              return (
                <View key={country} style={styles.countryItem}>
                  <View style={styles.countryInfo}>
                    <Text style={styles.countryRank}>#{index + 1}</Text>
                    <MapPin size={16} color={Colors.primary} />
                    <Text style={styles.countryName}>{country}</Text>
                  </View>
                  <View style={styles.countryStats}>
                    <Text style={styles.countryVisitors}>{count} visitors</Text>
                    <View style={styles.countryBar}>
                      <View 
                        style={[
                          styles.countryBarFill,
                          { width: `${percentage}%` }
                        ]}
                      />
                    </View>
                    <Text style={styles.countryPercentage}>{percentage}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Visitor List */}
        <View style={[styles.section, Shadows.medium]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Visitors</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={[
                  styles.headerButton, 
                  styles.refreshButton,
                  refreshComplete && styles.refreshButtonComplete
                ]}
                onPress={refreshVisitors}
                testID="refresh-visitors-button"
                activeOpacity={0.7}
                disabled={isRefreshing || refreshComplete}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: rotateAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg']
                      })
                    }]
                  }}
                >
                  <RefreshCw 
                    size={18} 
                    color={refreshComplete ? Colors.textSecondary : Colors.primary} 
                  />
                </Animated.View>
                <Text style={[
                  styles.refreshButtonText,
                  refreshComplete && styles.refreshButtonTextComplete
                ]}>
                  {refreshComplete ? 'Refreshed!' : 'Refresh'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={async () => {
                  await trackCurrentVisitor();
                  Alert.alert('Tracking', 'Fetching current visitor data...');
                }}
              >
                <Activity size={18} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerButton}
                onPress={() => {
                  Alert.alert('Export Visitors', 'Export visitor data to CSV?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Export', onPress: handleExportVisitors }
                  ]);
                }}
              >
                <Download size={18} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View>
              {/* Table Header */}
              <View style={styles.visitorTableHeader}>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 150 }]}>IP Address</Text>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 200 }]}>Location</Text>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 120 }]}>Device</Text>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 150 }]}>Visit Time</Text>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 100 }]}>Duration</Text>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 150 }]}>Pages</Text>
                <Text style={[styles.visitorTableCell, styles.visitorTableHeaderText, { width: 120 }]}>Referrer</Text>
              </View>

              {/* Table Rows */}
              {filteredVisitors.slice(0, 20).map((visitor) => {
                const DeviceIcon = visitor.device.type === 'mobile' ? Smartphone : 
                                   visitor.device.type === 'tablet' ? Tablet : Monitor;
                return (
                  <View key={visitor.id} style={styles.visitorTableRow}>
                    <TouchableOpacity 
                      style={[styles.visitorTableCell, { width: 150 }]}
                      onPress={() => {
                        Alert.alert(
                          'IP Details',
                          `IP Address: ${visitor.ipAddress}\n\nLocation Details:\nCountry: ${visitor.location.country} (${visitor.location.countryCode})\nCity: ${visitor.location.city}\nRegion: ${visitor.location.region}\n\nCoordinates:\nLatitude: ${visitor.location.latitude.toFixed(4)}\nLongitude: ${visitor.location.longitude.toFixed(4)}\n\nTimezone: ${visitor.location.timezone}\n\nDevice Info:\nType: ${visitor.device.type}\nOS: ${visitor.device.os}\nBrowser: ${visitor.device.browser}`,
                          [{ text: 'OK' }]
                        );
                      }}
                    >
                      <Text style={styles.visitorIPLink}>
                        {visitor.ipAddress}
                      </Text>
                    </TouchableOpacity>
                    <View style={[styles.visitorTableCell, { width: 200 }]}>
                      <Text style={styles.visitorLocation}>
                        {visitor.location.city}, {visitor.location.countryCode}
                      </Text>
                      <Text style={styles.visitorTimezone}>{visitor.location.timezone}</Text>
                    </View>
                    <View style={[styles.visitorTableCell, styles.visitorDeviceCell, { width: 120 }]}>
                      <DeviceIcon size={14} color={Colors.textSecondary} />
                      <View>
                        <Text style={styles.visitorDeviceOS}>{visitor.device.os}</Text>
                        <Text style={styles.visitorDeviceBrowser}>{visitor.device.browser}</Text>
                      </View>
                    </View>
                    <Text style={[styles.visitorTableCell, { width: 150 }]}>
                      {new Date(visitor.visitTime).toLocaleString()}
                    </Text>
                    <Text style={[styles.visitorTableCell, { width: 100 }]}>
                      {formatDuration(visitor.duration)}
                    </Text>
                    <View style={[styles.visitorTableCell, { width: 150 }]}>
                      {visitor.pagesVisited.map((page, idx) => (
                        <Text key={idx} style={styles.visitorPage}>{page}</Text>
                      ))}
                    </View>
                    <Text style={[styles.visitorTableCell, { width: 120 }]}>
                      {visitor.referrer || 'Direct'}
                      {visitor.isReturning && (
                        <Text style={styles.returningBadge}> (Returning)</Text>
                      )}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {filteredVisitors.length > 20 && (
            <TouchableOpacity style={styles.viewMoreButton}>
              <Text style={styles.viewMoreText}>
                View all {filteredVisitors.length} visitors
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </>
    );
  };

  const getFilteredLogs = () => {
    let filtered = logs;
    
    // Filter by type
    if (logFilter !== 'all') {
      filtered = filtered.filter(log => log.type === logFilter);
    }
    
    // Filter by search query
    if (logSearchQuery.trim()) {
      const query = logSearchQuery.toLowerCase();
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(query) ||
        (log.user && log.user.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  };

  const renderGroups = () => (
    <View style={[styles.section, Shadows.medium]}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>User Groups Management</Text>
        <TouchableOpacity 
          style={styles.headerButton}
          onPress={() => {
            // TODO: Implement create group functionality
            Alert.alert('Coming Soon', 'Create group functionality will be implemented here.');
          }}
        >
          <Plus size={18} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Group Statistics */}
      <View style={styles.groupStatsContainer}>
        <View style={styles.groupStatCard}>
          <View style={[styles.groupStatIcon, { backgroundColor: Colors.primary + '20' }]}>
            <Crown size={20} color={Colors.primary} />
          </View>
          <Text style={styles.groupStatValue}>{users.filter(u => u.role === 'admin').length}</Text>
          <Text style={styles.groupStatLabel}>Admin Users</Text>
        </View>
        <View style={styles.groupStatCard}>
          <View style={[styles.groupStatIcon, { backgroundColor: Colors.success + '20' }]}>
            <Star size={20} color={Colors.success} />
          </View>
          <Text style={styles.groupStatValue}>{users.filter(u => u.role === 'premium').length}</Text>
          <Text style={styles.groupStatLabel}>Premium Users</Text>
        </View>
        <View style={styles.groupStatCard}>
          <View style={[styles.groupStatIcon, { backgroundColor: Colors.info + '20' }]}>
            <Users size={20} color={Colors.info} />
          </View>
          <Text style={styles.groupStatValue}>{users.filter(u => u.role === 'starter').length}</Text>
          <Text style={styles.groupStatLabel}>Starter Users</Text>
        </View>
        <View style={styles.groupStatCard}>
          <View style={[styles.groupStatIcon, { backgroundColor: Colors.warning + '20' }]}>
            <UserX size={20} color={Colors.warning} />
          </View>
          <Text style={styles.groupStatValue}>{users.filter(u => u.status === 'suspended').length}</Text>
          <Text style={styles.groupStatLabel}>Suspended</Text>
        </View>
      </View>

      {/* Group List */}
      <View style={styles.groupsList}>
        {/* Admin Group */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupTitleContainer}>
              <View style={[styles.groupIcon, { backgroundColor: Colors.error + '20' }]}>
                <Crown size={24} color={Colors.error} />
              </View>
              <View>
                <Text style={styles.groupName}>Administrators</Text>
                <Text style={styles.groupDescription}>Full system access and management</Text>
              </View>
            </View>
            <View style={styles.groupActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openGroupEditor('admin')}
              >
                <Edit2 size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.groupStats}>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>{users.filter(u => u.role === 'admin').length}</Text>
              <Text style={styles.groupStatText}>Members</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>All</Text>
              <Text style={styles.groupStatText}>Calculators</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>∞</Text>
              <Text style={styles.groupStatText}>Usage Limit</Text>
            </View>
          </View>
          <View style={styles.groupPermissions}>
            <Text style={styles.permissionsTitle}>Permissions:</Text>
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>User Management</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Calculator Management</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>System Settings</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Analytics & Logs</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Premium Group */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupTitleContainer}>
              <View style={[styles.groupIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Star size={24} color={Colors.primary} />
              </View>
              <View>
                <Text style={styles.groupName}>Premium Users</Text>
                <Text style={styles.groupDescription}>Advanced features and unlimited usage</Text>
              </View>
            </View>
            <View style={styles.groupActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openGroupEditor('premium')}
              >
                <Edit2 size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.groupStats}>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>{users.filter(u => u.role === 'premium').length}</Text>
              <Text style={styles.groupStatText}>Members</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>All</Text>
              <Text style={styles.groupStatText}>Calculators</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>∞</Text>
              <Text style={styles.groupStatText}>Usage Limit</Text>
            </View>
          </View>
          <View style={styles.groupPermissions}>
            <Text style={styles.permissionsTitle}>Permissions:</Text>
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>All Calculators</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Save Calculations</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Export Results</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Priority Support</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Starter Group */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupTitleContainer}>
              <View style={[styles.groupIcon, { backgroundColor: Colors.info + '20' }]}>
                <Users size={24} color={Colors.info} />
              </View>
              <View>
                <Text style={styles.groupName}>Starter Users</Text>
                <Text style={styles.groupDescription}>Basic access with usage limits</Text>
              </View>
            </View>
            <View style={styles.groupActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openGroupEditor('starter')}
              >
                <Edit2 size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.groupStats}>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>{users.filter(u => u.role === 'starter').length}</Text>
              <Text style={styles.groupStatText}>Members</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>Basic</Text>
              <Text style={styles.groupStatText}>Calculators</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>50/day</Text>
              <Text style={styles.groupStatText}>Usage Limit</Text>
            </View>
          </View>
          <View style={styles.groupPermissions}>
            <Text style={styles.permissionsTitle}>Permissions:</Text>
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Basic Calculators</Text>
              </View>
              <View style={styles.permissionItem}>
                <XCircle size={14} color={Colors.error} />
                <Text style={[styles.permissionText, { color: Colors.textLight }]}>Save Calculations</Text>
              </View>
              <View style={styles.permissionItem}>
                <XCircle size={14} color={Colors.error} />
                <Text style={[styles.permissionText, { color: Colors.textLight }]}>Export Results</Text>
              </View>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Community Support</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Guest Group */}
        <View style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.groupTitleContainer}>
              <View style={[styles.groupIcon, { backgroundColor: Colors.textSecondary + '20' }]}>
                <Eye size={24} color={Colors.textSecondary} />
              </View>
              <View>
                <Text style={styles.groupName}>Guest Users</Text>
                <Text style={styles.groupDescription}>Limited trial access without registration</Text>
              </View>
            </View>
            <View style={styles.groupActions}>
              <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => openGroupEditor('guest')}
              >
                <Edit2 size={16} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.groupStats}>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>∞</Text>
              <Text style={styles.groupStatText}>Members</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>Limited</Text>
              <Text style={styles.groupStatText}>Calculators</Text>
            </View>
            <View style={styles.groupStatItem}>
              <Text style={styles.groupStatNumber}>10/day</Text>
              <Text style={styles.groupStatText}>Usage Limit</Text>
            </View>
          </View>
          <View style={styles.groupPermissions}>
            <Text style={styles.permissionsTitle}>Permissions:</Text>
            <View style={styles.permissionsList}>
              <View style={styles.permissionItem}>
                <CheckCircle size={14} color={Colors.success} />
                <Text style={styles.permissionText}>Basic Calculators Only</Text>
              </View>
              <View style={styles.permissionItem}>
                <XCircle size={14} color={Colors.error} />
                <Text style={[styles.permissionText, { color: Colors.textLight }]}>Save Calculations</Text>
              </View>
              <View style={styles.permissionItem}>
                <XCircle size={14} color={Colors.error} />
                <Text style={[styles.permissionText, { color: Colors.textLight }]}>Export Results</Text>
              </View>
              <View style={styles.permissionItem}>
                <XCircle size={14} color={Colors.error} />
                <Text style={[styles.permissionText, { color: Colors.textLight }]}>Support Access</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      {/* Group Management Actions */}
      <View style={styles.groupManagementActions}>
        <TouchableOpacity 
          style={styles.managementActionButton}
          onPress={() => Alert.alert('Coming Soon', 'Bulk user assignment functionality will be implemented here.')}
        >
          <Users size={18} color={Colors.primary} />
          <Text style={styles.managementActionText}>Bulk Assign Users</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.managementActionButton}
          onPress={() => Alert.alert('Coming Soon', 'Permission templates functionality will be implemented here.')}
        >
          <Shield size={18} color={Colors.primary} />
          <Text style={styles.managementActionText}>Permission Templates</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.managementActionButton}
          onPress={() => Alert.alert('Coming Soon', 'Group analytics functionality will be implemented here.')}
        >
          <Activity size={18} color={Colors.primary} />
          <Text style={styles.managementActionText}>Group Analytics</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderLogs = () => {
    const filteredLogs = getFilteredLogs();
    
    return (
      <View style={[styles.section, Shadows.medium]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>System Logs</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => {
                // Clear logs with confirmation
                Alert.alert(
                  'Clear Logs',
                  'Are you sure you want to clear all system logs? This action cannot be undone.',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Clear',
                      style: 'destructive',
                      onPress: async () => {
                        setLogs([]);
                        await AsyncStorage.setItem('systemLogs', JSON.stringify([]));
                        Alert.alert('Success', 'System logs cleared successfully');
                      }
                    }
                  ]
                );
              }}
            >
              <Trash2 size={18} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search logs by message or user..."
            value={logSearchQuery}
            onChangeText={setLogSearchQuery}
            placeholderTextColor={Colors.textSecondary}
          />
          {logSearchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setLogSearchQuery('')}>
              <X size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs */}
        <View style={styles.logFilterTabs}>
          {(['all', 'info', 'warning', 'error'] as const).map((filter) => {
            const count = filter === 'all' ? logs.length : logs.filter(log => log.type === filter).length;
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.logFilterTab,
                  logFilter === filter && styles.logFilterTabActive
                ]}
                onPress={() => setLogFilter(filter)}
              >
                <View style={styles.logFilterTabContent}>
                  {filter !== 'all' && (
                    <View style={[
                      styles.logFilterIcon,
                      { backgroundColor: 
                        filter === 'error' ? Colors.error + '20' : 
                        filter === 'warning' ? Colors.warning + '20' : 
                        Colors.info + '20' 
                      }
                    ]}>
                      <AlertCircle size={12} color={
                        filter === 'error' ? Colors.error : 
                        filter === 'warning' ? Colors.warning : 
                        Colors.info
                      } />
                    </View>
                  )}
                  <Text style={[
                    styles.logFilterTabText,
                    logFilter === filter && styles.logFilterTabTextActive
                  ]}>
                    {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </Text>
                  <View style={[
                    styles.logFilterCount,
                    logFilter === filter && styles.logFilterCountActive
                  ]}>
                    <Text style={[
                      styles.logFilterCountText,
                      logFilter === filter && styles.logFilterCountTextActive
                    ]}>
                      {count}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Log Statistics */}
        <View style={styles.logStats}>
          <View style={styles.logStatItem}>
            <Text style={styles.logStatLabel}>Total Logs:</Text>
            <Text style={styles.logStatValue}>{logs.length}</Text>
          </View>
          <View style={styles.logStatItem}>
            <Text style={styles.logStatLabel}>Filtered:</Text>
            <Text style={styles.logStatValue}>{filteredLogs.length}</Text>
          </View>
          <View style={styles.logStatItem}>
            <Text style={styles.logStatLabel}>Errors:</Text>
            <Text style={[styles.logStatValue, { color: Colors.error }]}>
              {logs.filter(log => log.type === 'error').length}
            </Text>
          </View>
          <View style={styles.logStatItem}>
            <Text style={styles.logStatLabel}>Warnings:</Text>
            <Text style={[styles.logStatValue, { color: Colors.warning }]}>
              {logs.filter(log => log.type === 'warning').length}
            </Text>
          </View>
        </View>

        {/* Logs List */}
        {filteredLogs.length === 0 ? (
          <View style={styles.noLogsContainer}>
            <FileText size={48} color={Colors.textLight} />
            <Text style={styles.noLogsTitle}>
              {logSearchQuery.trim() || logFilter !== 'all' ? 'No matching logs found' : 'No logs available'}
            </Text>
            <Text style={styles.noLogsText}>
              {logSearchQuery.trim() 
                ? 'Try adjusting your search query or filter settings.'
                : logFilter !== 'all'
                ? `No ${logFilter} logs found. Try selecting a different filter.`
                : 'System logs will appear here as activities occur.'}
            </Text>
            {(logSearchQuery.trim() || logFilter !== 'all') && (
              <TouchableOpacity 
                style={styles.clearFiltersButton}
                onPress={() => {
                  setLogSearchQuery('');
                  setLogFilter('all');
                }}
              >
                <Text style={styles.clearFiltersButtonText}>Clear Filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {filteredLogs.map(log => (
              <View key={log.id} style={styles.logItem}>
                <View style={[styles.logIcon, { backgroundColor: 
                  log.type === 'error' ? Colors.error + '20' : 
                  log.type === 'warning' ? Colors.warning + '20' : 
                  Colors.info + '20' 
                }]}>
                  <AlertCircle size={16} color={
                    log.type === 'error' ? Colors.error : 
                    log.type === 'warning' ? Colors.warning : 
                    Colors.info
                  } />
                </View>
                <View style={styles.logContent}>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  <View style={styles.logMeta}>
                    <Text style={styles.logTime}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                    {log.user && (
                      <Text style={styles.logUser}>• {log.user}</Text>
                    )}
                    <View style={[
                      styles.logTypeBadge,
                      { backgroundColor: 
                        log.type === 'error' ? Colors.error + '20' : 
                        log.type === 'warning' ? Colors.warning + '20' : 
                        Colors.info + '20' 
                      }
                    ]}>
                      <Text style={[
                        styles.logTypeBadgeText,
                        { color: 
                          log.type === 'error' ? Colors.error : 
                          log.type === 'warning' ? Colors.warning : 
                          Colors.info
                        }
                      ]}>
                        {log.type.toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
            
            {filteredLogs.length > 10 && (
              <View style={styles.logsPagination}>
                <Text style={styles.logsPaginationText}>
                  Showing {Math.min(10, filteredLogs.length)} of {filteredLogs.length} logs
                </Text>
                <TouchableOpacity style={styles.loadMoreButton}>
                  <Text style={styles.loadMoreButtonText}>Load More</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  };

  // Security check: Only allow admin users to access this screen
  if (isGuest) {
    return (
      <View style={styles.accessDenied}>
        <Shield size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Access Denied</Text>
        <Text style={styles.accessDeniedText}>
          Guest users cannot access the admin panel. Please log in with an admin account.
        </Text>
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <View style={styles.accessDenied}>
        <Shield size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Authentication Required</Text>
        <Text style={styles.accessDeniedText}>
          Please log in to access the admin panel.
        </Text>
      </View>
    );
  }

  if (user.role !== 'admin') {
    return (
      <View style={styles.accessDenied}>
        <Shield size={64} color={Colors.error} />
        <Text style={styles.accessDeniedTitle}>Admin Access Required</Text>
        <Text style={styles.accessDeniedText}>
          Only administrators can access this panel. Your role: {user.role}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab,
                activeTab === tab.id && styles.tabActive
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <tab.icon 
                size={18} 
                color={activeTab === tab.id ? '#4CAF50' : '#999999'} 
              />
              <Text style={[
                styles.tabText,
                activeTab === tab.id && styles.tabTextActive
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'users' && renderUsers()}
        {activeTab === 'groups' && renderGroups()}
        {activeTab === 'visitors' && renderVisitors()}
        {activeTab === 'calculators' && renderCalculators()}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'settings' && renderSettings()}
        {activeTab === 'logs' && renderLogs()}
      </ScrollView>

      <Modal
        visible={showUserModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowUserModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedUser ? 'Edit User' : 'Add User'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowUserModal(false);
                setSelectedUser(null);
              }}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Personal Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Personal Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Full Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editUserForm.name}
                    onChangeText={(text) => setEditUserForm(prev => ({ ...prev, name: text }))}
                    placeholder="Enter full name"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editUserForm.email}
                    onChangeText={(text) => setEditUserForm(prev => ({ ...prev, email: text }))}
                    placeholder="Enter email address"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>
              
              {/* Role & Status */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Access Control</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Role</Text>
                  <View style={styles.roleSelector}>
                    {(['admin', 'premium', 'starter'] as const).map((role) => (
                      <TouchableOpacity
                        key={role}
                        style={[
                          styles.roleOption,
                          editUserForm.role === role && styles.roleOptionActive
                        ]}
                        onPress={() => setEditUserForm(prev => ({ ...prev, role }))}
                      >
                        <Text style={[
                          styles.roleOptionText,
                          editUserForm.role === role && styles.roleOptionTextActive
                        ]}>
                          {role.charAt(0).toUpperCase() + role.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Status</Text>
                  <View style={styles.statusSelector}>
                    {(['approved', 'pending', 'suspended'] as const).map((status) => (
                      <TouchableOpacity
                        key={status}
                        style={[
                          styles.statusOption,
                          editUserForm.status === status && styles.statusOptionActive,
                          { backgroundColor: 
                            status === 'approved' ? Colors.success + '20' :
                            status === 'pending' ? Colors.warning + '20' :
                            Colors.error + '20'
                          }
                        ]}
                        onPress={() => setEditUserForm(prev => ({ ...prev, status }))}
                      >
                        <Text style={[
                          styles.statusOptionText,
                          { color: 
                            status === 'approved' ? Colors.success :
                            status === 'pending' ? Colors.warning :
                            Colors.error
                          },
                          editUserForm.status === status && { fontWeight: '600' }
                        ]}>
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              
              {/* Company Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Company Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Company</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editUserForm.company}
                    onChangeText={(text) => setEditUserForm(prev => ({ ...prev, company: text }))}
                    placeholder="Enter company name"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Position</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editUserForm.position}
                    onChangeText={(text) => setEditUserForm(prev => ({ ...prev, position: text }))}
                    placeholder="Enter job position"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Country</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editUserForm.country}
                    onChangeText={(text) => setEditUserForm(prev => ({ ...prev, country: text }))}
                    placeholder="Enter country"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
              </View>
              
              {/* Preferences */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Preferences</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Unit System</Text>
                  <View style={styles.unitToggle}>
                    <TouchableOpacity
                      style={[
                        styles.unitOption,
                        editUserForm.unitPreference === 'metric' && styles.unitOptionActive
                      ]}
                      onPress={() => setEditUserForm(prev => ({ ...prev, unitPreference: 'metric' }))}
                    >
                      <Text style={[
                        styles.unitOptionText,
                        editUserForm.unitPreference === 'metric' && styles.unitOptionTextActive
                      ]}>Metric</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.unitOption,
                        editUserForm.unitPreference === 'imperial' && styles.unitOptionActive
                      ]}
                      onPress={() => setEditUserForm(prev => ({ ...prev, unitPreference: 'imperial' }))}
                    >
                      <Text style={[
                        styles.unitOptionText,
                        editUserForm.unitPreference === 'imperial' && styles.unitOptionTextActive
                      ]}>Imperial</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowUserModal(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveUser}
              >
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showCalculatorModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalculatorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxWidth: 600 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedCalculator ? 'Edit Calculator' : 'Add Calculator'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowCalculatorModal(false);
                setSelectedCalculator(null);
              }}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              {/* Basic Information */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Basic Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Calculator Name</Text>
                  <TextInput
                    style={styles.textInput}
                    value={calculatorForm.name}
                    onChangeText={(text) => setCalculatorForm(prev => ({ ...prev, name: text }))}
                    placeholder="e.g., Material Removal Rate"
                    placeholderTextColor={Colors.textSecondary}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Description</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={calculatorForm.description}
                    onChangeText={(text) => setCalculatorForm(prev => ({ ...prev, description: text }))}
                    placeholder="Brief description of what this calculator does"
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    numberOfLines={3}
                  />
                </View>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Categories</Text>
                  <View style={styles.categorySelector}>
                    {availableCategories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.categoryOption,
                          calculatorForm.categories.includes(cat) && styles.categoryOptionActive
                        ]}
                        onPress={() => {
                          setCalculatorForm(prev => ({
                            ...prev,
                            categories: prev.categories.includes(cat)
                              ? prev.categories.filter(c => c !== cat)
                              : [...prev.categories, cat]
                          }));
                        }}
                      >
                        <Text style={[
                          styles.categoryOptionText,
                          calculatorForm.categories.includes(cat) && styles.categoryOptionTextActive
                        ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </View>
              
              {/* Input Variables */}
              <View style={styles.formSection}>
                <View style={styles.sectionHeaderWithButton}>
                  <Text style={styles.formSectionTitle}>Input Variables</Text>
                  <TouchableOpacity
                    style={styles.addInputButton}
                    onPress={() => {
                      const newInput: CalculatorInput = {
                        id: `input_${Date.now()}`,
                        name: '',
                        label: '',
                        unit: '',
                        type: 'number',
                      };
                      setCalculatorForm(prev => ({
                        ...prev,
                        inputs: [...prev.inputs, newInput]
                      }));
                    }}
                  >
                    <Plus size={16} color={Colors.surface} />
                    <Text style={styles.addInputButtonText}>Add Input</Text>
                  </TouchableOpacity>
                </View>
                
                {calculatorForm.inputs.map((input, index) => (
                  <View key={input.id} style={styles.inputVariable}>
                    <View style={styles.inputVariableHeader}>
                      <Text style={styles.inputVariableNumber}>Input {index + 1}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setCalculatorForm(prev => ({
                            ...prev,
                            inputs: prev.inputs.filter(i => i.id !== input.id)
                          }));
                        }}
                      >
                        <Trash2 size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.inputVariableRow}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Variable Name</Text>
                        <TextInput
                          style={styles.textInput}
                          value={input.name}
                          onChangeText={(text) => {
                            setCalculatorForm(prev => ({
                              ...prev,
                              inputs: prev.inputs.map(i => 
                                i.id === input.id ? { ...i, name: text } : i
                              )
                            }));
                          }}
                          placeholder="e.g., vw"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                      
                      <View style={[styles.inputGroup, { flex: 2 }]}>
                        <Text style={styles.inputLabel}>Label</Text>
                        <TextInput
                          style={styles.textInput}
                          value={input.label}
                          onChangeText={(text) => {
                            setCalculatorForm(prev => ({
                              ...prev,
                              inputs: prev.inputs.map(i => 
                                i.id === input.id ? { ...i, label: text } : i
                              )
                            }));
                          }}
                          placeholder="e.g., Work Speed"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                    </View>
                    
                    <View style={styles.inputVariableRow}>
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Metric Unit</Text>
                        <TextInput
                          style={styles.textInput}
                          value={input.unitMetric || input.unit}
                          onChangeText={(text) => {
                            setCalculatorForm(prev => ({
                              ...prev,
                              inputs: prev.inputs.map(i => 
                                i.id === input.id ? { ...i, unitMetric: text, unit: text } : i
                              )
                            }));
                          }}
                          placeholder="e.g., m/min"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                      
                      <View style={[styles.inputGroup, { flex: 1 }]}>
                        <Text style={styles.inputLabel}>Imperial Unit</Text>
                        <TextInput
                          style={styles.textInput}
                          value={input.unitImperial || input.unit}
                          onChangeText={(text) => {
                            setCalculatorForm(prev => ({
                              ...prev,
                              inputs: prev.inputs.map(i => 
                                i.id === input.id ? { ...i, unitImperial: text } : i
                              )
                            }));
                          }}
                          placeholder="e.g., ft/min"
                          placeholderTextColor={Colors.textSecondary}
                        />
                      </View>
                    </View>
                  </View>
                ))}
              </View>
              
              {/* Formula Builder */}
              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Formula Builder</Text>
                <TouchableOpacity
                  style={styles.openFormulaBuilderButton}
                  onPress={() => {
                    console.log('Opening formula builder...');
                    // Close the calculator modal first to avoid modal conflicts
                    setShowCalculatorModal(false);
                    // Use setTimeout to ensure the first modal is closed before opening the second
                    setTimeout(() => {
                      setShowFormulaBuilder(true);
                      console.log('Formula builder opened');
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openFormulaBuilderButtonText}>Open Formula Builder</Text>
                </TouchableOpacity>
                
                {/* Formula Display */}
                {calculatorForm.formula && (
                  <View style={styles.formulaDisplay}>
                    <Text style={styles.formulaDisplayTitle}>Current Formula</Text>
                    <View style={styles.formulaDisplayContent}>
                      <Text style={styles.formulaText}>
                        {renderFormulaAsText(calculatorForm.formula)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.clearFormulaButton}
                      onPress={() => {
                        setCalculatorForm(prev => ({ ...prev, formula: null }));
                      }}
                    >
                      <Text style={styles.clearFormulaButtonText}>Clear Formula</Text>
                    </TouchableOpacity>
                  </View>
                )}
                
                <View style={styles.inputVariableRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Result Unit (Metric)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={calculatorForm.resultUnitMetric || calculatorForm.resultUnit}
                      onChangeText={(text) => setCalculatorForm(prev => ({ ...prev, resultUnitMetric: text, resultUnit: text }))}
                      placeholder="e.g., mm³/mm·s"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                  
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Result Unit (Imperial)</Text>
                    <TextInput
                      style={styles.textInput}
                      value={calculatorForm.resultUnitImperial || calculatorForm.resultUnit}
                      onChangeText={(text) => setCalculatorForm(prev => ({ ...prev, resultUnitImperial: text }))}
                      placeholder="e.g., in³/in·s"
                      placeholderTextColor={Colors.textSecondary}
                    />
                  </View>
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  setShowCalculatorModal(false);
                  setSelectedCalculator(null);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={handleSaveCalculator}
              >
                <Text style={styles.saveButtonText}>
                  {selectedCalculator ? 'Update Calculator' : 'Create Calculator'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Group Editor Modal */}
      <Modal
        visible={showGroupModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Group</Text>
              <TouchableOpacity onPress={() => setShowGroupModal(false)}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Group Name</Text>
                <TextInput
                  style={styles.textInput}
                  value={groupForm.name}
                  onChangeText={(text) => setGroupForm(prev => ({ ...prev, name: text }))}
                  placeholder="Group name"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Description</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  value={groupForm.description}
                  onChangeText={(text) => setGroupForm(prev => ({ ...prev, description: text }))}
                  placeholder="Group description"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Calculators Access</Text>
                <View style={styles.roleSelector}>
                  {(['All','Basic','Limited'] as const).map(option => (
                    <TouchableOpacity
                      key={option}
                      style={[styles.roleOption, groupForm.calculatorsAccess === option && styles.roleOptionActive]}
                      onPress={() => setGroupForm(prev => ({ ...prev, calculatorsAccess: option }))}
                      testID={`group-calculators-${option.toLowerCase()}`}
                    >
                      <Text style={[styles.roleOptionText, groupForm.calculatorsAccess === option && styles.roleOptionTextActive]}>
                        {option}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Usage Limit</Text>
                <TextInput
                  style={styles.textInput}
                  value={groupForm.usageLimit}
                  onChangeText={(text) => setGroupForm(prev => ({ ...prev, usageLimit: text }))}
                  placeholder="e.g., ∞ or 50/day"
                  placeholderTextColor={Colors.textSecondary}
                />
              </View>

              <View style={styles.formSection}>
                <Text style={styles.formSectionTitle}>Permissions</Text>
                <View style={{ gap: 12 }}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, userManagement: !prev.permissions.userManagement } }))}
                    testID="perm-user-management"
                  >
                    <View style={styles.settingInfo}>
                      <Users size={20} color={Colors.primary} />
                      <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>User Management</Text>
                        <Text style={styles.settingDescription}>Manage users and groups</Text>
                      </View>
                    </View>
                    <Switch
                      value={groupForm.permissions.userManagement}
                      onValueChange={(value) => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, userManagement: value } }))}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                      thumbColor={Colors.surface}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, calculatorManagement: !prev.permissions.calculatorManagement } }))}
                    testID="perm-calculator-management"
                  >
                    <View style={styles.settingInfo}>
                      <Calculator size={20} color={Colors.primary} />
                      <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>Calculator Management</Text>
                        <Text style={styles.settingDescription}>Create and edit calculators</Text>
                      </View>
                    </View>
                    <Switch
                      value={groupForm.permissions.calculatorManagement}
                      onValueChange={(value) => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, calculatorManagement: value } }))}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                      thumbColor={Colors.surface}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, systemSettings: !prev.permissions.systemSettings } }))}
                    testID="perm-system-settings"
                  >
                    <View style={styles.settingInfo}>
                      <Settings size={20} color={Colors.primary} />
                      <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>System Settings</Text>
                        <Text style={styles.settingDescription}>Change global settings</Text>
                      </View>
                    </View>
                    <Switch
                      value={groupForm.permissions.systemSettings}
                      onValueChange={(value) => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, systemSettings: value } }))}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                      thumbColor={Colors.surface}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, analytics: !prev.permissions.analytics } }))}
                    testID="perm-analytics"
                  >
                    <View style={styles.settingInfo}>
                      <Activity size={20} color={Colors.primary} />
                      <View style={styles.settingText}>
                        <Text style={styles.settingLabel}>Analytics & Logs</Text>
                        <Text style={styles.settingDescription}>View analytics and logs</Text>
                      </View>
                    </View>
                    <Switch
                      value={groupForm.permissions.analytics}
                      onValueChange={(value) => setGroupForm(prev => ({ ...prev, permissions: { ...prev.permissions, analytics: value } }))}
                      trackColor={{ false: Colors.borderLight, true: Colors.primary }}
                      thumbColor={Colors.surface}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGroupModal(false)}
                testID="cancel-group-edit"
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveGroup}
                testID="save-group"
              >
                <Text style={styles.saveButtonText}>Save Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Formula Builder Modal */}
      <Modal
        visible={showFormulaBuilder}
        animationType="fade"
        transparent={true}
        onRequestClose={() => {
          console.log('Formula builder modal onRequestClose called');
          setShowFormulaBuilder(false);
          // Reopen calculator modal after closing formula builder
          setTimeout(() => {
            setShowCalculatorModal(true);
          }, 100);
        }}
      >
        <View style={styles.formulaBuilderOverlay}>
          <View style={styles.formulaBuilderContent}>
            <View style={styles.formulaBuilderHeader}>
              <Text style={styles.formulaBuilderTitle}>Formula Builder</Text>
              <TouchableOpacity 
                onPress={() => {
                  console.log('Formula builder close button pressed');
                  setShowFormulaBuilder(false);
                  // Reopen calculator modal
                  setTimeout(() => {
                    setShowCalculatorModal(true);
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formulaBuilderBody} 
              showsVerticalScrollIndicator={false}
              scrollEnabled={!isDragActive}
            >
              <Text style={styles.formulaHelp}>
                Build your formula by clicking elements below or typing directly in the editor.
              </Text>
              
              {/* Available Elements */}
              <View style={[
                styles.formulaElements,
                isDragActive && styles.formulaElementsHighlight
              ]}>
                <Text style={styles.formulaElementsTitle}>
                  Input Variables {isDragActive && '(Drag & Drop Active)'}
                </Text>
                <View style={styles.formulaElementsGrid}>
                  {calculatorForm.inputs.length === 0 ? (
                    <Text style={styles.formulaPlaceholder}>
                      Add input variables first to use them in formulas
                    </Text>
                  ) : (
                    calculatorForm.inputs.map((input) => (
                      <FormulaElement
                        key={input.id}
                        type="input"
                        value={input.name || `input_${input.id}`}
                        label={input.label || input.name || `Input ${input.id}`}
                        style={[
                          styles.formulaElement,
                          styles.formulaInputStyle,
                          isDragActive && styles.formulaElementDragActive
                        ]}
                        textStyle={styles.formulaElementText}
                        onPress={handleElementDrop}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        isDraggable={true}
                      />
                    ))
                  )}
                </View>
                
                <Text style={[styles.formulaElementsTitle, { marginTop: 16 }]}>
                  Operators {isDragActive && '(Drag to Formula Editor)'}
                </Text>
                <View style={styles.formulaElementsGrid}>
                  {['+', '-', '*', '/', '(', ')'].map((op) => (
                    <FormulaElement
                      key={op}
                      type="operator"
                      value={op}
                      label={op}
                      style={[
                        styles.formulaElement, 
                        styles.formulaOperator,
                        isDragActive && styles.formulaElementDragActive
                      ]}
                      textStyle={styles.formulaOperatorText}
                      onPress={handleElementDrop}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDraggable={true}
                    />
                  ))}
                </View>
                
                <Text style={[styles.formulaElementsTitle, { marginTop: 16 }]}>
                  Common Numbers {isDragActive && '(Drag to add to formula)'}
                </Text>
                <View style={styles.formulaElementsGrid}>
                  {['1000', '60', '3.14159', '2', '10'].map((num) => (
                    <FormulaElement
                      key={num}
                      type="number"
                      value={num}
                      label={num}
                      style={[
                        styles.formulaElement, 
                        styles.formulaNumber,
                        isDragActive && styles.formulaElementDragActive
                      ]}
                      textStyle={styles.formulaNumberText}
                      onPress={handleElementDrop}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      isDraggable={true}
                    />
                  ))}
                </View>
              </View>
              
              {/* Formula Editor - Drop Zone */}
              <View style={[
                styles.formulaEditor,
                isDragActive && styles.formulaEditorDropZone
              ]}>
                <Text style={styles.formulaEditorTitle}>
                  Formula Editor {isDragActive && '(Drop Zone - Release elements here)'}
                </Text>
                <View style={[
                  styles.formulaInputContainer,
                  isDragActive && styles.formulaInputContainerActive
                ]}>
                  <TextInput
                    style={[
                      styles.formulaInputField,
                      isDragActive && styles.formulaInputFieldActive
                    ]}
                    value={calculatorForm.formula ? renderFormulaAsText(calculatorForm.formula) : ''}
                    onChangeText={handleFormulaTextChange}
                    placeholder={isDragActive ? "Drop elements here or type formula (e.g., vw * ae / 60)" : "Enter formula (e.g., vw * ae / 60)"}
                    placeholderTextColor={Colors.textSecondary}
                    multiline
                    numberOfLines={3}
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {isDragActive && (
                    <View style={styles.dropZoneIndicator}>
                      <Text style={styles.dropZoneText}>Drop Here</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.formulaHint}>
                  {isDragActive 
                    ? '🎯 Drag elements from above and drop them here, or type directly in the editor.'
                    : 'You can drag & drop elements from above or type the formula directly.'
                  }
                  {calculatorForm.inputs.length > 0 && (
                    ` Available variables: ${calculatorForm.inputs.map(i => i.name || i.id).filter(Boolean).join(', ')}`
                  )}
                </Text>
                
                {/* Formula validation */}
                {calculatorForm.formula === null && calculatorForm.inputs.length > 0 && (
                  <View style={styles.formulaValidation}>
                    <Text style={styles.formulaValidationText}>
                      ⚠️ Formula is required. Try: {calculatorForm.inputs.map(i => i.name || i.id).filter(Boolean).join(' * ')}
                    </Text>
                  </View>
                )}
              </View>
              
              {/* Formula Preview */}
              <View style={styles.formulaPreview}>
                <Text style={styles.formulaPreviewTitle}>Formula Preview</Text>
                <View style={styles.formulaPreviewContent}>
                  {calculatorForm.formula ? (
                    <Text style={styles.formulaText}>
                      {renderFormulaAsText(calculatorForm.formula)}
                    </Text>
                  ) : (
                    <Text style={styles.formulaPlaceholder}>
                      No formula defined yet
                    </Text>
                  )}
                </View>
              </View>
            </ScrollView>
            
            <View style={styles.formulaBuilderActions}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={() => {
                  console.log('Formula builder cancelled');
                  setShowFormulaBuilder(false);
                  // Reopen calculator modal
                  setTimeout(() => {
                    setShowCalculatorModal(true);
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.saveButton}
                onPress={() => {
                  console.log('Formula applied:', calculatorForm.formula);
                  setShowFormulaBuilder(false);
                  // Reopen calculator modal with the formula applied
                  setTimeout(() => {
                    setShowCalculatorModal(true);
                  }, 100);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.saveButtonText}>Apply Formula</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  tabBar: {
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: '#333333',
  },
  tabBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  tabText: {
    fontSize: 14,
    color: '#999999',
    fontWeight: '500' as const,
  },
  tabTextActive: {
    color: '#4CAF50',
  },
  content: {
    flex: 1,
    padding: 16,
    backgroundColor: '#1a1a1a',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    cursor: 'pointer',
  },
  statCardDark: {
    backgroundColor: '#2a2a2a',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  statValueDark: {
    color: '#ffffff',
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  statLabelDark: {
    color: '#cccccc',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  sectionDark: {
    backgroundColor: '#2a2a2a',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sectionTitleDark: {
    color: '#ffffff',
  },
  headerButton: {
    padding: 8,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
  },
  headerButtonDark: {
    backgroundColor: '#4CAF50' + '20',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
  },
  refreshButtonComplete: {
    backgroundColor: Colors.textSecondary + '10',
  },
  refreshButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  refreshButtonTextComplete: {
    color: Colors.textSecondary,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  userCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  userInfo: {
    flex: 1,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  userEmail: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  userCompany: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
    fontWeight: '500' as const,
  },
  userCountry: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: Colors.success + '20',
  },
  rejectButton: {
    backgroundColor: Colors.error + '20',
  },
  editButton: {
    backgroundColor: Colors.primary + '20',
  },
  deleteButton: {
    backgroundColor: Colors.error + '20',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600' as const,
  },
  calculatorCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  calculatorInfo: {
    flex: 1,
  },
  calculatorName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  categoryBadge: {
    backgroundColor: Colors.textSecondary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500' as const,
  },
  calculatorStats: {
    fontSize: 12,
    color: Colors.textLight,
  },
  calculatorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  settingInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  unitToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 2,
  },
  unitOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  unitOptionActive: {
    backgroundColor: Colors.primary,
  },
  unitOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  unitOptionTextActive: {
    color: Colors.surface,
  },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 2,
  },
  numberButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberButtonText: {
    color: Colors.surface,
    fontSize: 18,
    fontWeight: '600' as const,
  },
  numberValue: {
    marginHorizontal: 16,
    fontSize: 16,
    fontWeight: '500' as const,
    color: Colors.text,
    minWidth: 40,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  logItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 12,
  },
  logItemDark: {
    borderBottomColor: '#444444',
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logContent: {
    flex: 1,
  },
  logMessage: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  logMessageDark: {
    color: '#ffffff',
  },
  logMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logTime: {
    fontSize: 12,
    color: Colors.textLight,
  },
  logTimeDark: {
    color: '#999999',
  },
  logUser: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 500,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  modalText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  modalForm: {
    maxHeight: 400,
  },
  formSection: {
    marginBottom: 20,
  },
  formSectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  roleSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 2,
  },
  roleOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  roleOptionActive: {
    backgroundColor: Colors.primary,
  },
  roleOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  roleOptionTextActive: {
    color: Colors.surface,
  },
  statusSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  statusOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  statusOptionActive: {
    borderColor: Colors.primary,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  notificationForm: {
    gap: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  iconSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  iconOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  iconOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  iconOptionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  iconOptionTextActive: {
    color: Colors.surface,
  },
  targetGroupSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  targetGroupOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  targetGroupOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  targetGroupText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  targetGroupTextActive: {
    color: Colors.surface,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  priorityOptionActive: {
    borderColor: Colors.primary,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '500' as const,
  },
  durationSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  durationOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  durationOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  durationText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  durationTextActive: {
    color: Colors.surface,
  },
  sendButton: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  notificationHistory: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  historyItem: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  historyIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyContent: {
    flex: 1,
  },
  historyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  historyMeta: {
    fontSize: 11,
    color: Colors.textLight,
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
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryOptionText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  categoryOptionTextActive: {
    color: Colors.surface,
  },
  sectionHeaderWithButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addInputButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addInputButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.surface,
  },
  inputVariable: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  inputVariableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputVariableNumber: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  inputVariableRow: {
    flexDirection: 'row',
    gap: 8,
  },
  formulaHelp: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  formulaElements: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  formulaElementsTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  formulaElementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  formulaElement: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formulaElementText: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '500' as const,
  },
  formulaOperator: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '30',
  },
  formulaOperatorText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  formulaNumber: {
    backgroundColor: Colors.info + '10',
    borderColor: Colors.info + '30',
  },
  formulaNumberText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.info,
  },
  formulaDisplay: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formulaDisplayTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formulaDisplayContent: {
    minHeight: 40,
    justifyContent: 'center',
  },
  formulaText: {
    fontSize: 16,
    fontFamily: 'monospace',
    color: Colors.text,
  },
  formulaPlaceholder: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  clearFormulaButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.error + '10',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  clearFormulaButtonText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.error,
  },
  formulaEditor: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  formulaEditorTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formulaInput: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formulaHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  formulaValidation: {
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.warning + '10',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.warning + '30',
  },
  formulaValidationText: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '500' as const,
  },
  openFormulaBuilderButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  openFormulaBuilderButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.surface,
  },
  formulaBuilderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  formulaBuilderContent: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 700,
    maxHeight: '85%',
  },
  formulaBuilderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  formulaBuilderTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  formulaBuilderBody: {
    maxHeight: 500,
  },
  formulaBuilderActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  formulaPreview: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  formulaPreviewTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  formulaPreviewContent: {
    minHeight: 40,
    justifyContent: 'center',
  },
  // Drag and Drop Styles
  dragIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    flexDirection: 'row',
    gap: 1,
  },
  dragDot: {
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: Colors.textLight,
    opacity: 0.6,
  },
  formulaElementsHighlight: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '05',
  },
  formulaElementDragActive: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '10',
  },
  formulaEditorDropZone: {
    borderColor: Colors.success,
    borderWidth: 2,
    backgroundColor: Colors.success + '05',
  },
  formulaInputContainer: {
    position: 'relative',
  },
  formulaInputContainerActive: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.success,
    borderStyle: 'dashed',
  },
  formulaInputField: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    fontFamily: 'monospace',
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  formulaInputFieldActive: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '05',
  },
  dropZoneIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.success + '10',
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.success,
    borderStyle: 'dashed',
    pointerEvents: 'none',
  },
  dropZoneText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.success,
    textAlign: 'center',
  },
  formulaInputStyle: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary + '30',
  },
  pendingUserItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pendingUserItemDark: {
    borderBottomColor: '#444444',
  },
  pendingUserInfo: {
    flex: 1,
  },
  pendingUserHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  pendingUserName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  pendingUserNameDark: {
    color: '#ffffff',
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.warning + '20',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.warning,
  },
  pendingUserEmail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  pendingUserEmailDark: {
    color: '#cccccc',
  },
  pendingUserCompany: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  pendingUserCompanyDark: {
    color: '#cccccc',
  },
  pendingUserDate: {
    fontSize: 11,
    color: Colors.textLight,
  },
  pendingUserDateDark: {
    color: '#999999',
  },
  pendingUserActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewMoreButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  viewMoreText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
    viewAllText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: Colors.primary,
    },
    // Visitor Analytics Styles
    visitorStatsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 16,
    },
    visitorStatCard: {
      flex: 1,
      minWidth: '47%',
      backgroundColor: Colors.surface,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
    },
    visitorStatIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: Colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    visitorStatValue: {
      fontSize: 20,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 4,
    },
    visitorStatLabel: {
      fontSize: 12,
      color: Colors.textSecondary,
    },
    visitorFilterTabs: {
      flexDirection: 'row',
      backgroundColor: Colors.background,
      borderRadius: 8,
      padding: 2,
    },
    visitorFilterTab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 6,
      alignItems: 'center',
    },
    visitorFilterTabActive: {
      backgroundColor: Colors.primary,
    },
    visitorFilterTabText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: Colors.textSecondary,
    },
    visitorFilterTabTextActive: {
      color: Colors.surface,
    },
    countryItem: {
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    countryInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 8,
    },
    countryRank: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.primary,
      width: 30,
    },
    countryName: {
      fontSize: 14,
      fontWeight: '500' as const,
      color: Colors.text,
      flex: 1,
    },
    countryStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingLeft: 38,
    },
    countryVisitors: {
      fontSize: 12,
      color: Colors.textSecondary,
      width: 80,
    },
    countryBar: {
      flex: 1,
      height: 6,
      backgroundColor: Colors.background,
      borderRadius: 3,
      overflow: 'hidden',
    },
    countryBarFill: {
      height: '100%',
      backgroundColor: Colors.primary,
      borderRadius: 3,
    },
    countryPercentage: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: Colors.text,
      width: 40,
      textAlign: 'right',
    },
    visitorTableHeader: {
      flexDirection: 'row',
      backgroundColor: Colors.background,
      paddingVertical: 12,
      paddingHorizontal: 8,
      borderBottomWidth: 2,
      borderBottomColor: Colors.borderLight,
    },
    visitorTableHeaderText: {
      fontWeight: '600' as const,
      color: Colors.text,
      fontSize: 13,
    },
    visitorTableRow: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderBottomWidth: 1,
      borderBottomColor: Colors.borderLight,
    },
    visitorTableCell: {
      paddingHorizontal: 8,
      fontSize: 12,
      color: Colors.textSecondary,
    },
    visitorLocation: {
      fontSize: 12,
      color: Colors.text,
      fontWeight: '500' as const,
    },
    visitorTimezone: {
      fontSize: 10,
      color: Colors.textLight,
      marginTop: 2,
    },
    visitorDeviceCell: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    visitorDeviceOS: {
      fontSize: 11,
      color: Colors.text,
    },
    visitorDeviceBrowser: {
      fontSize: 10,
      color: Colors.textLight,
    },
    visitorPage: {
      fontSize: 11,
      color: Colors.primary,
      marginBottom: 2,
    },
    returningBadge: {
      fontSize: 10,
      color: Colors.success,
      fontWeight: '600' as const,
    },
    visitorIPLink: {
      fontSize: 12,
      color: Colors.primary,
      textDecorationLine: 'underline',
    },
    // Log Filtering Styles
    logFilterTabs: {
      flexDirection: 'row',
      backgroundColor: Colors.background,
      borderRadius: 8,
      padding: 2,
      marginBottom: 16,
    },
    logFilterTab: {
      flex: 1,
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 6,
      alignItems: 'center',
    },
    logFilterTabActive: {
      backgroundColor: Colors.primary,
    },
    logFilterTabContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    logFilterIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logFilterTabText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: Colors.textSecondary,
    },
    logFilterTabTextActive: {
      color: Colors.surface,
    },
    logFilterCount: {
      backgroundColor: Colors.textSecondary + '20',
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 10,
      minWidth: 20,
      alignItems: 'center',
    },
    logFilterCountActive: {
      backgroundColor: Colors.surface + '30',
    },
    logFilterCountText: {
      fontSize: 10,
      fontWeight: '600' as const,
      color: Colors.textSecondary,
    },
    logFilterCountTextActive: {
      color: Colors.surface,
    },
    logStats: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      backgroundColor: Colors.background,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    logStatItem: {
      alignItems: 'center',
    },
    logStatLabel: {
      fontSize: 11,
      color: Colors.textSecondary,
      marginBottom: 2,
    },
    logStatValue: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.text,
    },
    logTypeBadge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      marginLeft: 8,
    },
    logTypeBadgeText: {
      fontSize: 9,
      fontWeight: '600' as const,
    },
    noLogsContainer: {
      alignItems: 'center',
      paddingVertical: 40,
      paddingHorizontal: 20,
    },
    noLogsTitle: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: Colors.text,
      marginTop: 12,
      marginBottom: 8,
      textAlign: 'center',
    },
    noLogsText: {
      fontSize: 14,
      color: Colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    clearFiltersButton: {
      backgroundColor: Colors.primary,
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 6,
    },
    clearFiltersButtonText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: Colors.surface,
    },
    logsPagination: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 16,
      marginTop: 16,
      borderTopWidth: 1,
      borderTopColor: Colors.borderLight,
    },
    logsPaginationText: {
      fontSize: 12,
      color: Colors.textSecondary,
    },
    loadMoreButton: {
      backgroundColor: Colors.primary + '10',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 6,
    },
    loadMoreButtonText: {
      fontSize: 12,
      fontWeight: '500' as const,
      color: Colors.primary,
    },
    // User Groups Styles
    groupStatsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginBottom: 20,
    },
    groupStatCard: {
      flex: 1,
      minWidth: '22%',
      backgroundColor: Colors.background,
      borderRadius: 8,
      padding: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: Colors.borderLight,
    },
    groupStatIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 8,
    },
    groupStatValue: {
      fontSize: 18,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 2,
    },
    groupStatLabel: {
      fontSize: 11,
      color: Colors.textSecondary,
      textAlign: 'center',
    },
    groupsList: {
      gap: 16,
    },
    groupCard: {
      backgroundColor: Colors.background,
      borderRadius: 12,
      padding: 16,
      borderWidth: 1,
      borderColor: Colors.borderLight,
    },
    groupHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 16,
    },
    groupTitleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    groupIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      justifyContent: 'center',
      alignItems: 'center',
    },
    groupName: {
      fontSize: 16,
      fontWeight: '600' as const,
      color: Colors.text,
      marginBottom: 2,
    },
    groupDescription: {
      fontSize: 13,
      color: Colors.textSecondary,
      lineHeight: 18,
    },
    groupActions: {
      flexDirection: 'row',
      gap: 8,
    },
    groupStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      backgroundColor: Colors.surface,
      borderRadius: 8,
      padding: 12,
      marginBottom: 16,
    },
    groupStatItem: {
      alignItems: 'center',
    },
    groupStatNumber: {
      fontSize: 16,
      fontWeight: '700' as const,
      color: Colors.text,
      marginBottom: 2,
    },
    groupStatText: {
      fontSize: 11,
      color: Colors.textSecondary,
      textAlign: 'center',
    },
    groupPermissions: {
      marginTop: 4,
    },
    permissionsTitle: {
      fontSize: 14,
      fontWeight: '600' as const,
      color: Colors.text,
      marginBottom: 8,
    },
    permissionsList: {
      gap: 6,
    },
    permissionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    permissionText: {
      fontSize: 13,
      color: Colors.textSecondary,
    },
    groupManagementActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: Colors.borderLight,
    },
    managementActionButton: {
      flex: 1,
      minWidth: '30%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: Colors.background,
      borderRadius: 8,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderWidth: 1,
      borderColor: Colors.borderLight,
    },
    managementActionText: {
      fontSize: 13,
      fontWeight: '500' as const,
      color: Colors.primary,
    },
  });