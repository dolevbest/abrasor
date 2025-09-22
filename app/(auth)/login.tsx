import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, Lock, Settings, X, Check, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { useAuth } from '@/hooks/auth-context';
import { useTheme } from '@/hooks/theme-context';
import { ThemeSelector } from '@/components/ThemeSelector';

export default function LoginScreen() {
  const { login, isAuthenticated, continueAsGuest } = useAuth();
  const { theme, isDark } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGuestLoading, setIsGuestLoading] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/calculators');
    }
  }, [isAuthenticated]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    console.log('🔐 Starting login process...');
    console.log('🔐 Email:', email);
    console.log('🔐 Remember me:', rememberMe);
    
    setIsLoading(true);
    try {
      console.log('🔐 Calling login function...');
      await login(email, password, rememberMe);
      console.log('✅ Login successful, navigating to calculators...');
      router.replace('/(tabs)/calculators');
    } catch (error: any) {
      console.error('❌ Login failed in handleLogin:', error);
      const errorMessage = error.message || 'Invalid credentials';
      
      if (errorMessage.includes('Account is locked')) {
        Alert.alert(
          'Account Locked',
          errorMessage,
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('Too many failed login attempts')) {
        Alert.alert(
          'Account Locked',
          errorMessage,
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('Warning:') && errorMessage.includes('remaining')) {
        // Show warning about remaining attempts
        const lines = errorMessage.split('\n\n');
        Alert.alert(
          'Login Failed',
          errorMessage,
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('pending approval')) {
        Alert.alert(
          'Account Pending Approval',
          'Your account is currently pending approval by an administrator. You will receive an email notification once your account is approved.\n\nIf you have been waiting for an extended period, please contact support.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('denied') || errorMessage.includes('rejected') || errorMessage.includes('suspended')) {
        Alert.alert(
          'Access Denied',
          'Your account access has been denied or suspended. Please contact support if you believe this is an error.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('maintenance')) {
        Alert.alert(
          'System Maintenance',
          'The system is currently under maintenance. Only administrators can login at this time.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('pending')) {
        Alert.alert(
          'Request Under Review',
          'Your access request is currently being reviewed by our administrators. Please wait for approval.\n\nYou will receive an email notification once your request is processed.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestMode = async () => {
    setIsGuestLoading(true);
    try {
      await continueAsGuest();
      router.replace('/(tabs)/calculators');
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to continue as guest';
      if (errorMessage.includes('disabled')) {
        Alert.alert(
          'Guest Mode Disabled',
          'Guest mode is currently disabled by the administrator. Please create an account or login to continue.',
          [{ text: 'OK' }]
        );
      } else if (errorMessage.includes('maintenance')) {
        Alert.alert(
          'System Maintenance',
          'The system is currently under maintenance. Please try again later.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsGuestLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[styles.settingsButton, { backgroundColor: theme.surface }]}
        onPress={() => setShowThemeModal(true)}
      >
        <Settings size={24} color={theme.primary} />
      </TouchableOpacity>

      <Modal
        visible={showThemeModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setShowThemeModal(false)}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            style={[styles.modalContent, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Settings</Text>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <X size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <ThemeSelector />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
            <Image
              source={{ 
                uri: isDark 
                  ? 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/8fsprzney7p0h7gijxf1d' 
                  : 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/jtrp37buotuin5vioywa2'
              }}
              style={styles.logoImage}
              resizeMode="contain"
            />
            <Text style={[styles.tagline, { color: theme.textSecondary }]}>Grind Smarter. Not Harder</Text>
          </View>

          <View style={[styles.formContainer, { backgroundColor: theme.surface }, Shadows.large]}>
            <Text style={[styles.formTitle, { color: theme.text }]}>Welcome Back</Text>
            <Text style={[styles.formSubtitle, { color: theme.textSecondary }]}>Sign in to continue</Text>

            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={theme.textSecondary} />
              </View>
              <TextInput
                style={[styles.input, { color: theme.inputText }]}
                placeholder="Email"
                placeholderTextColor={theme.inputPlaceholder}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={[styles.inputContainer, { backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={theme.textSecondary} />
              </View>
              <TextInput
                style={[styles.input, { color: theme.inputText }]}
                placeholder="Password"
                placeholderTextColor={theme.inputPlaceholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
                activeOpacity={0.7}
              >
                {showPassword ? (
                  <EyeOff size={20} color={theme.textSecondary} />
                ) : (
                  <Eye size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, { borderColor: theme.border, backgroundColor: rememberMe ? theme.primary : theme.inputBackground }]}>
                {rememberMe && <Check size={14} color={theme.primaryText} />}
              </View>
              <Text style={[styles.rememberMeText, { color: theme.text }]}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, { backgroundColor: theme.primary }, isLoading && styles.disabledButton]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={[styles.loginButtonText, { color: theme.primaryText }]}>
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.requestButton, { borderColor: theme.primary }]}
              onPress={() => router.push('/(auth)/request-access')}
            >
              <Text style={[styles.requestButtonText, { color: theme.primary }]}>Request Access</Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
              <Text style={[styles.dividerText, { color: theme.textSecondary }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            </View>

            <TouchableOpacity
              style={[styles.guestButton, { backgroundColor: theme.background, borderColor: theme.border }]}
              onPress={handleGuestMode}
              disabled={isGuestLoading}
            >
              <Text style={[styles.guestButtonText, { color: theme.textSecondary }]}>
                {isGuestLoading ? 'Loading...' : 'Continue as Guest'}
              </Text>
            </TouchableOpacity>

            <Text style={[styles.guestInfoText, { color: theme.textSecondary }]}>
              Guest mode: Use calculators without an account. Data saved locally on your device.
            </Text>
            
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.debugButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  setEmail('dolevb@cgwheels.com');
                  setPassword('Do123456$');
                  setRememberMe(true);
                }}
              >
                <Text style={[styles.debugButtonText, { color: theme.textSecondary }]}>
                  Debug: Fill Admin Credentials
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoImage: {
    width: 200,
    height: 80,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  formContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  formSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    padding: 12,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: Colors.text,
    paddingRight: 12,
  },
  loginButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  disabledButton: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 12,
    color: Colors.textLight,
  },
  requestButton: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requestButtonText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: '600' as const,
  },

  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  guestButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  guestButtonText: {
    color: Colors.textSecondary,
    fontSize: 16,
    fontWeight: '500' as const,
  },
  guestInfoText: {
    textAlign: 'center',
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 8,
    marginBottom: 8,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rememberMeText: {
    fontSize: 14,
    color: Colors.text,
  },
  eyeIcon: {
    padding: 12,
  },
  debugButton: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginTop: 12,
  },
  debugButtonText: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '500' as const,
  },
});