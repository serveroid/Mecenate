import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { tokens } from '../theme/tokens';

type ErrorStateProps = {
  title: string;
  description?: string;
  actionLabel: string;
  onAction: () => void;
  illustration?: number;
};

export function ErrorState({
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}: ErrorStateProps) {
  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.card}>
          {illustration ? (
            <Image contentFit="contain" source={illustration} style={styles.illustration} />
          ) : null}
          <Text style={styles.title}>{title}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}

          <Pressable
            accessibilityRole="button"
            onPress={onAction}
            style={({ pressed }) => [styles.button, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.buttonLabel}>{actionLabel}</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: tokens.colors.accentStrong,
    borderRadius: tokens.radii.button,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 32,
    width: '100%',
  },
  buttonLabel: {
    color: tokens.colors.white,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: '600',
    lineHeight: 26,
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.xl,
    gap: tokens.spacing.lg,
    paddingBottom: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    width: '100%',
  },
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight,
    lineHeight: tokens.typography.body.lineHeight,
    textAlign: 'center',
  },
  illustration: {
    alignSelf: 'center',
    height: 112,
    width: 112,
  },
  safeArea: {
    backgroundColor: tokens.colors.background,
    flex: 1,
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
