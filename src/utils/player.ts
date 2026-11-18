import { PlayItem } from '../types';

export const INVIDIOUS_EMBED_INSTANCES = [
  'https://invidious.tiekoetter.com',
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://invidious.private.coffee',
  'https://yt.chocolatemoo53.com',
];

export const PIPED_API_INSTANCES = [
  'https://api.piped.private.coffee',
  'https://pipedapi.ducks.party',
  'https://pipedapi.kavin.rocks',
  'https://pipedapi.adminforge.de',
  'https://api.piped.yt',
];

export const INVIDIOUS_API_INSTANCES = [
  'https://yt.chocolatemoo53.com',
  'https://invidious.tiekoetter.com',
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://invidious.private.coffee',
];

export interface NativeStreamResult {
  streamUrl: string;
  quality: string;
  source: string;
  title?: string;
  author?: string;
  thumb?: string;
}

let discoveredInstancesCache: string[] | null = null;
let discoveryPromise: Promise<string[]> | null = null;

export async function getInvidiousEmbedInstances(): Promise<string[]> {
  if (discoveredInstancesCache) return discoveredInstancesCache;

  if (!discoveryPromise) {
    discoveryPromise = (async () => {
      const merged = new Set<string>(INVIDIOUS_EMBED_INSTANCES);
      try {
        const ctrl = new AbortController();
        const timer = window.setTimeout(() => ctrl.abort(), 3500);
        const res = await fetch('https://api.invidious.io/instances.json?sort_by=health', {
          signal: ctrl.signal,
        });
        window.clearTimeout(timer);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            for (const entry of data) {
              const info = Array.isArray(entry) ? entry[1] : null;
              if (info?.type === 'https' && typeof info.uri === 'string') {
                merged.add(info.uri.replace(/\/+$/, ''));
              }
            }
          }
        }
      } catch {
        // Use curated list when directory lookup fails
      }
      discoveredInstancesCache = Array.from(merged);
      return discoveredInstancesCache;
    })();
  }

  return discoveryPromise;
}

function qualityScore(label?: string): number {
  if (!label) return 0;
  const m = label.match(/(\d{3,4})p/);
  const height = m ? parseInt(m[1], 10) : 0;
  if (height === 720) return 100;
  if (height === 1080) return 90;
  if (height === 480) return 80;
  if (height === 360) return 70;
  return height > 0 ? 50 : 10;
}

async function fetchPipedStream(
  base: string,
  videoId: string,
  signal: AbortSignal
): Promise<NativeStreamResult> {
  const res = await fetch(`${base}/streams/${encodeURIComponent(videoId)}`, { signal });
  if (!res.ok) throw new Error(`piped ${res.status}`);
  const data = await res.json();
  if (!data || data.error) throw new Error(data?.error || 'piped error');

  const streams = Array.isArray(data.videoStreams)
    ? data.videoStreams.filter((s: any) => s?.url && s.videoOnly === false)
    : [];

  streams.sort((a: any, b: any) => {
    const mp4A = String(a.mimeType || '').includes('mp4') ? 10 : 0;
    const mp4B = String(b.mimeType || '').includes('mp4') ? 10 : 0;
    return qualityScore(b.quality) + mp4B - (qualityScore(a.quality) + mp4A);
  });

  const best = streams[0];
  const streamUrl = best?.url || data.hls;
  if (!streamUrl) throw new Error('no playable piped stream');

  return {
    streamUrl,
    quality: best?.quality || 'HLS',
    source: new URL(base).hostname,
    title: data.title || undefined,
    author: data.uploader || undefined,
    thumb: data.thumbnailUrl || undefined,
  };
}

async function fetchInvidiousStream(
  base: string,
  videoId: string,
  signal: AbortSignal
): Promise<NativeStreamResult> {
  const res = await fetch(
    `${base}/api/v1/videos/${encodeURIComponent(videoId)}?local=true`,
    { signal }
  );
  if (!res.ok) throw new Error(`invidious ${res.status}`);
  const data = await res.json();
  if (!data || data.error) throw new Error(data?.error || 'invidious error');

  const streams = Array.isArray(data.formatStreams)
    ? data.formatStreams.filter((s: any) => s?.url)
    : [];

  streams.sort((a: any, b: any) => {
    const mp4A = a.container === 'mp4' ? 10 : 0;
    const mp4B = b.container === 'mp4' ? 10 : 0;
    return qualityScore(b.qualityLabel) + mp4B - (qualityScore(a.qualityLabel) + mp4A);
  });

  const best = streams[0];
  if (!best?.url) throw new Error('no playable invidious stream');

  const rawUrl = String(best.url);
  const streamUrl = rawUrl.startsWith('/') ? `${base}${rawUrl}` : rawUrl;

  const thumb = Array.isArray(data.videoThumbnails)
    ? data.videoThumbnails.find((t: any) => t.quality === 'high')?.url ||
      data.videoThumbnails[0]?.url
    : undefined;

  return {
    streamUrl,
    quality: best.qualityLabel || best.resolution || 'MP4',
    source: new URL(base).hostname,
    title: data.title || undefined,
    author: data.author || undefined,
    thumb: thumb && String(thumb).startsWith('/') ? `${base}${thumb}` : thumb,
  };
}

export async function fetchNativeStream(
  videoId: string,
  timeoutMs = 2600,
  externalSignal?: AbortSignal
): Promise<NativeStreamResult | null> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), timeoutMs);

  const onAbort = () => ctrl.abort();
  externalSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    const attempts = [
      ...PIPED_API_INSTANCES.map((base) => fetchPipedStream(base, videoId, ctrl.signal)),
      ...INVIDIOUS_API_INSTANCES.map((base) => fetchInvidiousStream(base, videoId, ctrl.signal)),
    ];
    const result = await Promise.any(attempts);
    ctrl.abort(); // cancel remaining in-flight requests
    return result;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
    externalSignal?.removeEventListener('abort', onAbort);
  }
}

export function buildInvidiousEmbedUrl(
  instance: string,
  current: PlayItem,
  autoplay: boolean
): string {
  const base = instance.replace(/\/+$/, '');
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    local: 'true',
    listen: '0',
    player_style: 'invidious',
    related_videos: 'false',
  });

  if (current.start && current.start > 0) {
    params.set('t', String(current.start));
  }

  if (current.kind === 'playlist') {
    params.set('list', current.listId || '');
    return `${base}/embed/videoseries?${params.toString()}`;
  }

  if (current.listId) {
    params.set('list', current.listId);
  }

  return `${base}/embed/${encodeURIComponent(current.videoId || '')}?${params.toString()}`;
}
