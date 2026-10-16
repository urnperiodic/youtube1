import React from 'react';
import { PlayItem } from '../types';
import { LibrarySection } from './LibrarySection';

interface LibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: PlayItem[];
  favorites: PlayItem[];
  onPlay: (item: PlayItem) => void;
  onToggleFav: (item: PlayItem) => void;
  onClearHistory: () => void;
  isFav: (item: PlayItem) => boolean;
}

export const LibraryModal: React.FC<LibraryModalProps> = ({
  isOpen,
  onClose,
  history,
  favorites,
  onPlay,
  onToggleFav,
  onClearHistory,
  isFav,
}) => {
  return (
    <>
      <div
        id="settings-overlay"
        className={isOpen ? 'open' : ''}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        id="settings-panel"
        className={isOpen ? 'open' : ''}
        style={{ width: 'min(560px, 100vw)' }}
        aria-label="Your Library"
        aria-hidden={!isOpen}
      >
        <div className="settings-head">
          <h2>Your Library</h2>
          <button
            className="icon-btn"
            aria-label="Close library"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="settings-body" style={{ padding: '20px' }}>
          <LibrarySection
            history={history}
            favorites={favorites}
            onPlay={(item) => {
              onPlay(item);
              onClose();
            }}
            onToggleFav={onToggleFav}
            onClearHistory={onClearHistory}
            isFav={isFav}
          />
        </div>
      </aside>
    </>
  );
};
