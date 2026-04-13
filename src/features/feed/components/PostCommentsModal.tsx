import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { tokens } from '../../../shared/theme/tokens';
import {
  ComposerInputIcon,
  SendIcon,
} from '../../../shared/ui/FigmaIcons';
import { useAddPostComment, usePostComments } from '../hooks/usePostActions';
import type { FeedAuthor, FeedComment } from '../model/feed.types';

type PostCommentsModalProps = {
  postId: string;
  sessionId: string;
  title: string;
  visible: boolean;
  onClose: () => void;
};

type VisibleComment = FeedComment & {
  isPending?: boolean;
};

const COMPOSER_COLLAPSED_HEIGHT = 56;
const COMPOSER_SINGLE_LINE_HEIGHT = 20;
const COMPOSER_COUNTER_SPACE = 46;

function flattenUniqueComments(
  pages: { comments: FeedComment[] }[] | undefined,
) {
  const seenCommentIds = new Set<string>();
  const uniqueComments: VisibleComment[] = [];

  for (const page of pages ?? []) {
    for (const comment of page.comments) {
      if (seenCommentIds.has(comment.id)) {
        continue;
      }

      seenCommentIds.add(comment.id);
      uniqueComments.push(comment);
    }
  }

  return uniqueComments;
}

function sortCommentsNewestFirst(comments: VisibleComment[]) {
  return [...comments].sort((left, right) => {
    const rightTimestamp = Date.parse(right.createdAt);
    const leftTimestamp = Date.parse(left.createdAt);

    if (Number.isNaN(leftTimestamp) || Number.isNaN(rightTimestamp)) {
      return right.id.localeCompare(left.id);
    }

    return rightTimestamp - leftTimestamp;
  });
}

function mergeVisibleComments(
  serverComments: VisibleComment[],
  pendingComments: VisibleComment[],
) {
  const visibleCommentsById = new Map<string, VisibleComment>();

  for (const comment of pendingComments) {
    visibleCommentsById.set(comment.id, comment);
  }

  for (const comment of serverComments) {
    visibleCommentsById.set(comment.id, comment);
  }

  return sortCommentsNewestFirst([...visibleCommentsById.values()]);
}

