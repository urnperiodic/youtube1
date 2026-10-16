import { PlayItem } from '../types';

export const Parser = {
  parse(input: string): PlayItem | null {
    const raw = (input || '').trim();
    if (!raw) return null;

    if (
      /^[A-Za-z0-9_-]{11}$/.test(raw) &&
      !/^https?:/.test(raw) &&
      !raw.includes('.') &&
      /[0-9_-]/.test(raw)
    ) {
      // Bare 11-char video ID (must contain a digit/dash/underscore to avoid matching plain words)
      return { kind: 'video', videoId: raw, start: 0 };
    }

    let url: URL;
    try {
      url = new URL(raw.match(/^https?:\/\//i) ? raw : 'https://' + raw);
    } catch {
      return null;
    }

    const host = url.hostname.replace(/^www\.|^m\./, '');
    if (!/(^|\.)((youtube\.com)|(youtube-nocookie\.com)|(youtu\.be))$/.test(host)) {
      return null;
    }

    const start = this.parseStart(url.searchParams.get('t') || url.searchParams.get('start'));
    const list = url.searchParams.get('list');
    const v = url.searchParams.get('v');
    const path = url.pathname;

    if (host === 'youtu.be') {
      const id = path.slice(1).split('/')[0];
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) {
        return { kind: 'video', videoId: id, listId: list || null, start };
      }
      return null;
    }

    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) {
      return { kind: 'video', videoId: v, listId: list || null, start };
    }

    const m = path.match(/^\/(shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) {
      return { kind: 'video', videoId: m[2], listId: list || null, start };
    }

    if (path.startsWith('/playlist') && list) {
      return { kind: 'playlist', listId: list, start: 0 };
    }

    if (list) {
      return { kind: 'playlist', listId: list, start: 0 };
    }

    return null;
  },

  looksLikeUrl(s: string): boolean {
    return /^(https?:\/\/|www\.)/i.test(s) || /^[a-z0-9.-]+\.[a-z]{2,}\//i.test(s);
  },

  parseStart(t: string | null): number {
    if (!t) return 0;
    if (/^\d+$/.test(t)) return parseInt(t, 10);
    const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
    if (!m) return 0;
    return (
      parseInt(m[1] || '0', 10) * 3600 +
      parseInt(m[2] || '0', 10) * 60 +
      parseInt(m[3] || '0', 10)
    );
  },

  shareUrl(item: PlayItem): string {
    if (item.kind === 'playlist') {
      return `https://www.youtube.com/playlist?list=${item.listId}`;
    }
    const u = `https://youtu.be/${item.videoId}`;
    const q: string[] = [];
    if (item.listId) q.push(`list=${item.listId}`);
    if (item.start) q.push(`t=${item.start}`);
    return q.length ? `${u}?${q.join('&')}` : u;
  },
};
