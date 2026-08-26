export function isSessionTokenExpired(token: string, nowMs = Date.now()): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadSegment = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (payloadSegment.length % 4)) % 4);
    const payload = JSON.parse(atob(`${payloadSegment}${padding}`));
    if (typeof payload.exp !== 'number') return false;
    return (nowMs / 1000) >= (payload.exp - 5);
  } catch {
    return true;
  }
}
