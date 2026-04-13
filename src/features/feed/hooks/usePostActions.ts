import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from '@tanstack/react-query';

import {
  addPostComment,
  fetchPostComments,
  togglePostLike,
} from '../api/feedApi';
import type {
  FeedCommentsPage,
  FeedPage,
  FeedPost,
} from '../model/feed.types';
import { getFeedQueryKey } from './useFeedQuery';

function updateFeedPost(
  data: InfiniteData<FeedPage, string | null> | undefined,
  postId: string,
  updater: (post: FeedPost) => FeedPost,
) {
  if (!data) {
    return data;
  }

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      posts: page.posts.map((post) => (post.id === postId ? updater(post) : post)),
    })),
  };
}

export function useTogglePostLike(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ postId }: { postId: string }) =>
      togglePostLike({
        postId,
        sessionId,
      }),
    onMutate: async ({ postId }) => {
      const queryKey = getFeedQueryKey(sessionId);
      await queryClient.cancelQueries({ queryKey });

      const previousFeed =
        queryClient.getQueryData<InfiniteData<FeedPage, string | null>>(queryKey);

      queryClient.setQueryData<InfiniteData<FeedPage, string | null> | undefined>(
        queryKey,
        (currentFeed) =>
          updateFeedPost(currentFeed, postId, (post) => ({
            ...post,
            isLiked: !post.isLiked,
            likesCount: Math.max(0, post.likesCount + (post.isLiked ? -1 : 1)),
          })),
      );

      return { previousFeed, queryKey };
    },
    onError: (_error, _variables, context) => {
      if (!context) {
        return;
      }

      queryClient.setQueryData(context.queryKey, context.previousFeed);
    },
    onSuccess: (result, { postId }) => {
      queryClient.setQueryData<InfiniteData<FeedPage, string | null> | undefined>(
        getFeedQueryKey(sessionId),
        (currentFeed) =>
          updateFeedPost(currentFeed, postId, (post) => ({
            ...post,
            isLiked: result.isLiked,
            likesCount: result.likesCount,
          })),
      );
    },
  });
}

export function getPostCommentsQueryKey(sessionId: string, postId: string) {
  return ['post-comments', sessionId, postId] as const;
}

export function usePostComments(
  sessionId: string,
  postId: string,
  enabled: boolean,
) {
  return useInfiniteQuery<
    FeedCommentsPage,
    Error,
    InfiniteData<FeedCommentsPage>,
    ReturnType<typeof getPostCommentsQueryKey>,
    string | null
  >({
    enabled,
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || !lastPage.nextCursor) {
        return undefined;
      }

      return lastPage.nextCursor;
    },
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchPostComments({
        cursor: pageParam,
        postId,
        sessionId,
        signal,
      }),
    queryKey: getPostCommentsQueryKey(sessionId, postId),
    staleTime: 30_000,
  });
}

export function useAddPostComment(sessionId: string, postId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ text }: { text: string }) =>
      addPostComment({
        postId,
        sessionId,
        text,
      }),
    onMutate: async () => {
      const commentsQueryKey = getPostCommentsQueryKey(sessionId, postId);

      await queryClient.cancelQueries({ queryKey: commentsQueryKey });
    },
    onSuccess: (_comment) => {
      const commentsQueryKey = getPostCommentsQueryKey(sessionId, postId);

      queryClient.setQueryData<InfiniteData<FeedPage, string | null> | undefined>(
        getFeedQueryKey(sessionId),
        (currentFeed) =>
          updateFeedPost(currentFeed, postId, (post) => ({
            ...post,
            commentsCount: post.commentsCount + 1,
          })),
      );

      void queryClient.invalidateQueries({ queryKey: commentsQueryKey });
    },
  });
}
