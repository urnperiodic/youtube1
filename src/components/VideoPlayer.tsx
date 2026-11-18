import React, { useEffect, useRef, useState } from 'react';
import { PlayItem, PlayerMode } from '../types';
import { Parser } from '../utils/parser';
import {
  INVIDIOUS_EMBED_INSTANCES,
  NativeStreamResult,
  buildInvidiousEmbedUrl,
  fetchNativeStream,
  getInvidiousEmbedInstances,
} from '../utils/player';

interface VideoPlayerProps {
  current: PlayItem | null;
  autoplay: boolean;
  playerMode: PlayerMode;
  isFav: boolean;
  onToggleFav: () => void;
  onUpdateMeta: (item: PlayItem) => void;
  onToast: (msg: string) => void;
  onToggleFocusMode: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  current,
  autoplay,
  playerMode,
  isFav,
  onToggleFav,
  onUpdateMeta,
  onToast,
  onToggleFocusMode,
}) => {
  const [loading, setLoading] = useState(true);
  const [instances, setInstances] = useState<string[]>(INVIDIOUS_EMBED_INSTANCES);
  const [instanceIdx, setInstanceIdx] = useState(0);
  const [activeMode, setActiveMode] = useState<'native' | 'embed'>(
    playerMode === 'embed' ? 'embed' : 'native'
  );
  const [nativeStream, setNativeStream] = useState<NativeStreamResult | null>(null);
  const [nativeFailed, setNativeFailed] = useState(false);

  const frameWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Discover healthy Invidious instances in background
  useEffect(() => {
    let active = true;
    getInvidiousEmbedInstances().then((list) => {
      if (active && list.length) {
        setInstances(list);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  // Resolve playback mode & stream when video or playerMode changes
  useEffect(() => {
    if (!current) return;

    setLoading(true);
    setNativeStream(null);
    setNativeFailed(false);

    requestAnimationFrame(() => {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    const isPlaylist = current.kind === 'playlist';
    if (isPlaylist || playerMode === 'embed' || !current.videoId) {
      setActiveMode('embed');
      return;
    }

    setActiveMode('native');
    const ctrl = new AbortController();

    fetchNativeStream(current.videoId, 2600, ctrl.signal).then((stream) => {
      if (ctrl.signal.aborted) return;

      if (stream) {
        setNativeStream(stream);
        if (stream.title || stream.author || stream.thumb) {
          onUpdateMeta({
            ...current,
            title: current.title || stream.title,
            author: current.author || stream.author,
            thumb: current.thumb || stream.thumb,
          });
        }
      } else if (playerMode === 'auto') {
        setActiveMode('embed');
      } else {
        setNativeFailed(true);
        setLoading(false);
      }
    });

    return () => {
      ctrl.abort();
    };
  }, [current?.videoId, current?.listId, playerMode]);

  // Fetch metadata via noembed.com (avoids direct youtube.com requests)
  useEffect(() => {
    if (!current) return;
    if (current.kind === 'playlist' && !current.listId) return;
    if (current.kind !== 'playlist' && !current.videoId) return;
    if (current.title && current.author) return;

    let cancelled = false;
    const targetUrl =
      current.kind === 'playlist'
        ? `https://www.youtube.com/playlist?list=${current.listId}`
        : `https://youtu.be/${current.videoId}`;

    const fetchMeta = async () => {
      try {
        const res = await fetch(
          `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`
        );
        if (!res.ok) throw new Error('oembed ' + res.status);
        const d = await res.json();
        if (d?.error) throw new Error(d.error);

        if (!cancelled) {
          onUpdateMeta({
            ...current,
            title: d.title || current.title,
            author: d.author_name || current.author,
            thumb: d.thumbnail_url || current.thumb,
          });
        }
      } catch {
        if (!cancelled && !current.title) {
          onUpdateMeta({
            ...current,
            title: current.kind === 'playlist' ? 'YouTube Playlist' : 'YouTube Video',
            author: current.author || 'Unknown channel',
          });
        }
      }
    };

    fetchMeta();

    return () => {
      cancelled = true;
    };
  }, [current?.videoId, current?.listId]);

  if (!current) return null;
  if (current.kind === 'playlist' && !current.listId) return null;
  if (current.kind !== 'playlist' && !current.videoId) return null;

  const currentInstance = instances[instanceIdx % instances.length] || INVIDIOUS_EMBED_INSTANCES[0];
  const embedSrc = buildInvidiousEmbedUrl(currentInstance, current, autoplay);

  const currentHost = (() => {
    try {
      return new URL(currentInstance).hostname;
    } catch {
      return currentInstance;
    }
  })();

  const handleCycleInstance = () => {
    const nextIdx = (instanceIdx + 1) % instances.length;
    setInstanceIdx(nextIdx);
    setActiveMode('embed');
    setLoading(true);
    try {
      onToast(`Switched to ${new URL(instances[nextIdx]).hostname}`);
    } catch {
      onToast('Switched Invidious instance');
    }
  };

  const handleTogglePlaybackMode = () => {
    if (current.kind === 'playlist') {
      onToast('Playlists use Invidious embed');
      return;
    }

    if (activeMode === 'embed') {
      if (nativeStream) {
        setActiveMode('native');
        setNativeFailed(false);
        setLoading(false);
      } else if (current.videoId) {
        setActiveMode('native');
        setNativeFailed(false);
        setLoading(true);
        fetchNativeStream(current.videoId, 4000).then((stream) => {
          if (stream) {
            setNativeStream(stream);
          } else {
            setActiveMode('embed');
            onToast('No native stream available — using Invidious embed');
          }
        });
      }
    } else {
      setActiveMode('embed');
      setLoading(true);
    }
  };

  const handleCopy = () => {
    const url = Parser.shareUrl(current);
    navigator.clipboard
      ?.writeText(url)
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

  return (
    <section id="player-section" ref={sectionRef} className="active" aria-label="Video player">
      <article className="player-card">
        <div className="player-frame-wrap" id="frame-wrap" ref={frameWrapRef}>
          <div className={`player-skeleton ${loading ? '' : 'hidden'}`} id="player-skeleton">
            <div className="spin" aria-label="Loading video"></div>
          </div>

          {activeMode === 'native' && nativeStream ? (
            <video
              ref={videoRef}
              key={`native-${current.videoId}-${nativeStream.streamUrl}`}
              src={nativeStream.streamUrl}
              controls
              autoPlay={autoplay}
              playsInline
              onLoadedMetadata={() => {
                if (current.start && videoRef.current) {
                  videoRef.current.currentTime = current.start;
                }
                setLoading(false);
              }}
              onCanPlay={() => setLoading(false)}
              onError={() => {
                if (playerMode === 'auto') {
                  setActiveMode('embed');
                  setLoading(true);
                } else {
                  setNativeFailed(true);
                  setLoading(false);
                }
              }}
            />
          ) : activeMode === 'native' && nativeFailed ? (
            <div className="player-native-error">
              <p>Direct stream blocked or unavailable from public Piped/Invidious APIs.</p>
              <button
                type="button"
                className="chip-btn is-active"
                onClick={() => {
                  setActiveMode('embed');
                  setLoading(true);
                }}
              >
                Use Invidious Embed
              </button>
            </div>
          ) : activeMode === 'embed' ? (
            <iframe
              key={`inv-${currentInstance}-${current.videoId}-${current.listId}-${current.start}`}
              src={embedSrc}
              title="Invidious video player"
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              onLoad={() => {
                setTimeout(() => setLoading(false), 220);
              }}
            />
          ) : null}
        </div>

        <div className="player-meta">
          <div className="meta-text">
            <div id="video-title">
              {current.title || (current.kind === 'playlist' ? 'Playlist' : 'Loading title…')}
            </div>
            <div id="video-channel">
              {[
                current.author || 'Video',
                activeMode === 'native' && nativeStream
                  ? `Native · ${nativeStream.quality} (${nativeStream.source})`
                  : `Invidious · ${currentHost}`,
              ].join(' · ')}
            </div>
          </div>

          <div className="player-actions">
            {current.kind !== 'playlist' && (
              <button
                type="button"
                className="chip-btn"
                title="Switch between Native video and Invidious embed"
                onClick={handleTogglePlaybackMode}
              >
                {activeMode === 'native' ? 'Use Embed' : 'Try Native'}
              </button>
            )}

            {activeMode === 'embed' && (
              <button
                type="button"
                className="chip-btn"
                title="Try another Invidious instance if blocked"
                onClick={handleCycleInstance}
              >
                Switch Instance
              </button>
            )}

            <button
              type="button"
              className={`chip-btn ${isFav ? 'is-active' : ''}`}
              title="Favorite (f)"
              onClick={onToggleFav}
            >
              <svg viewBox="0 0 24 24">
                <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.6 5 6.2 5c2.2 0 3.6 1.1 4.5 2.4h2.6C14.2 6.1 15.6 5 17.8 5c3.6 0 5.8 3.6 4.2 6.7C19.5 16.3 12 21 12 21z" />
              </svg>
              {isFav ? 'Saved' : 'Save'}
            </button>

            <button type="button" className="chip-btn" title="Copy share link (c)" onClick={handleCopy}>
              Share
            </button>

            <button
              type="button"
              className="chip-btn"
              title="Fullscreen (Shift+F)"
              onClick={handleFullscreen}
            >
              Fullscreen
            </button>

            <button
              type="button"
              className="chip-btn"
              title="Focus mode (d)"
              onClick={onToggleFocusMode}
            >
              Focus
            </button>
          </div>
        </div>
      </article>
    </section>
  );
};
