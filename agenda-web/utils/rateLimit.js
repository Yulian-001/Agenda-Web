const rateLimitMap = new Map();

export function rateLimit(key, limit, windowMs) {
    const now = Date.now();
    const requests = rateLimitMap.get(key)?.filter(timestamp => timestamp > now - windowMs) ?? [];
    if (requests.length >= limit) return new Date(requests[0] + windowMs);
    requests.push(now);
    rateLimitMap.set(key, requests);
    return null;
}
