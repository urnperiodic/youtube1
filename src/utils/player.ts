import { PlayItem } from '../types';

export function buildClassroomUrl(item: PlayItem | string): string {
  if (typeof item === 'string') {
    return `https://classroom.google.com/u/0/n/pck?v=${encodeURIComponent(item)}`;
  }
  if (item.videoId) {
    return `https://classroom.google.com/u/0/n/pck?v=${encodeURIComponent(item.videoId)}`;
  }
  if (item.listId) {
    return `https://classroom.google.com/u/0/n/pck?list=${encodeURIComponent(item.listId)}`;
  }
  return '';
}

export function openExternalTab(url: string): void {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function openInAboutBlank(targetUrl: string, tabTitle = 'Home'): boolean {
  try {
    const win = window.open('about:blank', '_blank');
    if (!win || win.closed) {
      return false;
    }

    const safeUrl = JSON.stringify(targetUrl);
    const safeTitle = (tabTitle.trim() || 'Home').replace(/[<>&"]/g, '');

    win.document.open();
    win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeTitle}</title>
  <link rel="icon" href="https://ssl.gstatic.com/classroom/favicon.png" />
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
    iframe { position: fixed; inset: 0; width: 100vw; height: 100vh; border: 0; }
  </style>
</head>
<body>
  <iframe id="app-frame" allow="autoplay; fullscreen; clipboard-read; clipboard-write" allowfullscreen></iframe>
  <script>document.getElementById('app-frame').src = ${safeUrl};</script>
</body>
</html>`);
    win.document.close();
    return true;
  } catch {
    return false;
  }
}