export function PostCommentsModal({
  postId,
  sessionId,
  title,
  visible,
  onClose,
}: PostCommentsModalProps) {
  const commentsQuery = usePostComments(sessionId, postId, visible);
  const addCommentMutation = useAddPostComment(sessionId, postId);
  const listRef = useRef<FlatList<VisibleComment>>(null);
  const currentUserAuthorRef = useRef<FeedAuthor | null>(null);
  const [draft, setDraft] = useState('');
  const [composerError, setComposerError] = useState<string | null>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);
  const [pendingLocalComments, setPendingLocalComments] = useState<VisibleComment[]>([]);
  const baseScreenHeight = useRef(Dimensions.get('screen').height).current;
  const insets = useSafeAreaInsets();
  const sheetHeight = Math.min(baseScreenHeight * 0.82, 760);
  const translateY = useRef(new Animated.Value(sheetHeight)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const isClosingRef = useRef(false);
  const shouldScrollToTopRef = useRef(false);
  const serverComments = flattenUniqueComments(commentsQuery.data?.pages);
  const comments = useMemo(
    () => mergeVisibleComments(serverComments, pendingLocalComments),
    [pendingLocalComments, serverComments],
  );
  const isLoadingComments =
    commentsQuery.isPending || (commentsQuery.isFetching && serverComments.length === 0);
  const showInlineRefreshError =
    commentsQuery.isRefetchError && serverComments.length > 0;
  const trimmedDraft = draft.trim();
  const canSubmit = trimmedDraft.length > 0 && !addCommentMutation.isPending;

  useEffect(() => {
    if (pendingLocalComments.length === 0) {
      return;
    }

    const serverCommentIds = new Set(serverComments.map((comment) => comment.id));
    setPendingLocalComments((current) => {
      const nextComments = current.filter((comment) => !serverCommentIds.has(comment.id));
      return nextComments.length === current.length ? current : nextComments;
    });
  }, [pendingLocalComments.length, serverComments]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        duration: 220,
        easing: Easing.out(Easing.cubic),
        toValue: 1,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        bounciness: 0,
        speed: 16,
        toValue: 0,
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, translateY]);

  useEffect(() => {
    const syncKeyboardInset = (height: number) => {
      setKeyboardInset(Math.max(0, height - insets.bottom));
    };

    const frameSubscription =
      Platform.OS === 'ios'
        ? Keyboard.addListener('keyboardWillChangeFrame', (event) => {
            const overlap = baseScreenHeight - event.endCoordinates.screenY;
            syncKeyboardInset(overlap);
          })
        : Keyboard.addListener('keyboardDidShow', (event) => {
            syncKeyboardInset(event.endCoordinates.height);
          });

    const hideSubscription = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardInset(0);
      },
    );

    return () => {
      frameSubscription.remove();
      hideSubscription.remove();
    };
  }, [baseScreenHeight, insets.bottom]);

  const closeSheet = useMemo(
    () => () => {
      if (isClosingRef.current) {
        return;
      }

      isClosingRef.current = true;
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          duration: 180,
          easing: Easing.in(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          duration: 200,
          easing: Easing.in(Easing.cubic),
          toValue: sheetHeight,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onClose();
      });
    },
    [backdropOpacity, onClose, sheetHeight, translateY],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponderCapture: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 2 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onMoveShouldSetPanResponder: (_event, gestureState) =>
          Math.abs(gestureState.dy) > 3 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          translateY.stopAnimation();
        },
        onPanResponderMove: (_event, gestureState) => {
          const nextTranslateY =
            gestureState.dy <= 0 ? Math.max(-28, gestureState.dy * 0.24) : gestureState.dy;
          translateY.setValue(nextTranslateY);
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > 92 || gestureState.vy > 1.05) {
            closeSheet();
            return;
          }

          Animated.spring(translateY, {
            bounciness: 0,
            speed: 18,
            toValue: 0,
            useNativeDriver: true,
          }).start();
        },
      }),
    [closeSheet, translateY],
  );

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    const submittedText = trimmedDraft;
    const optimisticCommentId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const optimisticAuthor =
      currentUserAuthorRef.current ??
      ({
        avatarUrl: null,
        displayName: 'Вы',
        id: sessionId,
        isVerified: false,
        username: 'you',
      } satisfies FeedAuthor);
    const optimisticComment: VisibleComment = {
      author: optimisticAuthor,
      createdAt: new Date().toISOString(),
      id: optimisticCommentId,
      isPending: true,
      postId,
      text: submittedText,
    };

    setComposerError(null);
    setDraft('');
    shouldScrollToTopRef.current = true;
    setPendingLocalComments((current) => [optimisticComment, ...current]);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        listRef.current?.scrollToOffset({ animated: true, offset: 0 });
      });
    });

    addCommentMutation.mutate(
      { text: submittedText },
      {
        onError: (error) => {
          const message =
            error instanceof Error ? error.message : 'Не удалось отправить комментарий';
          setPendingLocalComments((current) =>
            current.filter((comment) => comment.id !== optimisticCommentId),
          );
          setDraft(submittedText);
          setComposerError(message);
        },
        onSuccess: (comment) => {
          currentUserAuthorRef.current = comment.author;
          setPendingLocalComments((current) =>
            current.map((entry) =>
              entry.id === optimisticCommentId ? comment : entry,
            ),
          );
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              listRef.current?.scrollToOffset({ animated: true, offset: 0 });
            });
          });
        },
      },
    );
  };

  return (
    <Modal
      onRequestClose={closeSheet}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modalRoot}>
        <Animated.View
          pointerEvents="none"
          style={[styles.backdrop, { opacity: backdropOpacity }]}
        />
        <Pressable accessible={false} onPress={closeSheet} style={styles.backdropPressable} />
        <View pointerEvents="box-none" style={styles.sheetContainer}>
          <Animated.View
            style={[
              styles.sheetShell,
              {
                height: sheetHeight,
                transform: [{ translateY }],
              },
            ]}
          >
            <SafeAreaView edges={[]} style={styles.sheet}>
              <View {...panResponder.panHandlers} style={styles.sheetHeader}>
                <View style={styles.dragZone}>
                  <View style={styles.handle} />
                </View>

                <View style={styles.header}>
                  <View style={styles.headerCopy}>
                    <Text numberOfLines={1} style={styles.title}>
                      Комментарии
                    </Text>
                    <Text numberOfLines={1} style={styles.subtitle}>
                      {title}
                    </Text>
                  </View>
                </View>
              </View>

              {showInlineRefreshError ? (
                <View style={styles.inlineError}>
                  <Text style={styles.inlineErrorText}>Не удалось обновить комментарии</Text>
                  <Pressable
                    accessibilityRole="button"
                    hitSlop={8}
                    onPress={() => {
                      void commentsQuery.refetch();
                    }}
                    style={({ pressed }) => [
                      styles.inlineErrorButton,
                      (pressed || commentsQuery.isRefetching) ? styles.pressed : null,
                    ]}
                  >
                    <Text style={styles.inlineErrorButtonLabel}>
                      {commentsQuery.isRefetching ? 'Обновляем…' : 'Повторить'}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              <View style={styles.listSection}>
                {isLoadingComments ? (
                  <View style={styles.centerState}>
                    <ActivityIndicator color={tokens.colors.accentStrong} />
                    <Text style={styles.stateText}>Загружаем комментарии…</Text>
                  </View>
                ) : commentsQuery.isError ? (
                  <View style={styles.centerState}>
                    <Text style={styles.stateTitle}>Не удалось загрузить комментарии</Text>
                    <Pressable
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => {
                        void commentsQuery.refetch();
                      }}
                      style={({ pressed }) => [
                        styles.retryButton,
                        pressed ? styles.pressed : null,
                      ]}
                    >
                      <Text style={styles.retryButtonLabel}>Повторить</Text>
                    </Pressable>
                  </View>
                ) : (
                  <FlatList
                    ref={listRef}
                    contentContainerStyle={[
                      styles.listContent,
                      comments.length === 0 ? styles.listContentEmpty : null,
                    ]}
                    data={comments}
                    keyExtractor={(item) => item.id}
                    keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
                    keyboardShouldPersistTaps="handled"
                    ListFooterComponent={
                      <CommentsPaginationFooter
                        hasNextPage={commentsQuery.hasNextPage}
                        isFetchNextPageError={commentsQuery.isFetchNextPageError}
                        isFetchingNextPage={commentsQuery.isFetchingNextPage}
                        onRetry={() => {
                          void commentsQuery.fetchNextPage();
                        }}
                      />
                    }
                    ListEmptyComponent={
                      <View style={styles.centerState}>
                        <Text style={styles.stateTitle}>Комментариев пока нет</Text>
                        <Text style={styles.stateText}>
                          Напишите первый комментарий, и он сразу появится здесь.
                        </Text>
                      </View>
                    }
                    onEndReached={() => {
                      if (
                        !commentsQuery.hasNextPage ||
                        commentsQuery.isFetchingNextPage ||
                        commentsQuery.isFetchNextPageError
                      ) {
                        return;
                      }

                      void commentsQuery.fetchNextPage();
                    }}
                    onEndReachedThreshold={0.25}
                    onContentSizeChange={() => {
                      if (!shouldScrollToTopRef.current) {
                        return;
                      }

                      requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                          listRef.current?.scrollToOffset({ animated: true, offset: 0 });
                          shouldScrollToTopRef.current = false;
                        });
                      });
                    }}
                    renderItem={({ item }) => <CommentRow comment={item} />}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>

              <View
                style={[
                  styles.bottomStack,
                  { paddingBottom: keyboardInset > 0 ? keyboardInset : 8 },
                ]}
              >
                <View style={styles.composer}>
                  {composerError ? <Text style={styles.composerError}>{composerError}</Text> : null}
                  <View style={styles.composerRow}>
                    <View style={styles.inputWrap}>
                      <View style={styles.inputSurface}>
                        <View style={styles.inputIconWrap}>
                          <ComposerInputIcon />
                        </View>
                        <View style={[styles.inputContent, styles.inputContentCollapsed]}>
                          <TextInput
                            accessibilityLabel="Поле ввода комментария"
                            autoCapitalize="sentences"
                            maxLength={500}
                            multiline={false}
                            onChangeText={(value) => {
                              setDraft(value);
                              if (composerError) {
                                setComposerError(null);
                              }
                            }}
                            onSubmitEditing={handleSubmit}
                            placeholder="Написать комментарий"
                            placeholderTextColor={tokens.colors.textMuted}
                            selectionColor={tokens.colors.accentStrong}
                            underlineColorAndroid="transparent"
                            style={styles.input}
                            textAlignVertical="center"
                            value={draft}
                          />
                          <View pointerEvents="none" style={styles.counterCollapsedWrap}>
                            <Text style={styles.counterText}>{draft.length}/500</Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {addCommentMutation.isPending ? (
                      <View pointerEvents="none" style={styles.composerLoader}>
                        <ActivityIndicator color={tokens.colors.white} size="small" />
                      </View>
                    ) : null}

                    <Pressable
                      accessibilityLabel="Отправить комментарий"
                      accessibilityRole="button"
                      accessibilityState={{ busy: addCommentMutation.isPending, disabled: !canSubmit }}
                      disabled={!canSubmit}
                      hitSlop={8}
                      onPress={handleSubmit}
                      style={({ pressed }) => [
                        styles.sendButtonShell,
                        (!canSubmit || pressed) ? styles.sendButtonShellPressed : null,
                      ]}
                    >
                      <LinearGradient
                        colors={
                          canSubmit
                            ? ['#8D2BFF', tokens.colors.accentStrong]
                            : [tokens.colors.accentStrongMuted, tokens.colors.accentStrongMuted]
                        }
                        end={{ x: 1, y: 0.5 }}
                      start={{ x: 0, y: 0.5 }}
                      style={styles.sendButton}
                    >
                      <SendIcon />
                    </LinearGradient>
                  </Pressable>
                </View>
              </View>
              </View>
            </SafeAreaView>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

