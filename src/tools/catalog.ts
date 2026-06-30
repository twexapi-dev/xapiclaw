import type { EndpointDescriptor, EndpointRisk, HttpMethod } from '../types.js';

const METHODS = new Set<HttpMethod>(['DELETE', 'GET', 'PATCH', 'POST', 'PUT']);
const APPROVAL_RISKS = new Set<EndpointRisk>(['paid-bulk', 'private-read', 'write']);

export const BLOCKED_PATHS = [
  '/twitter/{auth_token}/cookie',
  '/twitter/{auth_token}/user_info',
  '/twitter/action',
  '/twitter/action/order-status',
  '/twitter/profile',
  '/twitter/list/create',
  '/twitter/post-tweet-without-cookie',
  '/twitter/tweets/sentiment',
] as const;

function entry(
  method: HttpMethod,
  path: string,
  category: string,
  summary: string,
  risk: EndpointRisk,
  cost?: string,
): EndpointDescriptor {
  const approvalReason = APPROVAL_RISKS.has(risk)
    ? `${risk} endpoint requires explicit user approval before invocation.`
    : undefined;

  return {
    method,
    path,
    category,
    summary,
    risk,
    ...(cost === undefined ? {} : { cost }),
    ...(approvalReason === undefined ? {} : { approvalReason }),
  };
}

