import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { tokens } from '../../../shared/theme/tokens';
import { DonateIcon } from '../../../shared/ui/FigmaIcons';

export const PAID_POST_PLACEHOLDER_TITLE =
  'Контент скрыт пользователем. Доступ откроется после доната';
export const PAID_POST_PLACEHOLDER_ACTION = 'Отправить донат';

export function PaidPostOverlay() {
  return (
    <View style={styles.overlay}>
      <View style={styles.messageBlock}>
        <View style={styles.iconWrap}>
          <DonateIcon />
        </View>

        <Text style={styles.overlayTitle}>{PAID_POST_PLACEHOLDER_TITLE}</Text>
      </View>

      <Pressable
        accessibilityLabel={PAID_POST_PLACEHOLDER_ACTION}
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
        disabled
        hitSlop={8}
        style={styles.buttonShell}
      >
        <LinearGradient
          colors={['#8D2BFF', tokens.colors.accentStrong]}
          end={{ x: 1, y: 0.5 }}
          start={{ x: 0, y: 0.5 }}
          style={styles.button}
        >
          <Text style={styles.buttonLabel}>{PAID_POST_PLACEHOLDER_ACTION}</Text>
        </LinearGradient>
      </Pressable>
    </View>
  );
}

export function PaidPostPlaceholder() {
  return (
    <View style={styles.placeholder}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonText} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: tokens.radii.button,
    height: 36,
    justifyContent: 'center',
    width: '100%',
  },
  buttonShell: {
    borderRadius: tokens.radii.button,
    width: 206,
  },
  buttonLabel: {
    color: tokens.colors.white,
    fontFamily: tokens.fonts.manrope,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: tokens.colors.accentStrong,
    borderRadius: 9,
    height: 28,
    justifyContent: 'center',
    width: 28,
  },
  messageBlock: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: tokens.spacing.lg,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: tokens.colors.lockedOverlay,
    gap: 10,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  overlayTitle: {
    color: tokens.colors.lockedTextSoft,
    fontFamily: tokens.fonts.manrope,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    textAlign: 'center',
  },
  placeholder: {
    gap: 10,
    paddingTop: tokens.spacing.xs,
  },
  skeletonText: {
    backgroundColor: tokens.colors.lockedSkeleton,
    borderRadius: 22,
    height: 30,
    width: '100%',
  },
  skeletonTitle: {
    backgroundColor: tokens.colors.lockedSkeleton,
    borderRadius: 22,
    height: 22,
    width: 132,
  },
});
