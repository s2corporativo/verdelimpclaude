import { prisma } from "@/lib/prisma";

export async function getCached(key: string): Promise<unknown | null> {
  try {
    const cached = await prisma.integrationCache.findUnique({ where: { cacheKey: key } });
    if (!cached) return null;
    if (new Date(cached.expiresAt) < new Date()) {
      await prisma.integrationCache.delete({ where: { cacheKey: key } });
      return null;
    }
    await prisma.integrationCache.update({ where: { cacheKey: key }, data: { hitsCount: { increment: 1 } } });
    return JSON.parse(cached.dataJson);
  } catch { return null; }
}

export async function setCached(key: string, slug: string, data: unknown, ttlMs: number): Promise<void> {
  try {
    await prisma.integrationCache.upsert({
      where: { cacheKey: key },
      update: { dataJson: JSON.stringify(data), cachedAt: new Date(), expiresAt: new Date(Date.now() + ttlMs) },
      create: { cacheKey: key, integrationSlug: slug, dataJson: JSON.stringify(data), expiresAt: new Date(Date.now() + ttlMs) },
    });
  } catch { /* silenciar erro de cache */ }
}

export async function fetchWithCache(url: string, cacheKey: string, slug: string, ttlMs: number): Promise<{ data: unknown; cached: boolean }> {
  const cached = await getCached(cacheKey);
  if (cached) return { data: cached, cached: true };

  const res = await fetch(url, { signal: AbortSignal.timeout(8000), next: { revalidate: 0 } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  await setCached(cacheKey, slug, data, ttlMs);
  return { data, cached: false };
}
