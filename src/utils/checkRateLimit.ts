export async function checkRateLimit(env: Env, ip: string, limit = 10, windowSec = 60): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const key = `${ip}:${Math.floor(now / windowSec)}`;

  const countStr = await env.RATE_LIMIT.get(key);
  const count = countStr ? parseInt(countStr, 10) : 0;

  if (count >= limit) {
    return false; // 超過
  }

  await env.RATE_LIMIT.put(key, (count + 1).toString(), {
    expirationTtl: windowSec + 1,
  });

  return true;
}