type CommentsPaginationFooterProps = {
  hasNextPage: boolean | undefined;
  isFetchNextPageError: boolean;
  isFetchingNextPage: boolean;
  onRetry: () => void;
};

function CommentsPaginationFooter({
  hasNextPage,
  isFetchNextPageError,
  isFetchingNextPage,
  onRetry,
}: CommentsPaginationFooterProps) {
  if (isFetchingNextPage) {
    return (
      <View style={styles.paginationFooter}>
        <ActivityIndicator color={tokens.colors.accentStrong} />
      </View>
    );
  }

  if (isFetchNextPageError) {
    return (
      <View style={styles.paginationFooter}>
        <Pressable
          accessibilityRole="button"
          hitSlop={8}
          onPress={onRetry}
          style={({ pressed }) => [styles.paginationRetryButton, pressed ? styles.pressed : null]}
        >
          <Text style={styles.paginationRetryButtonLabel}>Показать ещё</Text>
        </Pressable>
      </View>
    );
  }

  if (!hasNextPage) {
    return <View style={styles.paginationFooterSpacer} />;
  }

  return (
    <View style={styles.paginationFooter}>
      <Text style={styles.paginationHint}>Потяните вверх, чтобы загрузить ещё</Text>
    </View>
  );
}

function CommentRow({ comment }: { comment: VisibleComment }) {
  const authorInitial = comment.author.displayName.trim().charAt(0).toUpperCase() || 'A';

  return (
    <View style={styles.commentRow}>
      {comment.author.avatarUrl ? (
        <Image contentFit="cover" source={comment.author.avatarUrl} style={styles.avatar} />
      ) : (
        <View style={styles.avatarFallback}>
          <Text style={styles.avatarFallbackText}>{authorInitial}</Text>
        </View>
      )}

      <View style={styles.commentMain}>
        <View style={styles.commentBody}>
          <Text style={styles.commentAuthor}>{comment.author.displayName}</Text>
          <Text style={styles.commentText}>{comment.text}</Text>
        </View>
        {comment.isPending ? (
          <ActivityIndicator color={tokens.colors.accentStrong} size="small" style={styles.commentLoader} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    borderRadius: tokens.radii.round,
    height: 42,
    width: 42,
  },
  avatarFallback: {
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceMuted,
    borderRadius: tokens.radii.round,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  avatarFallbackText: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(17, 20, 22, 0.38)',
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  centerState: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
    justifyContent: 'center',
    minHeight: 240,
    paddingHorizontal: tokens.spacing.xl,
  },
  bottomStack: {
    backgroundColor: tokens.colors.surface,
  },
  commentAuthor: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  commentBody: {
    flex: 1,
    gap: 4,
    minWidth: 0,
    paddingTop: 2,
  },
  commentLoader: {
    marginTop: 2,
  },
  commentMain: {
    alignItems: 'flex-start',
    flex: 1,
    flexDirection: 'row',
    gap: 12,
    minWidth: 0,
  },
  commentRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 13,
  },
  commentText: {
    color: tokens.colors.text,
    flexShrink: 1,
    fontFamily: tokens.fonts.manrope,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
    maxWidth: '100%',
  },
  composer: {
    backgroundColor: tokens.colors.surface,
    borderTopColor: tokens.colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 8,
    paddingBottom: 0,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: 10,
  },
  composerError: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  composerRow: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 12,
    position: 'relative',
  },
  composerLoader: {
    alignItems: 'center',
    bottom: 0,
    height: 56,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    width: 56,
    zIndex: 2,
  },
  counterText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
    textAlign: 'right',
  },
  counterCollapsedWrap: {
    bottom: 0,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 0,
    width: 40,
  },
  dragZone: {
    alignItems: 'center',
    paddingBottom: 8,
    paddingTop: 10,
  },
  handle: {
    backgroundColor: '#D5DDE8',
    borderRadius: tokens.radii.pill,
    height: 5,
    width: 52,
  },
  header: {
    alignItems: 'flex-start',
    paddingBottom: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  headerCopy: {
    flex: 1,
    gap: 4,
  },
  inlineError: {
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceMuted,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
    marginHorizontal: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 10,
  },
  inlineErrorButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    paddingLeft: tokens.spacing.md,
  },
  inlineErrorButtonLabel: {
    color: tokens.colors.accentStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  inlineErrorText: {
    color: tokens.colors.textStrong,
    flex: 1,
    fontFamily: tokens.fonts.manrope,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  inputContent: {
    flex: 1,
    minWidth: 0,
    position: 'relative',
  },
  inputContentCollapsed: {
    minHeight: COMPOSER_SINGLE_LINE_HEIGHT,
    justifyContent: 'center',
  },
  input: {
    color: tokens.colors.textStrong,
    flex: 1,
    fontFamily: tokens.fonts.manrope,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: COMPOSER_SINGLE_LINE_HEIGHT,
    minHeight: COMPOSER_SINGLE_LINE_HEIGHT,
    minWidth: 0,
    paddingLeft: 0,
    paddingRight: COMPOSER_COUNTER_SPACE,
    paddingBottom: 0,
    paddingTop: 0,
  },
  inputIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputSurface: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: 10,
  },
  inputWrap: {
    backgroundColor: '#EEF3FB',
    borderRadius: 28,
    flex: 1,
    flexShrink: 1,
    minHeight: COMPOSER_COLLAPSED_HEIGHT,
    minWidth: 0,
    paddingHorizontal: 16,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  listSection: {
    flex: 1,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  paginationFooter: {
    alignItems: 'center',
    paddingTop: 10,
  },
  paginationFooterSpacer: {
    height: 8,
  },
  paginationHint: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  paginationRetryButton: {
    alignItems: 'center',
    backgroundColor: tokens.colors.surfaceMuted,
    borderRadius: tokens.radii.pill,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: 16,
  },
  paginationRetryButtonLabel: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.82,
  },
  retryButton: {
    alignItems: 'center',
    backgroundColor: tokens.colors.accentStrong,
    borderRadius: tokens.radii.button,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 24,
  },
  retryButtonLabel: {
    color: tokens.colors.white,
    fontFamily: tokens.fonts.manrope,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
  safeArea: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    flex: 1,
    overflow: 'hidden',
  },
  sendButton: {
    alignItems: 'center',
    borderRadius: 28,
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  sendButtonShell: {
    borderRadius: 28,
    height: 56,
    overflow: 'hidden',
    width: 56,
  },
  sendButtonShellPressed: {
    opacity: 0.92,
  },
  sheet: {
    flex: 1,
  },
  sheetContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetHeader: {
    paddingBottom: 10,
  },
  sheetShell: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  stateText: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
    textAlign: 'center',
  },
  stateTitle: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  subtitle: {
    color: tokens.colors.textMuted,
    fontFamily: tokens.fonts.manrope,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  },
  title: {
    color: tokens.colors.textStrong,
    fontFamily: tokens.fonts.manrope,
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
});
