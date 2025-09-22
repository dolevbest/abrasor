import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { 
  User, 
  Mail, 
  Shield, 
  Globe, 
  LogOut,
  Save,
  Edit2,
  Calculator,
  ChevronRight,
  AlertCircle,
  UserPlus,
  Settings,
  Building,
  Briefcase,
  MapPin,
  Camera
} from 'lucide-react-native';
import { Colors, Shadows } from '@/constants/colors';
import { useAuth } from '@/hooks/auth-context';
import { useSettings } from '@/hooks/settings-context';
import { useCalculations } from '@/hooks/calculations-context';
import { useTheme } from '@/hooks/theme-context';
import { router } from 'expo-router';
import AccessibilitySettings from '@/components/AccessibilitySettings';
import * as ImagePicker from 'expo-image-picker';
import { trpc } from '@/lib/trpc';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const { user, logout, updateProfile, isGuest, upgradeFromGuest } = useAuth();
  const { unitSystem } = useSettings();
  const { savedCalculations } = useCalculations();
  const { theme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [showAccessibilitySettings, setShowAccessibilitySettings] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [company, setCompany] = useState(user?.company || '');
  const [position, setPosition] = useState(user?.position || '');
  const [country, setCountry] = useState(user?.country || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || null);
  
  // Test tRPC backend
  const hiMutation = trpc.example.hi.useMutation();

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setCompany(user.company || '');
      setPosition(user.position || '');
      setCountry(user.country || '');
      setProfileImage(user.profileImage || null);
    }
  }, [user]);

  const handleSave = async () => {
    if (!name || !email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    await updateProfile({ 
      name, 
      email, 
      company: company || undefined,
      position: position || undefined,
      country: country || undefined,
      profileImage: profileImage || undefined
    });
    setIsEditing(false);
    Alert.alert('Success', 'Profile updated successfully');
  };

  const handleLogout = () => {
    Alert.alert(
      isGuest ? 'Exit Guest Mode' : 'Logout',
      isGuest ? 'Are you sure you want to exit guest mode? Your local data will be preserved.' : 'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: isGuest ? 'Exit' : 'Logout', 
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to select a profile picture.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);
      await updateProfile({ profileImage: imageUri });
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera permissions to take a profile picture.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      const imageUri = result.assets[0].uri;
      setProfileImage(imageUri);
      await updateProfile({ profileImage: imageUri });
    }
  };

  const showImageOptions = () => {
    const buttons: any[] = [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
    ];
    
    if (profileImage) {
      buttons.push({ 
        text: 'Remove Photo', 
        style: 'destructive',
        onPress: async () => {
          setProfileImage(null);
          await updateProfile({ profileImage: null });
        }
      });
    }
    
    Alert.alert(
      'Change Profile Picture',
      'Choose how you want to update your profile picture',
      buttons
    );
  };

  const handleCreateAccount = () => {
    Alert.alert(
      'Create Account',
      'Create an account to sync your data across devices and access premium features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create Account', 
          onPress: () => {
            upgradeFromGuest();
            router.push('/(auth)/request-access');
          }
        }
      ]
    );
  };
  
  const testBackend = async () => {
    try {
      const result = await hiMutation.mutateAsync({ name: 'Test User' });
      Alert.alert('Backend Test', `Success! Response: ${result.hello} at ${result.date}`);
    } catch (error) {
      Alert.alert('Backend Test', `Error: ${error}`);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    if (isGuest) return theme.warning;
    switch (role) {
      case 'admin':
        return Colors.error;
      case 'premium':
        return Colors.secondary;
      default:
        return Colors.info;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.medium]}>
            <View style={styles.avatarContainer}>
              <TouchableOpacity onPress={showImageOptions} style={styles.avatarTouchable}>
                <View style={[styles.avatar, { backgroundColor: profileImage ? 'transparent' : theme.primary }]}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.profileImage} />
                  ) : (
                    <User size={40} color={theme.primaryText} />
                  )}
                </View>
                <View style={[styles.editImageButton, { backgroundColor: theme.primary }]}>
                  <Camera size={16} color={theme.primaryText} />
                </View>
              </TouchableOpacity>
              <View style={styles.roleBadge}>
                <Text style={[
                  styles.roleBadgeText,
                  { backgroundColor: getRoleBadgeColor(user?.role || 'starter') }
                ]}>
                  {isGuest ? 'GUEST' : user?.role?.toUpperCase()}
                </Text>
              </View>
              
              {isGuest && (
                <View style={[styles.guestNotice, { backgroundColor: theme.warning + '10', borderColor: theme.warning + '30' }]}>
                  <AlertCircle size={16} color={theme.warning} />
                  <Text style={[styles.guestNoticeText, { color: theme.warning }]}>
                    Guest mode: Data saved locally only
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Personal Information</Text>
                {!isEditing && (
                  <TouchableOpacity onPress={() => setIsEditing(true)}>
                    <Edit2 size={20} color={theme.primary} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <User size={18} color={theme.textSecondary} />
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Full Name"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                ) : (
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>
                      {isGuest ? 'Guest User' : user?.name}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Mail size={18} color={theme.textSecondary} />
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Email"
                    placeholderTextColor={theme.inputPlaceholder}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                ) : (
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>
                      {isGuest ? 'guest@local.device' : user?.email}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Building size={18} color={theme.textSecondary} />
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText }]}
                    value={company}
                    onChangeText={setCompany}
                    placeholder="Company"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                ) : (
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Company</Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>
                      {isGuest ? 'Not specified' : (user?.company || 'Not specified')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <Briefcase size={18} color={theme.textSecondary} />
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText }]}
                    value={position}
                    onChangeText={setPosition}
                    placeholder="Position"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                ) : (
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Position</Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>
                      {isGuest ? 'Not specified' : (user?.position || 'Not specified')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.field}>
                <View style={styles.fieldIcon}>
                  <MapPin size={18} color={theme.textSecondary} />
                </View>
                {isEditing ? (
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.inputBackground, color: theme.inputText }]}
                    value={country}
                    onChangeText={setCountry}
                    placeholder="Country"
                    placeholderTextColor={theme.inputPlaceholder}
                  />
                ) : (
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Country</Text>
                    <Text style={[styles.fieldValue, { color: theme.text }]}>
                      {isGuest ? 'Not specified' : (user?.country || 'Not specified')}
                    </Text>
                  </View>
                )}
              </View>

              {isEditing && (
                <View style={styles.editActions}>
                  <TouchableOpacity 
                    style={[styles.cancelButton, { borderColor: theme.border }]}
                    onPress={() => {
                      setIsEditing(false);
                      setName(user?.name || '');
                      setEmail(user?.email || '');
                      setCompany(user?.company || '');
                      setPosition(user?.position || '');
                      setCountry(user?.country || '');
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.saveButton, { backgroundColor: theme.primary }]}
                    onPress={handleSave}
                  >
                    <Save size={18} color={theme.primaryText} />
                    <Text style={[styles.saveButtonText, { color: theme.primaryText }]}>Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: theme.surface }, Shadows.medium]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Preferences</Text>
            
            <View style={styles.field}>
              <View style={styles.fieldIcon}>
                <Globe size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Unit System</Text>
                <Text style={[styles.fieldValue, { color: theme.text }]}>
                  {unitSystem === 'metric' ? 'Metric' : 'Imperial'}
                  {isGuest && <Text style={[styles.guestLabel, { color: theme.warning }]}> (Local)</Text>}
                </Text>
              </View>
            </View>

            <View style={styles.field}>
              <View style={styles.fieldIcon}>
                <Shield size={18} color={theme.textSecondary} />
              </View>
              <View style={styles.fieldContent}>
                <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Account Status</Text>
                <Text style={[styles.fieldValue, { color: isGuest ? theme.warning : Colors.success }]}>
                  {isGuest ? 'Guest Mode' : (user?.status === 'approved' ? 'Active' : 'Pending')}
                </Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.surface }, Shadows.medium, styles.actionCard]}
            onPress={() => router.push('/saved-calculations')}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionCardLeft}>
                <Calculator size={24} color={theme.primary} />
                <View style={styles.actionCardText}>
                  <Text style={[styles.actionCardTitle, { color: theme.text }]}>Saved Calculations</Text>
                  <Text style={[styles.actionCardSubtitle, { color: theme.textSecondary }]}>
                    {savedCalculations.length} calculation{savedCalculations.length !== 1 ? 's' : ''} saved
                    {isGuest && ' (local)'}
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.surface }, Shadows.medium, styles.actionCard]}
            onPress={() => setShowAccessibilitySettings(true)}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionCardLeft}>
                <Settings size={24} color={theme.primary} />
                <View style={styles.actionCardText}>
                  <Text style={[styles.actionCardTitle, { color: theme.text }]}>Accessibility</Text>
                  <Text style={[styles.actionCardSubtitle, { color: theme.textSecondary }]}>
                    Colorblind support & font size settings
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.surface }, Shadows.medium, styles.actionCard]}
            onPress={testBackend}
          >
            <View style={styles.actionCardContent}>
              <View style={styles.actionCardLeft}>
                <Settings size={24} color={theme.primary} />
                <View style={styles.actionCardText}>
                  <Text style={[styles.actionCardTitle, { color: theme.text }]}>Test Backend</Text>
                  <Text style={[styles.actionCardSubtitle, { color: theme.textSecondary }]}>
                    Test tRPC connection
                  </Text>
                </View>
              </View>
              <ChevronRight size={20} color={theme.textSecondary} />
            </View>
          </TouchableOpacity>

          {isGuest && (
            <TouchableOpacity 
              style={[styles.createAccountButton, { backgroundColor: theme.success }]}
              onPress={handleCreateAccount}
            >
              <UserPlus size={20} color={theme.surface} />
              <Text style={[styles.createAccountText, { color: theme.surface }]}>Create Account</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.logoutButton, { backgroundColor: theme.surface }]}
            onPress={handleLogout}
          >
            <LogOut size={20} color={Colors.error} />
            <Text style={styles.logoutText}>
              {isGuest ? 'Exit Guest Mode' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showAccessibilitySettings && (
          <AccessibilitySettings onClose={() => setShowAccessibilitySettings(false)} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarTouchable: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  editImageButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  roleBadge: {
    marginTop: 12,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  section: {
    marginBottom: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  fieldIcon: {
    marginRight: 12,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 16,
    color: Colors.text,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    padding: 8,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelButtonText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500' as const,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 8,
  },
  saveButtonText: {
    fontSize: 14,
    color: Colors.surface,
    fontWeight: '600' as const,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    ...Shadows.small,
  },
  logoutText: {
    fontSize: 16,
    color: Colors.error,
    fontWeight: '600' as const,
  },
  actionCard: {
    padding: 0,
  },
  actionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
  },
  actionCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionCardText: {
    gap: 2,
  },
  actionCardTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  actionCardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  guestNoticeText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500' as const,
  },
  guestLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    marginBottom: 12,
    ...Shadows.small,
  },
  createAccountText: {
    fontSize: 16,
    color: Colors.surface,
    fontWeight: '600' as const,
  },
});