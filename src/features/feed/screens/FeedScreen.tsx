import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { figmaAssets } from '../../../shared/assets/figmaAssets';
import { tokens } from '../../../shared/theme/tokens';
import { ErrorState } from '../../../shared/ui/ErrorState';
import { FeedCard } from '../components/FeedCard';
import { PostCommentsModal } from '../components/PostCommentsModal';
import { refreshFeedFromStart, useFeedQuery } from '../hooks/useFeedQuery';
import type { FeedPost } from '../model/feed.types';

type FeedScreenProps = {
  sessionId: string;
};

export function FeedScreen({ sessionId }: FeedScreenProps) {
  const queryClient = useQueryClient();
  const feedQuery = useFeedQuery(sessionId);
  const [selectedCommentsPost, setSelectedCommentsPost] = useState<FeedPost | null>(null);
  const [refreshState, setRefreshState] = useState<'idle' | 'refreshing' | 'error'>('idle');
  const [pendingRecoveryRefetch, setPendingRecoveryRefetch] = useState(false);
  const posts = feedQuery.data?.pages.flatMap((page) => page.posts) ?? [];
  const isRefreshing =
    refreshState === 'refreshing' ||
    (feedQuery.isRefetching && !feedQuery.isFetchingNextPage && !feedQuery.isPending);
  const showBlockingError = (feedQuery.isError || refreshState === 'error') && posts.length === 0;
  const showInlineError =
    (feedQuery.isRefetchError || refreshState === 'error') && posts.length > 0;
  const showNextPageError = feedQuery.isFetchNextPageError;
  const showEmptyState = !feedQuery.isPending && !feedQuery.isError && posts.length === 0;

  useEffect(() => {
    if (showInlineError) {
      AccessibilityInfo.announceForAccessibility('Не удалось обновить ленту');
    }
  }, [showInlineError]);

  useEffect(() => {
    if (showNextPageError) {
      AccessibilityInfo.announceForAccessibility('Не удалось загрузить публикации');
    }
  }, [showNextPageError]);

  useEffect(() => {
    if (showBlockingError) {
      AccessibilityInfo.announceForAccessibility('Не удалось загрузить публикации');
    }
  }, [showBlockingError]);

  useEffect(() => {
    if (refreshState === 'error' && feedQuery.isRefetching && !feedQuery.isFetchingNextPage) {
      setPendingRecoveryRefetch(true);
    }
  }, [feedQuery.isFetchingNextPage, feedQuery.isRefetching, refreshState]);

  useEffect(() => {
    if (
      refreshState === 'error' &&
      pendingRecoveryRefetch &&
      !feedQuery.isRefetching &&
      !feedQuery.isFetchingNextPage &&
      feedQuery.isSuccess &&
      !feedQuery.isRefetchError
    ) {
      setRefreshState('idle');
      setPendingRecoveryRefetch(false);
    }
  }, [
    feedQuery.isFetchingNextPage,
    feedQuery.isRefetchError,
    feedQuery.isRefetching,
    feedQuery.isSuccess,
    pendingRecoveryRefetch,
    refreshState,
  ]);

  const handleRefresh = async () => {
    if (refreshState === 'refreshing') {
      return;
    }

    setRefreshState('refreshing');
    setPendingRecoveryRefetch(false);
    try {
      await refreshFeedFromStart(queryClient, sessionId);
      setRefreshState('idle');
    } catch {
      setRefreshState('error');
    }
  };

  if (showBlockingError) {
    return (
      <ErrorState
        actionLabel="Повторить"
        illustration={figmaAssets.errorIllustration}
        onAction={() => {
          void handleRefresh();
        }}
        title="Не удалось загрузить публикации"
      />
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <>
        <FlatList
          contentContainerStyle={[styles.content, posts.length === 0 ? styles.contentEmpty : null]}
          data={posts}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            feedQuery.isPending ? <FeedLoader /> : showEmptyState ? <FeedEmptyState /> : null
          }
          ListFooterComponent={
            <PaginationFooter
              hasNextPage={feedQuery.hasNextPage}
              isFetchNextPageError={showNextPageError}
              isFetchingNextPage={feedQuery.isFetchingNextPage}
              onRetry={() => {
                void feedQuery.fetchNextPage();
              }}
            />
          }
          ListHeaderComponent={
            showInlineError ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>Не удалось обновить ленту</Text>
                <Pressable
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={() => {
                    void handleRefresh();
                  }}
                  style={({ pressed }) => [
                    styles.inlineErrorButton,
                    pressed ? styles.inlineErrorButtonPressed : null,
                  ]}
                >
                  <Text style={styles.inlineErrorButtonLabel}>Повторить</Text>
                </Pressable>
              </View>
            ) : null
          }
          ItemSeparatorComponent={ListSeparator}
          onEndReached={() => {
            if (
              refreshState === 'refreshing' ||
              !feedQuery.hasNextPage ||
              feedQuery.isFetchNextPageError ||
              feedQuery.isFetching ||
              feedQuery.isPending
            ) {
              return;
            }

            void feedQuery.fetchNextPage();
          }}
          onEndReachedThreshold={0.35}
          refreshControl={
            <RefreshControl
              colors={[tokens.colors.accentStrong]}
              onRefresh={() => {
                void handleRefresh();
              }}
              progressBackgroundColor={tokens.colors.surface}
              refreshing={isRefreshing}
              tintColor={tokens.colors.accentStrong}
            />
          }
          renderItem={({ item }) => (
            <FeedCard
              onOpenComments={(post) => {
                setSelectedCommentsPost(post);
              }}
              post={item}
              sessionId={sessionId}
            />
          )}
          showsVerticalScrollIndicator={false}
          style={styles.list}
        />
        {selectedCommentsPost ? (
          <PostCommentsModal
            onClose={() => {
              setSelectedCommentsPost(null);
            }}
            postId={selectedCommentsPost.id}
            sessionId={sessionId}
            title={selectedCommentsPost.title}
            visible
          />
        ) : null}
      </>
    </SafeAreaView>
  );
}

