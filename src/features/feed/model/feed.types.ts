export type PostTier = 'free' | 'paid';

export type FeedAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isVerified: boolean;
};

export type FeedPost = {
  id: string;
  author: FeedAuthor;
  title: string;
  body: string;
  preview: string;
  coverUrl: string | null;
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  tier: PostTier;
  createdAt: string;
};

export type FeedPage = {
  posts: FeedPost[];
  nextCursor: string | null;
  hasMore: boolean;
};

export type FeedComment = {
  id: string;
  postId: string;
  author: FeedAuthor;
  text: string;
  createdAt: string;
};

export type FeedCommentsPage = {
  comments: FeedComment[];
  nextCursor: string | null;
  hasMore: boolean;
};
