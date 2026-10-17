import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function decodeHtml(html?: string): string {
  if (!html) return '';
  return html
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
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

async function fetchInvidiousFallback(q: string): Promise<any[]> {
  const instances = [
    'https://inv.nadeko.net',
    'https://invidious.nerdvpn.de',
    'https://yewtu.be',
    'https://invidious.f5.si',
    'https://iv.melmac.space',
  ];

  const tryInstance = async (base: string): Promise<any[]> => {
    const response = await fetch(`${base}/api/v1/search?q=${encodeURIComponent(q)}&type=video`);
    if (!response.ok) throw new Error(`invidious ${response.status}`);

    const list = await response.json();
    if (!Array.isArray(list) || !list.length) return [];

    return list
      .filter((x: any) => x.type === 'video' && x.videoId)
      .map((x: any) => ({
        kind: 'video',
        videoId: x.videoId,
        title: decodeHtml(x.title),
        author: decodeHtml(x.author),
        description: decodeHtml(x.description || ''),
        viewCount: x.viewCount || 0,
        lengthSeconds: x.lengthSeconds || 0,
        publishedAt: x.publishedText || '',
        thumb: `https://i.ytimg.com/vi/${x.videoId}/hqdefault.jpg`,
      }));
  };

  const results = await Promise.any(instances.map(tryInstance));
  return Array.isArray(results) ? results : [];
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/youtube1/' : '/',
  plugins: [
    react(),
    {
      name: 'local-api-search',
      configureServer(server) {
        server.middlewares.use('/api/search', async (req, res, next) => {
          const url = new URL(req.url || '/', 'http://localhost');
          const q = url.searchParams.get('q');

          if (!q || typeof q !== 'string') {
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Missing query parameter q' }));
            return;
          }

          const apiKey = process.env.YOUTUBE_API_KEY;
          if (!apiKey) {
            try {
              const fallback = await fetchInvidiousFallback(q);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(fallback));
              return;
            } catch {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify([]));
              return;
            }
          }

          try {
            const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${encodeURIComponent(
              q
            )}&key=${apiKey}`;

            const searchRes = await fetch(searchUrl);
            if (!searchRes.ok) {
              throw new Error(`YouTube API search failed: ${searchRes.status}`);
            }

            const data = await searchRes.json();
            if (!data.items || !Array.isArray(data.items) || !data.items.length) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify([]));
              return;
            }

            const videoIds = data.items
              .map((it: any) => it.id?.videoId)
              .filter(Boolean)
              .join(',');

            const detailsMap: Record<string, { duration: number; viewCount: number }> = {};
            if (videoIds) {
              try {
                const detailsRes = await fetch(
                  `https://www.googleapis.com/youtube/v3/videos?part=contentDetails,statistics&id=${videoIds}&key=${apiKey}`
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
              } catch {
                // Continue without stats.
              }
            }

            const results = data.items
              .filter((it: any) => it.id?.videoId)
              .map((it: any) => {
                const vid = it.id.videoId;
                const snip = it.snippet || {};
                const details = detailsMap[vid];
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
                  publishedAt: snip.publishedAt || '',
                  thumb: thumbUrl,
                };
              });

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(results));
          } catch (error: any) {
            try {
              const fallback = await fetchInvidiousFallback(q);
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(fallback));
              return;
            } catch {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: error?.message || 'Internal server error' }));
            }
          }
        });
      },
    },
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