function FeedLoader() {
  return (
    <View style={styles.loader}>
      <ActivityIndicator color={tokens.colors.accentStrong} size="large" />
      <Text style={styles.loaderText}>Загружаем публикации…</Text>
    </View>
  );
}

function FeedEmptyState() {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>Пока нет публикаций</Text>
      <Text style={styles.emptyStateText}>
        Когда авторы опубликуют новые материалы, они появятся в этой ленте.
      </Text>
    </View>
  );
}

type PaginationFooterProps = {
  hasNextPage: boolean | undefined;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
};

function PaginationFooter({
  hasNextPage,
  isFetchNextPageError,
  isFetchingNextPage,
  onRetry,
}: PaginationFooterProps) {
  if (isFetchingNextPage) {
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={tokens.colors.accentStrong} />
        <Text style={styles.footerText}>Подгружаем ещё публикации…</Text>
      </View>
    );
  }

  if (isFetchNextPageError) {
    return (
      <View style={styles.footerError}>
        <Text style={styles.footerErrorText}>Не удалось загрузить публикации</Text>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.footerRetryButton,
            pressed ? styles.footerRetryButtonPressed : null,
          ]}
        >
          <Text style={styles.footerRetryButtonLabel}>Повторить</Text>
        </Pressable>
      </View>
    );
  }

  return <View style={hasNextPage ? styles.footerSpacer : styles.footer} />;
}

function ListSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  content: {
    backgroundColor: tokens.colors.background,
    paddingBottom: tokens.spacing.xxl,
    paddingTop: tokens.spacing.sm,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  emptyState: {
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.sm,
    justifyContent: 'center',
    paddingBottom: tokens.spacing.xxl,
    paddingHorizontal: tokens.spacing.xl,
    paddingTop: tokens.spacing.xl,
  },
  emptyStateText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight,
    lineHeight: tokens.typography.body.lineHeight,
    textAlign: 'center',
  },
  emptyStateTitle: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.title.fontSize,
    fontWeight: tokens.typography.title.fontWeight,
    lineHeight: tokens.typography.title.lineHeight,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    justifyContent: 'center',
    paddingBottom: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
  },
  footerError: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    paddingBottom: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
  },
  footerErrorText: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.bodySmall.fontSize,
    fontWeight: '700',
    lineHeight: tokens.typography.bodySmall.lineHeight,
  },
  footerRetryButton: {
    alignItems: 'center',
    backgroundColor: tokens.colors.accentStrong,
    borderRadius: tokens.radii.button,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 32,
    paddingVertical: tokens.spacing.sm,
  },
  footerRetryButtonLabel: {
    color: tokens.colors.white,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: '600',
    lineHeight: 26,
  },
  footerRetryButtonPressed: {
    opacity: 0.85,
  },
  footerSpacer: {
    height: tokens.spacing.xl,
  },
  footerText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.bodySmall.fontSize,
    fontWeight: tokens.typography.bodySmall.fontWeight,
    lineHeight: tokens.typography.bodySmall.lineHeight,
  },
  inlineError: {
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.radii.xl,
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
    marginHorizontal: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  inlineErrorButton: {
    alignItems: 'center',
    backgroundColor: tokens.colors.accentStrong,
    borderRadius: tokens.radii.button,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 32,
    paddingVertical: tokens.spacing.sm,
  },
  inlineErrorButtonLabel: {
    color: tokens.colors.white,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: '600',
    lineHeight: 26,
  },
  inlineErrorButtonPressed: {
    opacity: 0.85,
  },
  inlineErrorText: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.title.fontSize,
    fontWeight: '700',
    lineHeight: tokens.typography.title.lineHeight,
  },
  list: {
    backgroundColor: tokens.colors.background,
    flex: 1,
  },
  loader: {
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.md,
    justifyContent: 'center',
    minHeight: 240,
  },
  loaderText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: tokens.typography.body.fontSize,
    fontWeight: tokens.typography.body.fontWeight,
    lineHeight: tokens.typography.body.lineHeight,
  },
  safeArea: {
    backgroundColor: tokens.colors.background,
    flex: 1,
  },
  separator: {
    height: tokens.spacing.sm,
  },
});
