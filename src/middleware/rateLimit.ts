type Bucket = { count: number; resetAt: number }
let store = new Map<string, Bucket>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || now >= bucket.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (bucket.count >= maxRequests) return false
  bucket.count++
  return true
}

export function resetRateLimiter(): void {
  store = new Map()
}

export function getRateLimitKey(prefix: string, request: Request, server: any): string {
  const ip = server?.requestIP?.(request)?.address ?? request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1'
  return `${prefix}:${ip}`
}
