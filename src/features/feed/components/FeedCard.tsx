import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import { AccessibilityInfo, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatCompactNumber } from '../../../shared/lib/format';
import { tokens } from '../../../shared/theme/tokens';
import { FeedCommentIcon, FeedLikeIcon } from '../../../shared/ui/FigmaIcons';
import { useTogglePostLike } from '../hooks/usePostActions';
import type { FeedPost } from '../model/feed.types';
import {
  PaidPostOverlay,
  PaidPostPlaceholder,
} from './PaidPostPlaceholder';

type FeedCardProps = {
  onOpenComments: (post: FeedPost) => void;
  post: FeedPost;
  sessionId: string;
};

export function FeedCard({ onOpenComments, post, sessionId }: FeedCardProps) {
  const isPaid = post.tier === 'paid';
  const previewText = post.preview.trim() || post.body.trim();
  const authorInitial = post.author.displayName.trim().charAt(0).toUpperCase() || 'A';
  const toggleLikeMutation = useTogglePostLike(sessionId);
  const [likeErrorMessage, setLikeErrorMessage] = useState<string | null>(null);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {post.author.avatarUrl ? (
          <Image
            accessible={false}
            contentFit="cover"
            source={post.author.avatarUrl}
            style={styles.avatar}
          />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarFallbackText}>{authorInitial}</Text>
          </View>
        )}

        <Text numberOfLines={1} style={styles.displayName}>
          {post.author.displayName}
        </Text>
      </View>

      <View style={styles.mediaWrap}>
        {post.coverUrl ? (
          <Image
            accessible={false}
            blurRadius={isPaid ? 10 : 0}
            contentFit="cover"
            source={post.coverUrl}
            style={styles.cover}
            transition={180}
          />
        ) : (
          <View style={styles.coverFallback}>
            <Text numberOfLines={2} style={styles.coverFallbackText}>
              {post.title}
            </Text>
          </View>
        )}

        {isPaid ? <PaidPostOverlay /> : null}
      </View>

      <View style={styles.content}>
        {isPaid ? (
          <PaidPostPlaceholder />
        ) : (
          <>
            <Text numberOfLines={2} style={styles.title}>
              {post.title}
            </Text>
            <Text numberOfLines={2} style={styles.preview}>
              {previewText}
            </Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <ActionPill
          accessibilityLabel={`${post.isLiked ? 'Убрать лайк' : 'Поставить лайк'}. Сейчас ${formatCompactNumber(post.likesCount)} лайков`}
          active={post.isLiked}
          accessibilitySelected={post.isLiked}
          icon={<FeedLikeIcon active={post.isLiked} />}
          isLoading={toggleLikeMutation.isPending}
          onPress={() => {
            if (toggleLikeMutation.isPending) {
              return;
            }

            setLikeErrorMessage(null);
            toggleLikeMutation.mutate(
              { postId: post.id },
              {
                onError: (error) => {
                  const message = error instanceof Error ? error.message : 'Не удалось обновить лайк';
                  setLikeErrorMessage(message);
                  AccessibilityInfo.announceForAccessibility(message);
                },
                onSuccess: () => {
                  setLikeErrorMessage(null);
                },
              },
            );
          }}
          value={formatCompactNumber(post.likesCount)}
        />
        <ActionPill
          accessibilityLabel={`Открыть комментарии. Сейчас ${formatCompactNumber(post.commentsCount)} комментариев`}
          icon={<FeedCommentIcon />}
          onPress={() => {
            onOpenComments(post);
          }}
          value={formatCompactNumber(post.commentsCount)}
        />
      </View>
      {likeErrorMessage ? <Text style={styles.likeErrorText}>{likeErrorMessage}</Text> : null}
    </View>
  );
}

type ActionPillProps = {
  active?: boolean;
  accessibilityLabel: string;
  accessibilitySelected?: boolean;
  icon: ReactNode;
  isLoading?: boolean;
  onPress: () => void;
  value: string;
};

function ActionPill({
  active = false,
  accessibilityLabel,
  accessibilitySelected = false,
  icon,
  isLoading = false,
  onPress,
  value,
}: ActionPillProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ busy: isLoading, selected: accessibilitySelected }}
      disabled={isLoading}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionPill,
        active ? styles.actionPillActive : null,
        pressed || isLoading ? styles.actionPillPressed : null,
      ]}
    >
      <View style={styles.actionIconWrap}>{icon}</View>
      <Text style={[styles.actionValue, active ? styles.actionValueActive : null]}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  actionIconWrap: {
    alignItems: 'center',
    height: 18,
    justifyContent: 'center',
    width: 18,
  },
  actionPill: {
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceMuted,
    borderRadius: tokens.radii.pill,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 94,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  actionPillActive: {
    backgroundColor: tokens.colors.likeActive,
  },
  actionPillPressed: {
    opacity: 0.82,
  },
  actionValue: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.caption.fontSize,
    fontWeight: '700',
    lineHeight: tokens.typography.caption.lineHeight,
  },
  actionValueActive: {
    color: tokens.colors.likeActiveText,
  },
  avatar: {
    borderRadius: tokens.radii.round,
    height: 40,
    width: 40,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceMuted,
    borderRadius: tokens.radii.round,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  avatarFallbackText: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: '700',
    lineHeight: tokens.typography.body.lineHeight,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.xl,
    overflow: 'hidden',
    paddingBottom: tokens.spacing.sm,
    paddingTop: tokens.spacing.sm,
    width: '100%',
  },
  content: {
    gap: 6,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: tokens.spacing.sm,
  },
  cover: {
    aspectRatio: 1,
    width: '100%',
  },
  coverFallback: {
    alignItems: 'center',
    aspectRatio: 1,
    backgroundColor: tokens.colors.surfaceMuted,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.xl,
    width: '100%',
  },
  coverFallbackText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.title.fontSize,
    fontWeight: tokens.typography.title.fontWeight,
    lineHeight: tokens.typography.title.lineHeight,
    textAlign: 'center',
  },
  displayName: {
    color: tokens.colors.textStrong,
    flex: 1,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: '700',
    lineHeight: tokens.typography.body.lineHeight,
  },
  footer: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: 10,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: tokens.spacing.md,
  },
  likeErrorText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
    paddingHorizontal: tokens.spacing.md,
    paddingTop: 8,
  },
  mediaWrap: {
    marginTop: tokens.spacing.sm,
    position: 'relative',
  },
  preview: {
    color: tokens.colors.text,
    fontFamily: tokens.fonts.manrope,
    flexShrink: 1,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight,
    lineHeight: tokens.typography.body.lineHeight,
    maxWidth: '100%',
    overflow: 'hidden',
    width: '100%',
  },
  title: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    flexShrink: 1,
    fontSize: tokens.typography.title.fontSize,
    fontWeight: tokens.typography.title.fontWeight,
    lineHeight: tokens.typography.title.lineHeight,
    maxWidth: '100%',
    width: '100%',
  },
});
