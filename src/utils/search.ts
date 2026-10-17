import { PlayItem } from '../types';
import { timeAgo } from './formatters';

export const YOUTUBE_API_KEY =
  (import.meta.env.VITE_YOUTUBE_API_KEY as string) ||
  'AIzaSyA9OIpr0PMvtNvTTA9a1V31ZKxVh6ya8D4';

export const INVIDIOUS_INSTANCES = [
  'https://inv.nadeko.net',
  'https://invidious.nerdvpn.de',
  'https://yewtu.be',
  'https://invidious.f5.si',
  'https://iv.melmac.space',
];

function shouldUseServerApi(): boolean {
  if (typeof window === 'undefined') return false;
  return import.meta.env.PROD;
}

function decodeHtml(html?: string): string {
  if (!html) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = html;
  return txt.value;
}

function parseIsoDuration(duration?: string): number {
  if (!duration) return 0;
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h * 3600 + m * 60 + s;
}

export function norm(s?: string): string {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokens(s?: string): string[] {
  const STOP = new Set([
    'the', 'a', 'an', 'of', 'to', 'in', 'on', 'and', 'or', 'for', 'with', 'how', 'is', 'at', 'by', 'it',
  ]);
  return norm(s)
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

/** Relevance score: higher = more similar to the query. */
export function calculateRelevance(q: string, item: Partial<PlayItem>): number {
  const qn = norm(q);
  const qt = tokens(q);
  if (!qn) return 0;

  const title = norm(item.title);
  const chan = norm(item.author);
  const desc = norm(item.description || '').slice(0, 500);
  let score = 0;

  // Whole-phrase matches
  if (title === qn) score += 40;
  else if (title.includes(qn)) score += 18;

  if (chan === qn) score += 32; // channel name = strong signal
  else if (chan && (chan.includes(qn) || qn.includes(chan))) score += 15;

  // Keyword / token matches
  const tt = title.split(' ');
  const ct = chan.split(' ');
  const dt = new Set(desc.split(' '));

  for (const t of qt) {
    if (tt.includes(t)) score += 6; // exact title keyword
    else if (tt.some((w) => w.startsWith(t) && t.length > 2)) score += 3; // fuzzy prefix

    if (ct.includes(t)) score += 8; // channel keyword
    else if (ct.some((w) => w.startsWith(t) && t.length > 2)) score += 4;

    if (dt.has(t)) score += 1.5; // description keyword
  }

  // Phrase-order bonus: query tokens appearing in sequence in the title
  if (qt.length > 1) {
    for (let i = 0; i < qt.length - 1; i++) {
      const a = tt.indexOf(qt[i]);
      const b = tt.indexOf(qt[i + 1]);
      if (a !== -1 && b === a + 1) score += 2.5;
    }
  }

  // Popularity tiebreaker (log-scaled so it never dominates relevance)
  if (item.viewCount) {
    score += Math.min(Math.log10(item.viewCount + 1) * 0.5, 4);
  }

  return score;
}

/**
 * Searches YouTube using the official YouTube Data API v3.
 * Enriches results with video statistics (view counts) and duration.
 */
export async function fetchYouTubeApiSearch(q: string): Promise<PlayItem[] | null> {
  // Only use the Vercel API route in production builds; Vite dev serves the source file instead of a JSON endpoint.
  if (shouldUseServerApi()) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data.map((item: any) => ({
            ...item,
            publishedText: item.publishedAt ? timeAgo(new Date(item.publishedAt).getTime()) : '',
          }));
        }
      }
    } catch {
      // Serverless route not available in local dev without vercel dev — fallback to direct API
    }
  }

  if (!YOUTUBE_API_KEY) return null;

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${encodeURIComponent(
      q
    )}&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(searchUrl);
    if (!res.ok) {
      console.warn('YouTube API search status:', res.status);
      return null;
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items) || !data.items.length) {
      return [];
    }

    const videoIds = data.items
      .map((it: any) => it.id?.videoId)
      .filter(Boolean)
      .join(',');

    // Optional enrichment: get view counts and durations
    const detailsMap: Record<string, { duration: number; viewCount: number }> = {};
    if (videoIds) {
      try {
        const detailsRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${YOUTUBE_API_KEY}`
        );
        if (detailsRes.ok) {
          const detailsData = await detailsRes.json();
          if (detailsData.items && Array.isArray(detailsData.items)) {
            for (const v of detailsData.items) {
              detailsMap[v.id] = {
                duration: parseIsoDuration(v.contentDetails?.duration),
                viewCount: v.statistics?.viewCount ? parseInt(v.statistics.viewCount, 10) : 0,
              };
            }
          }
        }
      } catch (err) {
        // Non-blocking: continue with basic snippets
        console.warn('Failed to fetch video statistics:', err);
      }
    }

    return data.items
      .filter((it: any) => it.id?.videoId)
      .map((it: any): PlayItem => {
        const vid = it.id.videoId;
        const snip = it.snippet || {};
        const details = detailsMap[vid];
        const publishedTime = snip.publishedAt ? timeAgo(new Date(snip.publishedAt).getTime()) : '';
        const thumbUrl =
          snip.thumbnails?.high?.url ||
          snip.thumbnails?.medium?.url ||
          snip.thumbnails?.default?.url ||
          `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

        return {
          kind: 'video',
          videoId: vid,
          title: decodeHtml(snip.title),
          author: decodeHtml(snip.channelTitle),
          description: decodeHtml(snip.description),
          viewCount: details?.viewCount || 0,
          lengthSeconds: details?.duration || 0,
          publishedText: publishedTime,
          thumb: thumbUrl,
        };
      });
  } catch (err) {
    console.error('Error fetching from YouTube API:', err);
    return null;
  }
}

