const DEFAULT_API_BASE_URL = 'https://k8s.mectest.ru/test-app';

function normalizeBaseUrl(value: string) {
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

export function buildApiUrl(pathname: string) {
  const normalizedPath = pathname.startsWith('/') ? pathname.slice(1) : pathname;

  return new URL(normalizedPath, `${env.apiBaseUrl}/`);
}

function resolveApiBaseUrl() {
  const rawValue = process.env.EXPO_PUBLIC_MECENATE_API_URL?.trim();

  if (!rawValue) {
    return DEFAULT_API_BASE_URL;
  }

  try {
    return normalizeBaseUrl(new URL(rawValue).toString());
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

function parseBoolean(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  feedPageSize: 10,
  simulateFeedError: parseBoolean(process.env.EXPO_PUBLIC_MECENATE_SIMULATE_ERROR),
} as const;
