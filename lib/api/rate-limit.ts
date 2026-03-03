type Bucket = {
  startedAt: number
  count: number
}

const buckets = new Map<string, Bucket>()

export function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
  const now = Date.now()
  const current = buckets.get(key)

  if (!current || now - current.startedAt > windowMs) {
    buckets.set(key, { startedAt: now, count: 1 })
    return false
  }

  if (current.count >= maxRequests) {
    return true
  }

  current.count += 1
  buckets.set(key, current)
  return false
}

export function getRequestIp(request: Request) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded && forwarded.trim().length > 0) {
    return forwarded.split(',')[0]?.trim() || 'unknown'
  }
  return request.headers.get('x-real-ip') || 'unknown'
}