export const CATALOG: readonly EndpointDescriptor[] = [
  entry('GET', '/balance', 'Balance', 'Get TwexAPI balance.', 'private-read'),
  entry('POST', '/twitter/advanced_search', 'Search', 'Advanced Twitter search.', 'paid-bulk', '$0.14 per 1,000 tweets'),
  entry('POST', '/twitter/advanced_search/page', 'Search', 'Advanced Twitter search by cursor page.', 'paid-bulk', '$0.14 per 1,000 tweets'),
  entry('POST', '/twitter/cashtags', 'Search', 'Search tweets containing cashtags.', 'paid-bulk', '$0.14 per 1,000 tweets'),
  entry('POST', '/twitter/hashtags', 'Search', 'Search tweets containing hashtags.', 'paid-bulk'),
  entry('POST', '/twitter/users', 'Users', 'Get multiple users by usernames or profile URLs.', 'paid-bulk', '$0.14 per 1,000 users'),
  entry('POST', '/twitter/users/by_ids', 'Users', 'Get user details by ID.', 'paid-bulk'),
  entry('POST', '/twitter/users/status', 'Users', 'Batch get user account status.', 'paid-bulk'),
  entry('POST', '/x/account/verify', 'Users', 'Verify account status.', 'read'),
  entry('GET', '/twitter/search-user/{keyword}/{target_count}', 'Users', 'Search users.', 'paid-bulk'),
  entry('POST', '/twitter/account/based', 'Users', 'Get Twitter account based-in metadata.', 'read'),
  entry('GET', '/twitter/{screen_name}/about', 'Users', 'Get Twitter user about by screen name.', 'read'),
  entry('GET', '/twitter/latest-followers/{screen_name}', 'Followers', 'Get latest followers.', 'paid-bulk', '$0.14 per 1,000 followers'),
  entry('GET', '/twitter/latest-following/{screen_name}', 'Followers', 'Get latest following.', 'paid-bulk', '$0.14 per 1,000 following'),
  entry('GET', '/twitter/followers/{screen_name}/{count}', 'Followers', 'Get followers.', 'paid-bulk', '$0.14 per 1,000 followers'),
  entry('GET', '/twitter/following/{screen_name}/{count}', 'Followers', 'Get following.', 'paid-bulk', '$0.14 per 1,000 following'),
  entry('POST', '/twitter/followers/page', 'Followers', 'Get followers by page.', 'paid-bulk', '$0.14 per 1,000 followers'),
  entry('POST', '/twitter/following/page', 'Followers', 'Get following by page.', 'paid-bulk', '$0.14 per 1,000 following'),
  entry('GET', '/twitter/followers/task/{task_id}/status', 'Followers', 'Get followers task status.', 'read'),
  entry('GET', '/twitter/following/task/{task_id}/status', 'Followers', 'Get following task status.', 'read'),
  entry('GET', '/twitter/followers/task/{task_id}/next', 'Followers', 'Consume next page of followers task.', 'paid-bulk'),
  entry('GET', '/twitter/following/task/{task_id}/next', 'Followers', 'Consume next page of following task.', 'paid-bulk'),
  entry('POST', '/twitter/tweets/lookup', 'Tweets', 'Batch get tweets by ID.', 'paid-bulk'),
  entry('GET', '/twitter/tweets/{tweet_id}/similar', 'Tweets', 'Get similar tweets.', 'read'),
  entry('POST', '/twitter/tweets/thread_by_id', 'Tweets', 'Get tweet thread by ID.', 'paid-bulk'),
  entry('GET', '/twitter/tweets/{tweet_id}/replies/{count}', 'Tweet Replies', 'Get replies by tweet ID.', 'paid-bulk', '$0.14 per 1,000 replies'),
  entry('GET', '/twitter/tweets/{tweet_id}/quotes/{sort_by}/{target_count}', 'Tweet Engagement', 'Get quote tweets.', 'paid-bulk'),
  entry('GET', '/twitter/tweets/{tweet_id}/retweeters/{target_count}', 'Tweet Engagement', 'Get retweeters.', 'paid-bulk'),
  entry('POST', '/twitter/tweets-favoriters', 'Tweet Engagement', 'Get favoriters.', 'paid-bulk'),
  entry('GET', '/twitter/{screen_name}/tweets-replies/{count}', 'Timeline', 'Get all tweets and replies by user.', 'paid-bulk', '$0.14 per 1,000 items'),
  entry('POST', '/twitter/tweets-replies/page', 'Timeline', 'Get all tweets and replies by page.', 'paid-bulk', '$0.14 per 1,000 items'),
  entry('POST', '/twitter/{screen_name}/timeline', 'Timeline', 'Get user timeline and fill count.', 'paid-bulk'),
  entry('POST', '/twitter/{screen_name}/timeline/page', 'Timeline', 'Get user timeline by page.', 'paid-bulk'),
  entry('GET', '/twitter/{country}/trending', 'Trending', 'Get trending topics.', 'read'),
  entry('GET', '/twitter/global-trending/countries', 'Trending', 'List global trend countries.', 'read'),
  entry('GET', '/twitter/global-trending/topics', 'Trending', 'List global trend topics.', 'read'),
  entry('GET', '/twitter/global-trending/contents', 'Trending', 'List global trend content tags.', 'read'),
  entry('GET', '/twitter/global-trending/tweets', 'Trending', 'Get global trending tweets.', 'paid-bulk'),
  entry('POST', '/x/article', 'Articles', 'Batch fetch X articles.', 'paid-bulk'),
  entry('GET', '/x/article/{tweet_id}/markdown', 'Articles', 'Fetch article as Markdown.', 'read'),
  entry('GET', '/twitter/list/{list_id}/members/{target_count}', 'Lists', 'Get list members.', 'paid-bulk'),
  entry('GET', '/twitter/list/{list_id}/subscribers/{target_count}', 'Lists', 'Get list subscribers.', 'paid-bulk'),
  entry('GET', '/twitter/list/{list_id}/tweets/{target_count}', 'Lists', 'Get list tweets.', 'paid-bulk'),
  entry('POST', '/twitter/list/members/page', 'Lists', 'Get list members by page.', 'paid-bulk'),
  entry('POST', '/twitter/list/tweets/page', 'Lists', 'Get list tweets by page.', 'paid-bulk'),
  entry('POST', '/twitter/list/search', 'Lists', 'Search lists.', 'read'),
  entry('GET', '/twitter/community/{community_id}', 'Communities', 'Get community.', 'read'),
  entry('GET', '/twitter/community/{community_id}/members/{target_count}', 'Communities', 'Get community members.', 'paid-bulk'),
  entry('GET', '/twitter/community/{community_id}/tweets/{tweet_type}/{target_count}', 'Communities', 'Get community tweets.', 'paid-bulk'),
  entry('POST', '/twitter/community/members/page', 'Communities', 'Get community members by page.', 'paid-bulk'),
  entry('POST', '/twitter/community/tweets/page', 'Communities', 'Get community tweets by page.', 'paid-bulk'),
  entry('POST', '/twitter/community/search', 'Communities', 'Search communities.', 'read'),
  entry('POST', '/twitter/community/search-tweets', 'Communities', 'Search community tweets.', 'paid-bulk'),
  entry('POST', '/v2/dm/status', 'DM', 'Check DM permissions.', 'private-read'),
  entry('POST', '/twitter/dm-history', 'DM', 'Get DM history.', 'private-read'),
  entry('POST', '/twitter/notifications', 'Notifications', 'Get notifications.', 'private-read'),
  entry('POST', '/twitter/tweets/create', 'Tweet Actions', 'Create a tweet or reply.', 'write', '$0.0025 per call'),
  entry('POST', '/twitter/tweets/quote', 'Tweet Actions', 'Create a quote tweet.', 'write', '$0.0025 per call'),
  entry('POST', '/twitter/tweets/delete-batch', 'Tweet Actions', 'Delete one or more tweets.', 'write'),
  entry('POST', '/twitter/tweets/{tweet_id}/like', 'Tweet Actions', 'Like a tweet.', 'write', '$0.0025 per call'),
  entry('DELETE', '/twitter/tweets/{tweet_id}/like', 'Tweet Actions', 'Unlike a tweet.', 'write'),
  entry('POST', '/twitter/tweets/{tweet_id}/retweet', 'Tweet Actions', 'Retweet a tweet.', 'write', '$0.0025 per call'),
  entry('DELETE', '/twitter/tweets/{tweet_id}/retweet', 'Tweet Actions', 'Delete retweet.', 'write'),
  entry('POST', '/twitter/tweets/{tweet_id}/bookmark', 'Tweet Actions', 'Bookmark a tweet.', 'write', '$0.0025 per call'),
  entry('DELETE', '/twitter/tweets/{tweet_id}/bookmark', 'Tweet Actions', 'Delete bookmark.', 'write'),
  entry('POST', '/twitter/user/follow', 'Users', 'Follow user.', 'write', '$0.0025 per call'),
  entry('DELETE', '/twitter/user/follow', 'Users', 'Unfollow user.', 'write', '$0.0025 per call'),
  entry('POST', '/twitter/user/block', 'Users', 'Block user.', 'write'),
  entry('DELETE', '/twitter/user/block', 'Users', 'Unblock user.', 'write'),
  entry('POST', '/twitter/send-dm', 'DM', 'Send DM.', 'write', '$0.0025 per call'),
  entry('POST', '/x/articles/draft', 'Articles', 'Create article draft.', 'write'),
  entry('PUT', '/x/articles/{article_id}/cover', 'Articles', 'Upload and set article cover image.', 'write'),
  entry('PUT', '/x/articles/{article_id}/title', 'Articles', 'Set article title.', 'write'),
  entry('PUT', '/x/articles/{article_id}/content', 'Articles', 'Set article content from Markdown.', 'write'),
  entry('POST', '/x/articles/{article_id}/publish', 'Articles', 'Publish article draft.', 'write'),
  entry('POST', '/x/articles/publish', 'Articles', 'Quick one-step article publish.', 'write'),
] as const;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function templateToRegExp(template: string): RegExp {
  const source = template
    .split('/')
    .map((segment) => {
      if (segment.startsWith('{') && segment.endsWith('}')) return '[^/]+';
      return escapeRegExp(segment);
    })
    .join('/');
  return new RegExp(`^${source}$`, 'u');
}

function matchesPathTemplate(template: string, concretePath: string): boolean {
  return template === concretePath || templateToRegExp(template).test(concretePath);
}

export function normalizeMethod(value: unknown): HttpMethod | undefined {
  if (typeof value !== 'string') return undefined;
  const method = value.toUpperCase();
  return METHODS.has(method as HttpMethod) ? (method as HttpMethod) : undefined;
}

export function isBlockedPath(path: string): boolean {
  return BLOCKED_PATHS.some((blocked) => matchesPathTemplate(blocked, path));
}

export function findEndpoint(method: HttpMethod | string | undefined, path: string): EndpointDescriptor | undefined {
  const normalized = normalizeMethod(method);
  if (normalized === undefined) return undefined;
  return CATALOG.find((endpoint) => endpoint.method === normalized && matchesPathTemplate(endpoint.path, path));
}

export function requestNeedsApproval(method: HttpMethod | string | undefined, path: string): boolean {
  const endpoint = findEndpoint(method, path);
  return endpoint === undefined ? false : APPROVAL_RISKS.has(endpoint.risk);
}
