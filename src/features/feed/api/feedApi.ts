import { buildApiUrl, env } from '../../../shared/config/env';
import type {
  FeedComment,
  FeedCommentsPage,
  FeedPage,
  FeedPost,
} from '../model/feed.types';

type PostsResponseDto = {
  ok: boolean;
  data?: {
    posts: unknown;
    nextCursor: string | null;
    hasMore: boolean;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type LikeResponseDto = {
  ok: boolean;
  data?: {
    isLiked: unknown;
    likesCount: unknown;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type CommentsResponseDto = {
  ok: boolean;
  data?: {
    comments: unknown;
    nextCursor: string | null;
    hasMore: boolean;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type CommentCreatedResponseDto = {
  ok: boolean;
  data?: {
    comment: unknown;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

type FetchFeedPageParams = {
  sessionId: string;
  cursor: string | null;
  signal?: AbortSignal;
};

type TogglePostLikeParams = {
  sessionId: string;
  postId: string;
};

type FetchPostCommentsParams = {
  sessionId: string;
  postId: string;
  cursor: string | null;
  signal?: AbortSignal;
};

type AddPostCommentParams = {
  sessionId: string;
  postId: string;
  text: string;
};

class FeedApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'FeedApiError';
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : null;
}

function readBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function mapPost(dto: unknown): FeedPost | null {
  if (!isRecord(dto) || !isRecord(dto.author)) {
    return null;
  }

  const id = readString(dto.id);
  const preview = readString(dto.preview);
  const body = readString(dto.body);
  const previewText = preview?.trim() || body?.trim() || '';
  const username = readString(dto.author.username) ?? 'author';
  const displayName = readString(dto.author.displayName)?.trim() || username;
  const avatarUrl = readString(dto.author.avatarUrl);
  const title = readString(dto.title)?.trim() || previewText || 'Публикация';
  const coverUrl = readString(dto.coverUrl);
  const createdAt = readString(dto.createdAt) ?? '';
  const likesCount = readNumber(dto.likesCount);
  const commentsCount = readNumber(dto.commentsCount);
  const isLiked = readBoolean(dto.isLiked);
  const isVerified = readBoolean(dto.author.isVerified) ?? false;
  const tier = dto.tier === 'free' || dto.tier === 'paid' ? dto.tier : null;

  if (!id || likesCount === null || commentsCount === null || isLiked === null || !tier) {
    return null;
  }

  return {
    id,
    author: {
      id: readString(dto.author.id) ?? id,
      username,
      displayName,
      avatarUrl,
      isVerified,
    },
    title,
    body: body?.trim() || '',
    preview: previewText,
    coverUrl,
    likesCount,
    commentsCount,
    isLiked,
    tier,
    createdAt,
  };
}

function mapComment(dto: unknown): FeedComment | null {
  if (!isRecord(dto) || !isRecord(dto.author)) {
    return null;
  }

  const id = readString(dto.id);
  const postId = readString(dto.postId);
  const text = readString(dto.text)?.trim();
  const createdAt = readString(dto.createdAt) ?? '';
  const username = readString(dto.author.username) ?? 'author';
  const displayName = readString(dto.author.displayName)?.trim() || username;
  const avatarUrl = readString(dto.author.avatarUrl);
  const isVerified = readBoolean(dto.author.isVerified) ?? false;

  if (!id || !postId || !text) {
    return null;
  }

  return {
    id,
    postId,
    author: {
      id: readString(dto.author.id) ?? id,
      username,
      displayName,
      avatarUrl,
      isVerified,
    },
    createdAt,
    text,
  };
}

async function requestJson<T>(url: URL, init: RequestInit) {
  const response = await fetch(url.toString(), init);

  try {
    const payload = (await response.json()) as T;
    return { payload, response };
  } catch {
    return { payload: null, response };
  }
}

export async function fetchFeedPage({
  sessionId,
  cursor,
  signal,
}: FetchFeedPageParams): Promise<FeedPage> {
  const url = buildApiUrl('posts');

  url.searchParams.set('limit', String(env.feedPageSize));

  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  if (env.simulateFeedError) {
    url.searchParams.set('simulate_error', 'true');
  }

  const { payload, response } = await requestJson<PostsResponseDto>(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    signal: signal ?? null,
  });

  if (!response.ok || !payload?.ok || !payload.data) {
    const message = payload?.error?.message ?? 'Не удалось загрузить публикации';
    throw new FeedApiError(message, response.status);
  }

  if (!Array.isArray(payload.data.posts)) {
    throw new FeedApiError('Не удалось загрузить публикации', response.status);
  }

  const parsedPosts = payload.data.posts.map(mapPost);

  if (parsedPosts.some((post) => post === null)) {
    throw new FeedApiError('Не удалось загрузить публикации', response.status);
  }

  const posts = parsedPosts as FeedPost[];

  return {
    posts,
    nextCursor: payload.data.nextCursor,
    hasMore: payload.data.hasMore,
  };
}

export async function togglePostLike({
  sessionId,
  postId,
}: TogglePostLikeParams): Promise<{ isLiked: boolean; likesCount: number }> {
  const url = buildApiUrl(`posts/${postId}/like`);

  const { payload, response } = await requestJson<LikeResponseDto>(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
  });

  const isLiked = readBoolean(payload?.data?.isLiked);
  const likesCount = readNumber(payload?.data?.likesCount);

  if (!response.ok || !payload?.ok || isLiked === null || likesCount === null) {
    const message = payload?.error?.message ?? 'Не удалось обновить лайк';
    throw new FeedApiError(message, response.status);
  }

  return {
    isLiked,
    likesCount,
  };
}

export async function fetchPostComments({
  sessionId,
  postId,
  cursor,
  signal,
}: FetchPostCommentsParams): Promise<FeedCommentsPage> {
  const url = buildApiUrl(`posts/${postId}/comments`);
  url.searchParams.set('limit', '20');
  if (cursor) {
    url.searchParams.set('cursor', cursor);
  }

  const { payload, response } = await requestJson<CommentsResponseDto>(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionId}`,
    },
    signal: signal ?? null,
  });

  if (!response.ok || !payload?.ok || !payload.data || !Array.isArray(payload.data.comments)) {
    const message = payload?.error?.message ?? 'Не удалось загрузить комментарии';
    throw new FeedApiError(message, response.status);
  }

  const parsedComments = payload.data.comments.map(mapComment);

  if (parsedComments.some((comment) => comment === null)) {
    throw new FeedApiError('Не удалось загрузить комментарии', response.status);
  }

  return {
    comments: parsedComments as FeedComment[],
    hasMore: payload.data.hasMore,
    nextCursor: payload.data.nextCursor,
  };
}

export async function addPostComment({
  sessionId,
  postId,
  text,
}: AddPostCommentParams): Promise<FeedComment> {
  const url = buildApiUrl(`posts/${postId}/comments`);

  const { payload, response } = await requestJson<CommentCreatedResponseDto>(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${sessionId}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: text.trim(),
    }),
  });

  const comment = mapComment(payload?.data?.comment);

  if (!response.ok || !payload?.ok || !comment) {
    const message = payload?.error?.message ?? 'Не удалось отправить комментарий';
    throw new FeedApiError(message, response.status);
  }

  return comment;
}
