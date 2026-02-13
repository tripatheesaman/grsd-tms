const HTTP_URL = /^https?:\/\//i

function normalizeBasePath(value: string | undefined): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (!trimmed || trimmed === '/') return ''
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading
}

export function getBasePath(): string {
  return normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH)
}

export function withBasePath(path: string): string {
  if (!path) return getBasePath() || '/'
  if (HTTP_URL.test(path)) return path
  const basePath = getBasePath()
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!basePath) return normalizedPath
  if (normalizedPath === basePath || normalizedPath.startsWith(`${basePath}/`)) {
    return normalizedPath
  }
  return `${basePath}${normalizedPath}`
}

export function joinBaseUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
  const normalizedPath = withBasePath(path)
  return `${cleanBase}${normalizedPath}`
}
