import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '../theme/tokens';

type AppLoaderProps = {
  title: string;
  subtitle: string;
};

export function AppLoader({ title, subtitle }: AppLoaderProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <ActivityIndicator color={tokens.colors.accentStrong} size="large" />
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.md,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
  },
  safeArea: {
    backgroundColor: tokens.colors.background,
    flex: 1,
  },
  subtitle: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight,
    lineHeight: tokens.typography.body.lineHeight,
    maxWidth: 280,
    textAlign: 'center',
  },
  title: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.title.fontSize,
    fontWeight: tokens.typography.title.fontWeight,
    lineHeight: tokens.typography.title.lineHeight,
    textAlign: 'center',
  },
});
