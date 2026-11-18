// utils/rateLimit.js
const rateLimitMap = new Map();

export function rateLimit(ip, limit = 5, windowMs = 60000) {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, []);
    }

    const requests = rateLimitMap.get(ip);
    // Filtrar las peticiones que ya pasaron la ventana de tiempo
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);

    if (recentRequests.length >= limit) {
        return false; // Bloqueado
    }

    recentRequests.push(now);
    rateLimitMap.set(ip, recentRequests);
    return true; // Permitido
}