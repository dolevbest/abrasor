import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import {
  Eye,
  Type,
  Palette,
  Check,
} from 'lucide-react-native';
import { useTheme } from '@/hooks/theme-context';
import { ColorblindMode, FontSize } from '@/types';
import { Shadows } from '@/constants/colors';

interface AccessibilitySettingsProps {
  onClose: () => void;
}

export default function AccessibilitySettings({ onClose }: AccessibilitySettingsProps) {
  const { theme, colorblindMode, fontSize, setColorblindMode, setFontSize } = useTheme();

  const colorblindOptions: { value: ColorblindMode; label: string; description: string }[] = [
    { value: 'none', label: 'Normal Vision', description: 'Standard color scheme' },
    { value: 'protanopia', label: 'Protanopia', description: 'Red-blind friendly colors' },
    { value: 'deuteranopia', label: 'Deuteranopia', description: 'Green-blind friendly colors' },
    { value: 'tritanopia', label: 'Tritanopia', description: 'Blue-blind friendly colors' },
  ];

  const fontSizeOptions: { value: FontSize; label: string; description: string }[] = [
    { value: 'small', label: 'Small', description: 'Compact text size' },
    { value: 'medium', label: 'Medium', description: 'Standard text size' },
    { value: 'large', label: 'Large', description: 'Larger text for better readability' },
    { value: 'extra-large', label: 'Extra Large', description: 'Maximum text size' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.modalOverlay }]}>
      <View style={[styles.modal, { backgroundColor: theme.modalBackground }, Shadows.large]}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <Text style={[styles.title, { color: theme.text, fontSize: theme.fontSizes.title }]}>
            Accessibility Settings
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: theme.primary }]}>Done</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Colorblind Mode Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Eye size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: theme.fontSizes.subtitle }]}>
                Colorblind Support
              </Text>
            </View>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary, fontSize: theme.fontSizes.small }]}>
              Choose a color scheme optimized for different types of color vision
            </Text>
            
            {colorblindOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  colorblindMode === option.value && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                ]}
                onPress={() => setColorblindMode(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionLabel, { color: theme.text, fontSize: theme.fontSizes.medium }]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.textSecondary, fontSize: theme.fontSizes.small }]}>
                    {option.description}
                  </Text>
                </View>
                {colorblindMode === option.value && (
                  <Check size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Font Size Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Type size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: theme.fontSizes.subtitle }]}>
                Text Size
              </Text>
            </View>
            <Text style={[styles.sectionDescription, { color: theme.textSecondary, fontSize: theme.fontSizes.small }]}>
              Adjust text size for better readability
            </Text>
            
            {fontSizeOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.option,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                  fontSize === option.value && { borderColor: theme.primary, backgroundColor: theme.primary + '10' }
                ]}
                onPress={() => setFontSize(option.value)}
              >
                <View style={styles.optionContent}>
                  <Text style={[
                    styles.optionLabel, 
                    { color: theme.text },
                    { fontSize: option.value === 'small' ? 14 : option.value === 'medium' ? 16 : option.value === 'large' ? 18 : 20 }
                  ]}>
                    {option.label}
                  </Text>
                  <Text style={[styles.optionDescription, { color: theme.textSecondary, fontSize: theme.fontSizes.small }]}>
                    {option.description}
                  </Text>
                </View>
                {fontSize === option.value && (
                  <Check size={20} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>

          {/* Preview Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Palette size={20} color={theme.primary} />
              <Text style={[styles.sectionTitle, { color: theme.text, fontSize: theme.fontSizes.subtitle }]}>
                Preview
              </Text>
            </View>
            
            <View style={[styles.previewCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.previewTitle, { color: theme.text, fontSize: theme.fontSizes.large }]}>
                Sample Text
              </Text>
              <Text style={[styles.previewText, { color: theme.textSecondary, fontSize: theme.fontSizes.medium }]}>
                This is how text will appear with your current settings.
              </Text>
              
              <View style={styles.colorPreview}>
                <View style={[styles.colorSwatch, { backgroundColor: theme.primary }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.success }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.warning }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.error }]} />
                <View style={[styles.colorSwatch, { backgroundColor: theme.info }]} />
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontWeight: '600' as const,
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  content: {
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600' as const,
  },
  sectionDescription: {
    marginBottom: 16,
    lineHeight: 18,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  optionContent: {
    flex: 1,
  },
  optionLabel: {
    fontWeight: '500' as const,
    marginBottom: 2,
  },
  optionDescription: {
    lineHeight: 16,
  },
  previewCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  previewTitle: {
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  previewText: {
    lineHeight: 20,
    marginBottom: 16,
  },
  colorPreview: {
    flexDirection: 'row',
    gap: 8,
  },
  colorSwatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});