import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/theme-context';

interface AbrasorLogoProps {
  size?: number;
}

export default function AbrasorLogo({ size = 32 }: AbrasorLogoProps) {
  const { isDark } = useTheme();

  const logoSource = isDark 
    ? 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/a899a5rt2bkx834lkiho0' // White logo for dark mode
    : 'https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/3jlba64ro2mqst013lfa9'; // Black logo for bright mode

  return (
    <View style={[styles.container, { width: size * 4, height: size }]}>
      <Image 
        source={{ uri: logoSource }}
        style={[styles.logo, { width: size * 4, height: size }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    // Image styles handled by props
  },
});