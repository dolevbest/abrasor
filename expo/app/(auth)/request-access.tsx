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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Mail, Lock, User, ArrowLeft, Building, MapPin, Briefcase, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { useAuth } from '@/hooks/auth-context';
import { UnitSystem } from '@/types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function RequestAccessScreen() {
  const { requestAccess } = useAuth();
  // Personal Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // Password
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  // Additional Info
  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [country, setCountry] = useState('');
  const [preferredUnits, setPreferredUnits] = useState<UnitSystem>('metric');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  // Email validation states
  const [emailValidation, setEmailValidation] = useState<{
    isValid: boolean;
    exists: boolean;
    isChecking: boolean;
    message: string;
  }>({ isValid: false, exists: false, isChecking: false, message: '' });

  // Password validation
  const getPasswordStrength = () => {
    if (password.length === 0) return { strength: 0, label: '', color: Colors.textLight };
    
    let score = 0;
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      number: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    
    score = Object.values(checks).filter(Boolean).length;
    
    if (score < 2) return { strength: 1, label: 'Weak', color: '#ef4444' };
    if (score < 4) return { strength: 2, label: 'Fair', color: '#f59e0b' };
    if (score < 5) return { strength: 3, label: 'Good', color: '#10b981' };
    return { strength: 4, label: 'Strong', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength();
  const passwordsMatch = password === confirmPassword && password.length > 0;

  // Email validation function
  const validateEmail = (emailValue: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailValue);
  };

  // Check if email exists in system
  const checkEmailExists = async (emailValue: string) => {
    if (!validateEmail(emailValue)) {
      setEmailValidation({ isValid: false, exists: false, isChecking: false, message: 'Invalid email format' });
      return;
    }

    setEmailValidation(prev => ({ ...prev, isChecking: true, message: 'Checking email...' }));

    try {
      // Check pending requests
      const existingRequests = await AsyncStorage.getItem('pendingRequests');
      const requests = existingRequests ? JSON.parse(existingRequests) : [];
      const pendingRequest = requests.find((req: any) => req.email === emailValue);

      // Check approved users
      const existingUsers = await AsyncStorage.getItem('approvedUsers');
      const users = existingUsers ? JSON.parse(existingUsers) : [];
      const approvedUser = users.find((user: any) => user.email === emailValue);

      if (pendingRequest) {
        setEmailValidation({
          isValid: true,
          exists: true,
          isChecking: false,
          message: 'Email already has a pending request'
        });
      } else if (approvedUser) {
        setEmailValidation({
          isValid: true,
          exists: true,
          isChecking: false,
          message: 'Email already registered in system'
        });
      } else {
        setEmailValidation({
          isValid: true,
          exists: false,
          isChecking: false,
          message: 'Email is available'
        });
      }
    } catch (error) {
      console.error('Error checking email:', error);
      setEmailValidation({
        isValid: true,
        exists: false,
        isChecking: false,
        message: 'Unable to verify email'
      });
    }
  };

  // Debounced email checking
  useEffect(() => {
    if (email.length === 0) {
      setEmailValidation({ isValid: false, exists: false, isChecking: false, message: '' });
      return;
    }

    const timeoutId = setTimeout(() => {
      checkEmailExists(email);
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [email]);

  const handleRequestAccess = async () => {
    // Validate required fields
    if (!name || !email || !password || !confirmPassword || !company || !position || !country) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    // Validate email format and availability
    if (!emailValidation.isValid) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    if (emailValidation.exists) {
      Alert.alert('Error', 'This email is already in use or has a pending request');
      return;
    }

    // Validate password
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long');
      return;
    }

    if (passwordStrength.strength < 2) {
      Alert.alert('Error', 'Password is too weak. Please use a stronger password.');
      return;
    }

    setIsLoading(true);
    try {
      await requestAccess({
        email,
        name,
        password,
        company,
        position,
        country,
        preferredUnits,
      });
      Alert.alert(
        'Request Submitted Successfully! 📧',
        'Your access request has been submitted and confirmation emails have been sent to both you and our administrators.\n\n✅ Confirmation email sent from noreplay.abrasor@gmail.com to your inbox\n✅ Admin notification sent to admin@abrasor.com\n\nYou will receive another email once your request is reviewed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit request. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={Colors.primary} />
            <Text style={styles.backText}>Back to Login</Text>
          </TouchableOpacity>

          <View style={[styles.formContainer, Shadows.large]}>
            <Text style={styles.formTitle}>Request Access</Text>
            <Text style={styles.formSubtitle}>
              Fill in your details to request access to Abrasor
            </Text>

            {/* Personal Information Section */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Personal Information</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <User size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Full Name *"
                placeholderTextColor={Colors.textLight}
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
              />
            </View>

            <View style={[
              styles.inputContainer,
              emailValidation.isValid && !emailValidation.exists && styles.inputSuccess,
              emailValidation.exists && styles.inputError
            ]}>
              <View style={styles.inputIcon}>
                <Mail size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email Address *"
                placeholderTextColor={Colors.textLight}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {email.length > 0 && (
                <View style={styles.emailValidationIcon}>
                  {emailValidation.isChecking ? (
                    <AlertCircle size={20} color={Colors.textLight} />
                  ) : emailValidation.isValid && !emailValidation.exists ? (
                    <CheckCircle size={20} color="#10b981" />
                  ) : emailValidation.exists ? (
                    <XCircle size={20} color="#ef4444" />
                  ) : emailValidation.isValid === false ? (
                    <XCircle size={20} color="#ef4444" />
                  ) : null}
                </View>
              )}
            </View>

            {email.length > 0 && emailValidation.message && (
              <View style={styles.emailValidationMessage}>
                <Text style={[
                  styles.validationText,
                  emailValidation.exists ? styles.errorText : 
                  emailValidation.isValid && !emailValidation.exists ? styles.successText : 
                  styles.errorText
                ]}>
                  {emailValidation.message}
                </Text>
              </View>
            )}

            {/* Password Section */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Password</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Password *"
                placeholderTextColor={Colors.textLight}
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
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {password.length > 0 && (
              <View style={styles.passwordValidation}>
                <View style={styles.strengthBar}>
                  <View style={[styles.strengthIndicator, { width: `${(passwordStrength.strength / 4) * 100}%`, backgroundColor: passwordStrength.color }]} />
                </View>
                <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.label}
                </Text>
              </View>
            )}

            <View style={styles.passwordRules}>
              <Text style={styles.rulesTitle}>Password Requirements:</Text>
              <Text style={[styles.ruleText, password.length >= 8 && styles.ruleValid]}>• At least 8 characters</Text>
              <Text style={[styles.ruleText, /[a-z]/.test(password) && styles.ruleValid]}>• One lowercase letter</Text>
              <Text style={[styles.ruleText, /[A-Z]/.test(password) && styles.ruleValid]}>• One uppercase letter</Text>
              <Text style={[styles.ruleText, /\d/.test(password) && styles.ruleValid]}>• One number</Text>
              <Text style={[styles.ruleText, /[!@#$%^&*(),.?":{}|<>]/.test(password) && styles.ruleValid]}>• One special character</Text>
            </View>

            <View style={[styles.inputContainer, !passwordsMatch && confirmPassword.length > 0 && styles.inputError]}>
              <View style={styles.inputIcon}>
                <Lock size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Confirm Password *"
                placeholderTextColor={Colors.textLight}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                activeOpacity={0.7}
              >
                {showConfirmPassword ? (
                  <EyeOff size={20} color={Colors.textSecondary} />
                ) : (
                  <Eye size={20} color={Colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {confirmPassword.length > 0 && !passwordsMatch && (
              <Text style={styles.errorText}>Passwords do not match</Text>
            )}

            {/* Additional Information Section */}
            <View style={styles.sectionDivider}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Building size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Company *"
                placeholderTextColor={Colors.textLight}
                value={company}
                onChangeText={setCompany}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Briefcase size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Position in Company *"
                placeholderTextColor={Colors.textLight}
                value={position}
                onChangeText={setPosition}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <MapPin size={20} color={Colors.textSecondary} />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Country *"
                placeholderTextColor={Colors.textLight}
                value={country}
                onChangeText={setCountry}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.unitsContainer}>
              <Text style={styles.unitsLabel}>Preferred Units</Text>
              <View style={styles.unitsToggle}>
                <TouchableOpacity
                  style={[styles.unitButton, preferredUnits === 'metric' && styles.unitButtonActive]}
                  onPress={() => setPreferredUnits('metric')}
                >
                  <Text style={[styles.unitButtonText, preferredUnits === 'metric' && styles.unitButtonTextActive]}>
                    Metric
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.unitButton, preferredUnits === 'imperial' && styles.unitButtonActive]}
                  onPress={() => setPreferredUnits('imperial')}
                >
                  <Text style={[styles.unitButtonText, preferredUnits === 'imperial' && styles.unitButtonTextActive]}>
                    Imperial
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.disabledButton]}
              onPress={handleRequestAccess}
              disabled={isLoading}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>

            <Text style={styles.requiredText}>* Required fields</Text>
            
            <Text style={styles.infoText}>
              Your request will be reviewed by an administrator. 
              You&apos;ll receive an email notification once approved.
            </Text>
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
    padding: 20,
    paddingTop: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backText: {
    fontSize: 16,
    color: Colors.primary,
    marginLeft: 8,
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
    lineHeight: 20,
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
  submitButton: {
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
  submitButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: '600' as const,
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 16,
    lineHeight: 18,
  },
  sectionDivider: {
    marginTop: 24,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  passwordValidation: {
    marginBottom: 12,
  },
  strengthBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    marginBottom: 4,
  },
  strengthIndicator: {
    height: '100%',
    borderRadius: 2,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  passwordRules: {
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  ruleText: {
    fontSize: 11,
    color: Colors.textLight,
    lineHeight: 16,
  },
  ruleValid: {
    color: '#10b981',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 12,
  },
  unitsContainer: {
    marginBottom: 16,
  },
  unitsLabel: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  unitsToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 2,
  },
  unitButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  unitButtonActive: {
    backgroundColor: Colors.primary,
  },
  unitButtonText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  unitButtonTextActive: {
    color: Colors.surface,
  },
  requiredText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 8,
    marginBottom: 8,
  },
  inputSuccess: {
    borderColor: '#10b981',
  },
  emailValidationIcon: {
    paddingRight: 12,
  },
  emailValidationMessage: {
    marginTop: -12,
    marginBottom: 16,
    marginLeft: 12,
  },
  validationText: {
    fontSize: 12,
  },
  successText: {
    color: '#10b981',
  },
  eyeIcon: {
    padding: 12,
  },
});