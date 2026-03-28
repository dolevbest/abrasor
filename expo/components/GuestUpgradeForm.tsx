import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { X, User, Mail, Lock, Building, Globe } from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { useSettings } from '@/hooks/settings-context';
import { trpcClient } from '@/lib/trpc';
import { useGuest } from '@/hooks/guest-context';

interface GuestUpgradeFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function GuestUpgradeForm({ onClose, onSuccess }: GuestUpgradeFormProps) {
  const { theme } = useTheme();
  const { unitSystem } = useSettings();
  const { sessionId } = useGuest();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    company: '',
    position: '',
    country: '',
  });

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim() || 
        !formData.company.trim() || !formData.position.trim() || !formData.country.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      await trpcClient.auth.upgradeGuest.mutate({
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        company: formData.company.trim(),
        position: formData.position.trim(),
        country: formData.country.trim(),
        preferredUnits: unitSystem,
        sessionId: sessionId || undefined,
      });

      Alert.alert(
        'Success',
        'Your account upgrade request has been submitted successfully! You will receive an email confirmation shortly.',
        [{ text: 'OK', onPress: onSuccess }]
      );
    } catch (error: any) {
      console.error('Upgrade error:', error);
      Alert.alert('Error', error.message || 'Failed to submit upgrade request');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
      <View style={[styles.container, { backgroundColor: theme.surface }]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text, fontSize: theme.fontSizes.title }]}>
            Upgrade to Full Account
          </Text>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={[styles.description, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>
            Create a full account to unlock unlimited calculations and save your work.
          </Text>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                Full Name *
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <User size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontSize: theme.fontSizes.medium }]}
                  placeholder="Enter your full name"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                Email Address *
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Mail size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontSize: theme.fontSizes.medium }]}
                  placeholder="Enter your email address"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={formData.email}
                  onChangeText={(text) => setFormData({ ...formData, email: text })}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                Password *
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Lock size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontSize: theme.fontSizes.medium }]}
                  placeholder="Create a password (min 6 characters)"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={formData.password}
                  onChangeText={(text) => setFormData({ ...formData, password: text })}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                Company *
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Building size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontSize: theme.fontSizes.medium }]}
                  placeholder="Enter your company name"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={formData.company}
                  onChangeText={(text) => setFormData({ ...formData, company: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                Position *
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <User size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontSize: theme.fontSizes.medium }]}
                  placeholder="Enter your job title/position"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={formData.position}
                  onChangeText={(text) => setFormData({ ...formData, position: text })}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                Country *
              </Text>
              <View style={[styles.inputContainer, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Globe size={20} color={theme.textSecondary} />
                <TextInput
                  style={[styles.input, { color: theme.text, fontSize: theme.fontSizes.medium }]}
                  placeholder="Enter your country"
                  placeholderTextColor={theme.inputPlaceholder}
                  value={formData.country}
                  onChangeText={(text) => setFormData({ ...formData, country: text })}
                />
              </View>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={[styles.infoText, { color: theme.textSecondary, fontSize: theme.fontSizes.small }]}>
              Your request will be reviewed by our administrators. You&apos;ll receive an email confirmation once approved.
            </Text>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.cancelButton, { borderColor: theme.border }]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={[styles.cancelButtonText, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary }]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.primaryText} />
            ) : (
              <Text style={[styles.submitButtonText, { color: theme.primaryText, fontSize: theme.fontSizes.medium }]}>
                Submit Request
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
    paddingHorizontal: 20,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '600' as const,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  description: {
    paddingVertical: 16,
    textAlign: 'center' as const,
    lineHeight: 20,
  },
  form: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontWeight: '500' as const,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    gap: 12,
  },
  input: {
    flex: 1,
  },
  infoBox: {
    marginTop: 20,
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  infoText: {
    textAlign: 'center' as const,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontWeight: '500' as const,
  },
  submitButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonText: {
    fontWeight: '600' as const,
  },
});