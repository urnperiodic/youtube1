import React from 'react';
import { PlayItem } from '../types';
import { fmtDuration, fmtViews } from '../utils/formatters';

interface SearchTakeoverProps {
  query: string;
  results: PlayItem[];
  loading: boolean;
  status: string;
  recentItems: PlayItem[];
  favorites: PlayItem[];
  onSelectVideo: (item: PlayItem) => void;
  onSelectQuery: (q: string) => void;
  onClose: () => void;
}



export const SearchTakeover: React.FC<SearchTakeoverProps> = ({
  query,
  results,
  loading,
  status,
  recentItems,
  favorites,
  onSelectVideo,
  onSelectQuery,
  onClose,
}) => {
  return (
    <div className="search-takeover-wrap" role="region" aria-label="Search area">
      <div className="search-takeover-card">
        {/* Header bar */}
        <div className="search-takeover-header">
          <div className="search-takeover-title-row">
            <div className="search-takeover-title">
              {query.trim() ? (
                <>
                  Results for <span className="q">“{query}”</span>
                </>
              ) : (
                <span>Explore &amp; Quick Play</span>
              )}
            </div>
            {status && query.trim() && (
              <span className="search-takeover-status">{status}</span>
            )}
            <button
              className="search-takeover-close-btn"
              onClick={onClose}
              title="Close search (Esc)"
            >
              <span>✕</span> Close
            </button>
          </div>

        </div>

        {/* Main Content Area */}
        <div className="search-takeover-body">
          {loading ? (
            <div className="results-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div className="result-skel" key={i}>
                  <div className="sk-thumb"></div>
                  <div className="sk-body">
                    <span className="skeleton-line" style={{ width: '90%' }}></span>
                    <span
                      className="skeleton-line"
                      style={{ width: '55%', height: '10px' }}
                    ></span>
                  </div>
                </div>
              ))}
            </div>
          ) : query.trim() ? (
            results.length > 0 ? (
              <div className="results-grid" role="list">
                {results.map((r, i) => {
                  const thumbUrl =
                    r.thumb ||
                    (r.videoId
                      ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg`
                      : '');
                  return (
                    <button
                      key={`${r.videoId}-${i}`}
                      className="result-card"
                      role="listitem"
                      style={{ animationDelay: `${Math.min(i * 30, 300)}ms` }}
                      onClick={() => onSelectVideo(r)}
                    >
                      <div className="result-thumb">
                        {thumbUrl && (
                          <img
                            src={thumbUrl}
                            alt=""
                            loading="lazy"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                        )}
                        {Boolean(r.lengthSeconds) && (
                          <span className="dur">{fmtDuration(r.lengthSeconds)}</span>
                        )}
                        {i === 0 ? (
                          <span className="match-badge">Best match</span>
                        ) : r.inLibrary ? (
                          <span className="match-badge lib">In library</span>
                        ) : null}
                      </div>
                      <div className="result-body">
                        <div className="result-title">
                          {r.title || 'YouTube Video'}
                        </div>
                        <div className="result-chan">
                          <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="8" r="4" />
                            <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
                          </svg>
                          {r.author || 'Unknown channel'}
                        </div>
                        <div className="result-meta">
                          {[fmtViews(r.viewCount), r.publishedText]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="results-empty">
                No videos found for “{query}”.
                <br />
                Try searching for keywords, a channel name, or paste a direct YouTube link.
              </div>
            )
          ) : (
            <div className="search-idle-prompt">
              <div className="idle-icon">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.8-3.8" />
                </svg>
              </div>
              <h3>Search or paste any link above</h3>
              <p>Type keywords to search YouTube or paste a URL/ID to watch instantly.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
