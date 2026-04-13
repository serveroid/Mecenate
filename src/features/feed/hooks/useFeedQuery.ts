import {
  useInfiniteQuery,
  type InfiniteData,
  type QueryClient,
} from '@tanstack/react-query';

import { env } from '../../../shared/config/env';
import { fetchFeedPage } from '../api/feedApi';
import type { FeedPage } from '../model/feed.types';

export function getFeedQueryKey(sessionId: string) {
  return ['feed', sessionId, env.simulateFeedError] as const;
}

export function useFeedQuery(sessionId: string) {
  return useInfiniteQuery<
    FeedPage,
    Error,
    InfiniteData<FeedPage>,
    ReturnType<typeof getFeedQueryKey>,
    string | null
  >({
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore || !lastPage.nextCursor) {
        return undefined;
      }

      return lastPage.nextCursor;
    },
    initialPageParam: null as string | null,
    queryFn: ({ pageParam, signal }) =>
      fetchFeedPage({
        sessionId,
        cursor: pageParam,
        signal,
      }),
    queryKey: getFeedQueryKey(sessionId),
  });
}

export async function refreshFeedFromStart(queryClient: QueryClient, sessionId: string) {
  const queryKey = getFeedQueryKey(sessionId);

  await queryClient.cancelQueries({ queryKey });

  try {
    const firstPage = await fetchFeedPage({
      sessionId,
      cursor: null,
    });
    const currentFeed =
      queryClient.getQueryData<InfiniteData<FeedPage, string | null>>(queryKey);
    const currentPostsById = new Map(
      currentFeed?.pages.flatMap((page) => page.posts).map((post) => [post.id, post]) ?? [],
    );
    const mergedFirstPage = {
      ...firstPage,
      posts: firstPage.posts.map((post) => {
        const currentPost = currentPostsById.get(post.id);

        if (!currentPost) {
          return post;
        }

        // Preserve local mutation results that may have landed while refresh was in flight.
        return {
          ...post,
          commentsCount: currentPost.commentsCount,
          isLiked: currentPost.isLiked,
          likesCount: currentPost.likesCount,
        };
      }),
    };

    queryClient.setQueryData<InfiniteData<FeedPage, string | null>>(queryKey, {
      pageParams: [null],
      pages: [mergedFirstPage],
    });
  } catch (error) {
    throw error;
  }
}
