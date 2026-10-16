import React, { useRef, useEffect } from 'react';
import { PlayItem } from '../types';
import { fmtDuration, fmtViews } from '../utils/formatters';

interface SearchResultsProps {
  query: string;
  results: PlayItem[];
  loading: boolean;
  status: string;
  onSelect: (item: PlayItem) => void;
  onClose: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  query,
  results,
  loading,
  status,
  onSelect,
  onClose,
}) => {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (query) {
      sectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [query]);

  if (!query && !loading && !results.length) return null;

  return (
    <section
      id="results-section"
      ref={sectionRef}
      className="active"
      aria-label="Search results"
    >
      <div className="results-header">
        <h2>
          Results for <span className="q" id="results-query">“{query}”</span>
        </h2>
        <span id="results-status">{status}</span>
        <button id="results-close" title="Close results" onClick={onClose}>
          ✕ Close
        </button>
      </div>

      <div className="results-grid" id="results-grid" role="list">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div className="result-skel" key={i}>
              <div className="sk-thumb"></div>
              <div className="sk-body">
                <span className="skeleton-line" style={{ width: '90%' }}></span>
                <span className="skeleton-line" style={{ width: '55%', height: '10px' }}></span>
              </div>
            </div>
          ))
        ) : results.length > 0 ? (
          results.map((r, i) => {
            const thumbUrl = r.thumb || (r.videoId ? `https://i.ytimg.com/vi/${r.videoId}/hqdefault.jpg` : '');
            return (
              <button
                key={`${r.videoId}-${i}`}
                className="result-card"
                role="listitem"
                style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
                onClick={() => onSelect(r)}
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
                  <div className="result-title">{r.title || 'YouTube Video'}</div>
                  <div className="result-chan">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5" />
                    </svg>
                    {r.author || 'Unknown channel'}
                  </div>
                  <div className="result-meta">
                    {[fmtViews(r.viewCount), r.publishedText].filter(Boolean).join(' · ')}
                  </div>
                </div>
              </button>
            );
          })
        ) : (
          <div className="results-empty">
            No similar videos found for “{query}”.
            <br />
            Try different keywords, or include the channel name.
          </div>
        )}
      </div>
    </section>
  );
};
