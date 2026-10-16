import type { VercelRequest, VercelResponse } from '@vercel/node';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Missing query parameter q' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YOUTUBE_API_KEY environment variable not set on server' });
  }

  try {
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=25&q=${encodeURIComponent(
      q
    )}&key=${apiKey}`;

    const searchRes = await fetch(searchUrl);
    if (!searchRes.ok) {
      return res.status(searchRes.status).json({ error: 'YouTube API search failed' });
    }

    const data = await searchRes.json();
    if (!data.items || !Array.isArray(data.items) || !data.items.length) {
      return res.status(200).json([]);
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
      } catch (err) {
        console.warn('Failed to fetch video statistics:', err);
      }
    }

    const results = data.items
      .filter((it: any) => it.id?.videoId)
      .map((it: any) => {
        const vid = it.id.videoId;
        const snip = it.snippet || {};
        const details = detailsMap[vid];
        const publishedAt = snip.publishedAt;
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
          publishedAt: publishedAt || '',
          thumb: thumbUrl,
        };
      });

    return res.status(200).json(results);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
