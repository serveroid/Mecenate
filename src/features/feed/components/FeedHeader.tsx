import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { tokens } from '../../../shared/theme/tokens';

export function FeedHeader() {
  return (
    <LinearGradient
      colors={[tokens.colors.accentStrongMuted, tokens.colors.background]}
      end={{ x: 1, y: 0.85 }}
      start={{ x: 0, y: 0 }}
      style={styles.container}
    >
      <View style={styles.pill}>
        <Text style={styles.pillText}>Mecenate Feed</Text>
      </View>

      <Text style={styles.title}>Лента подписок</Text>
      <Text style={styles.subtitle}>
        Свежие публикации авторов, на которых пользователь уже подписан.
      </Text>

      <View style={styles.metaRow}>
        <View style={styles.metaBadge}>
          <Text style={styles.metaText}>Курсорная пагинация</Text>
        </View>
        <View style={styles.metaBadge}>
          <Text style={styles.metaText}>Pull to refresh</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: tokens.radii.xl,
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.xl,
    overflow: 'hidden',
    padding: tokens.spacing.xl,
  },
  metaBadge: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  metaText: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.caption.fontSize,
    fontWeight: tokens.typography.caption.fontWeight,
    lineHeight: tokens.typography.caption.lineHeight,
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.82)',
    borderRadius: tokens.radii.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.xs,
  },
  pillText: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight,
    lineHeight: tokens.typography.body.lineHeight,
    maxWidth: 280,
  },
  title: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.display.fontSize,
    fontWeight: tokens.typography.display.fontWeight,
    letterSpacing: tokens.typography.display.letterSpacing,
    lineHeight: tokens.typography.display.lineHeight,
    maxWidth: 280,
  },
});
