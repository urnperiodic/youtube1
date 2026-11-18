import React, { useEffect, useRef } from 'react';
import { PlayItem } from '../types';
import { Parser } from '../utils/parser';
import { buildClassroomUrl, openInAboutBlank } from '../utils/player';

interface VideoPlayerProps {
  current: PlayItem | null;
  isFav: boolean;
  classroomInAboutBlank: boolean;
  cloakTitle: string;
  onToggleFav: () => void;
  onUpdateMeta: (item: PlayItem) => void;
  onToast: (msg: string) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  current,
  isFav,
  classroomInAboutBlank,
  cloakTitle,
  onToggleFav,
  onUpdateMeta,
  onToast,
}) => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (current) {
      requestAnimationFrame(() => {
        sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }, [current?.videoId, current?.listId]);

  // Fetch metadata via noembed.com if title/author missing
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

  const classroomUrl = buildClassroomUrl(current);
  if (!classroomUrl) return null;

  const thumbUrl =
    current.thumb ||
    (current.videoId ? `https://i.ytimg.com/vi/${current.videoId}/hqdefault.jpg` : '');

  const handleCopy = () => {
    const url = classroomUrl || Parser.shareUrl(current);
    navigator.clipboard
      ?.writeText(url)
      .then(() => onToast('Classroom link copied'))
      .catch(() => onToast(url));
  };

  const handleOpenAboutBlank = (e: React.MouseEvent) => {
    e.preventDefault();
    const ok = openInAboutBlank(classroomUrl, cloakTitle);
    if (!ok) {
      onToast('Pop-up blocked — allow pop-ups or disable Dev about:blank mode');
    } else {
      onToast('Opened Classroom player in about:blank');
    }
  };

  return (
    <section id="player-section" ref={sectionRef} className="active" aria-label="Classroom video launcher">
      <article className="player-card">
        <div className="player-frame-wrap" id="frame-wrap">
          <div className="player-classroom-card">
            {thumbUrl && (
              <div className="classroom-thumb-wrap">
                <img
                  src={thumbUrl}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            )}
            <div className="classroom-card-body">
              <h3>{current.title || 'Opening in Google Classroom'}</h3>
              <p className="classroom-sub">
                {current.author ? `${current.author} · ` : ''}
                {classroomInAboutBlank
                  ? 'Dev mode: opens Classroom player inside about:blank'
                  : 'Opens in Google Classroom'}
              </p>
              <div className="classroom-url-pill" title={classroomUrl}>
                {classroomUrl}
              </div>
              <div className="classroom-card-actions">
                {classroomInAboutBlank ? (
                  <button
                    type="button"
                    className="btn-primary classroom-open-btn"
                    onClick={handleOpenAboutBlank}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1L20.6 13c.8-.5.8-1.6 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1z" />
                    </svg>
                    Open Classroom in about:blank
                  </button>
                ) : (
                  <a
                    href={classroomUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-primary classroom-open-btn"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1L20.6 13c.8-.5.8-1.6 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1z" />
                    </svg>
                    Open in Classroom
                  </a>
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

                <button type="button" className="chip-btn" title="Copy link (c)" onClick={handleCopy}>
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    </section>
  );
};
