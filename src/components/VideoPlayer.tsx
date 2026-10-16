import React, { useEffect, useRef, useState } from 'react';
import { PlayItem } from '../types';
import { Parser } from '../utils/parser';

interface VideoPlayerProps {
  current: PlayItem | null;
  autoplay: boolean;
  isFav: boolean;
  onToggleFav: () => void;
  onUpdateMeta: (item: PlayItem) => void;
  onToast: (msg: string) => void;
  onToggleFocusMode: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  current,
  autoplay,
  isFav,
  onToggleFav,
  onUpdateMeta,
  onToast,
  onToggleFocusMode,
}) => {
  const [loading, setLoading] = useState(true);
  const frameWrapRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Re-load skeleton when current item changes
  useEffect(() => {
    if (current) {
      setLoading(true);
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [current?.videoId, current?.listId]);

  // Fetch oEmbed metadata
  useEffect(() => {
    if (!current) return;
    let cancelled = false;

    const fetchMeta = async () => {
      const watchUrl =
        current.kind === 'playlist'
          ? `https://www.youtube.com/playlist?list=${current.listId}`
          : `https://www.youtube.com/watch?v=${current.videoId}`;

      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
        );
        if (!res.ok) throw new Error('oembed ' + res.status);
        const d = await res.json();
        if (!cancelled) {
          const updated: PlayItem = {
            ...current,
            title: d.title || current.title,
            author: d.author_name || current.author,
            thumb: d.thumbnail_url || current.thumb,
          };
          onUpdateMeta(updated);
        }
      } catch {
        if (!cancelled && !current.title) {
          const updated: PlayItem = {
            ...current,
            title: current.kind === 'playlist' ? 'YouTube Playlist' : 'YouTube Video',
            author: current.author || 'Unknown channel',
          };
          onUpdateMeta(updated);
        }
      }
    };

    if (!current.title || !current.author) {
      fetchMeta();
    }

    return () => {
      cancelled = true;
    };
  }, [current?.videoId, current?.listId]);

  if (!current) return null;

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    iv_load_policy: '3',
    playsinline: '1',
    autoplay: autoplay ? '1' : '0',
    enablejsapi: '1',
    origin: typeof window !== 'undefined' && window.location.origin.startsWith('http') ? window.location.origin : '',
  });

  if (current.start) {
    params.set('start', String(current.start));
  }

  let embedSrc = '';
  if (current.kind === 'playlist') {
    params.set('list', current.listId || '');
    params.set('listType', 'playlist');
    embedSrc = `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
  } else {
    if (current.listId) params.set('list', current.listId);
    embedSrc = `https://www.youtube-nocookie.com/embed/${current.videoId}?${params.toString()}`;
  }

  const handleCopy = () => {
    const url = Parser.shareUrl(current);
    navigator.clipboard?.writeText(url)
      .then(() => onToast('Share link copied'))
      .catch(() => onToast(url));
  };

  const handleFullscreen = () => {
    const wrap = frameWrapRef.current as any;
    if (!wrap) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      (wrap.requestFullscreen || wrap.webkitRequestFullscreen)?.call(wrap);
    }
  };

  const handlePip = () => {
    onToast('Right-click the video twice → "Picture in picture"');
  };

  return (
    <section id="player-section" ref={sectionRef} className="active" aria-label="Video player">
      <article className="player-card">
        <div className="player-frame-wrap" id="frame-wrap" ref={frameWrapRef}>
          <div className={`player-skeleton ${loading ? '' : 'hidden'}`} id="player-skeleton">
            <div className="spin" aria-label="Loading video"></div>
          </div>
          <iframe
            key={`${current.videoId}-${current.listId}-${current.start}`}
            src={embedSrc}
            title="YouTube video player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
            allowFullScreen
            onLoad={() => {
              setTimeout(() => setLoading(false), 220);
            }}
          />
        </div>

      </article>
    </section>
  );
};