/**
 * Fallback remote search via public Invidious instances.
 */
export async function fetchInvidiousSearch(q: string): Promise<PlayItem[] | null> {
  const tryInstance = (base: string): Promise<PlayItem[]> =>
    new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => {
        ctrl.abort();
        reject(new Error('timeout'));
      }, 7000);

      fetch(`${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video`, {
        signal: ctrl.signal,
      })
        .then((r) => {
          if (!r.ok) throw new Error('http ' + r.status);
          return r.json();
        })
        .then((list) => {
          clearTimeout(timer);
          if (!Array.isArray(list) || !list.length) return reject(new Error('empty'));
          const mapped = list
            .filter((x: any) => x.type === 'video' && x.videoId)
            .map((x: any): PlayItem => ({
              kind: 'video',
              videoId: x.videoId,
              title: decodeHtml(x.title),
              author: decodeHtml(x.author),
              description: decodeHtml(x.description || ''),
              viewCount: x.viewCount || 0,
              lengthSeconds: x.lengthSeconds || 0,
              publishedText: x.publishedText || '',
              thumb: `https://i.ytimg.com/vi/${x.videoId}/hqdefault.jpg`,
            }));
          resolve(mapped);
        })
        .catch((e) => {
          clearTimeout(timer);
          reject(e);
        });
    });

  try {
    return await Promise.any(INVIDIOUS_INSTANCES.map(tryInstance));
  } catch {
    return null;
  }
}

/**
 * Unified search: Tries official YouTube Data API first, then falls back to Invidious.
 */
export async function fetchRemoteSearch(q: string): Promise<PlayItem[] | null> {
  const youtubeResults = await fetchYouTubeApiSearch(q);
  if (youtubeResults !== null) {
    return youtubeResults;
  }

  // Fallback to Invidious if YouTube API was rate-limited or failed
  return await fetchInvidiousSearch(q);
}

export function searchLibrary(q: string, libraryItems: PlayItem[]): PlayItem[] {
  const seen = new Set<string>();
  const all: PlayItem[] = [];

  for (const it of libraryItems) {
    const key = it.videoId || ('pl:' + it.listId);
    if (seen.has(key)) continue;
    seen.add(key);
    all.push(it);
  }

  return all
    .map((it) => ({ it, s: calculateRelevance(q, it) }))
    .filter((x) => x.s >= 5)
    .sort((a, b) => b.s - a.s)
    .slice(0, 8)
    .map((x) => ({ ...x.it }));
}
