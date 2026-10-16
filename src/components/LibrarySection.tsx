import React, { useState } from 'react';
import { PlayItem } from '../types';
import { timeAgo } from '../utils/formatters';

interface LibrarySectionProps {
  history: PlayItem[];
  favorites: PlayItem[];
  onPlay: (item: PlayItem) => void;
  onToggleFav: (item: PlayItem) => void;
  onClearHistory: () => void;
  isFav: (item: PlayItem) => boolean;
}

export const LibrarySection: React.FC<LibrarySectionProps> = ({
  history,
  favorites,
  onPlay,
  onToggleFav,
  onClearHistory,
  isFav,
}) => {
  const [activeTab, setActiveTab] = useState<'history' | 'favorites'>('history');

  const items = activeTab === 'history' ? history : favorites;

  const getThumb = (item: PlayItem) => {
    if (item.thumb) return item.thumb;
    if (item.videoId) return `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`;
    return null;
  };

  return (
    <section id="library" aria-label="Your library">
      <div className="lib-header">
        <div className="lib-tabs" role="tablist" aria-label="Library tabs">
          <button
            className={`lib-tab ${activeTab === 'history' ? 'is-active' : ''}`}
            id="tab-history"
            role="tab"
            aria-selected={activeTab === 'history'}
            onClick={() => setActiveTab('history')}
          >
            History <span className="count" id="history-count">{history.length}</span>
          </button>
          <button
            className={`lib-tab ${activeTab === 'favorites' ? 'is-active' : ''}`}
            id="tab-favorites"
            role="tab"
            aria-selected={activeTab === 'favorites'}
            onClick={() => setActiveTab('favorites')}
          >
            Favorites <span className="count" id="fav-count">{favorites.length}</span>
          </button>
        </div>
        {activeTab === 'history' && (
          <button
            id="clear-history"
            title="Clear all history"
            onClick={onClearHistory}
          >
            Clear history
          </button>
        )}
      </div>

      <div className="lib-grid" id="lib-grid" role="list">
        {items.length === 0 ? (
          <div className="lib-empty">
            <svg viewBox="0 0 24 24">
              {activeTab === 'history' ? (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3.5 2" />
                </>
              ) : (
                <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.6 5 6.2 5c2.2 0 3.6 1.1 4.5 2.4h2.6C14.2 6.1 15.6 5 17.8 5c3.6 0 5.8 3.6 4.2 6.7C19.5 16.3 12 21 12 21z" />
              )}
            </svg>
            <div>
              {activeTab === 'history'
                ? 'Videos you watch will show up here.'
                : 'Tap the ♥ on any video to keep it here.'}
            </div>
          </div>
        ) : (
          items.map((item, idx) => {
            const thumb = getThumb(item);
            const fav = isFav(item);
            const when = item.watchedAt || item.favedAt;
            const kind = item.kind === 'playlist' ? 'Playlist' : '';

            return (
              <div
                key={`${item.videoId || item.listId}-${idx}`}
                className="lib-card"
                role="listitem"
                tabIndex={0}
                style={{ animationDelay: `${Math.min(idx * 40, 320)}ms` }}
                onClick={() => onPlay(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onPlay(item);
                }}
              >
                <div className="lib-thumb">
                  {thumb && (
                    <img
                      src={thumb}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                  {kind && <span className="kind-badge">{kind}</span>}
                  <span className="play-ico">
                    <span>
                      <svg viewBox="0 0 24 24">
                        <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1L20.6 13c.8-.5.8-1.6 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1z" />
                      </svg>
                    </span>
                  </span>
                </div>
                <div className="lib-body">
                  <div className="lib-info">
                    <div className="lib-title">
                      {item.title || (item.kind === 'playlist' ? 'YouTube Playlist' : 'YouTube Video')}
                    </div>
                    <div className="lib-when">{when ? timeAgo(when) : ''}</div>
                  </div>
                  <button
                    className={`lib-fav ${fav ? 'is-fav' : ''}`}
                    title={fav ? 'Unfavorite' : 'Favorite'}
                    aria-label="Toggle favorite"
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFav(item);
                    }}
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M12 21s-7.5-4.7-10-9.3C.4 8.6 2.6 5 6.2 5c2.2 0 3.6 1.1 4.5 2.4h2.6C14.2 6.1 15.6 5 17.8 5c3.6 0 5.8 3.6 4.2 6.7C19.5 16.3 12 21 12 21z" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};
