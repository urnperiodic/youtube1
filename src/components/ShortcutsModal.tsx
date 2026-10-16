import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  return (
    <div
      id="shortcuts-modal"
      className={isOpen ? 'open' : ''}
      role="dialog"
      aria-modal="true"
      aria-label="Keyboard shortcuts"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-card">
        <h2>Keyboard shortcuts</h2>
        <div className="shortcut-list">
          <div className="shortcut-item">
            <span>Focus search / URL bar</span>
            <span className="keys"><kbd>/</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Paste &amp; play</span>
            <span className="keys"><kbd>Ctrl</kbd><kbd>V</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Toggle settings</span>
            <span className="keys"><kbd>S</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Focus mode</span>
            <span className="keys"><kbd>D</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Favorite current video</span>
            <span className="keys"><kbd>F</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Copy share link</span>
            <span className="keys"><kbd>C</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Picture-in-Picture</span>
            <span className="keys"><kbd>P</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Fullscreen player</span>
            <span className="keys"><kbd>⇧</kbd><kbd>F</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Cycle theme</span>
            <span className="keys"><kbd>T</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>Close panels / exit focus</span>
            <span className="keys"><kbd>Esc</kbd></span>
          </div>
          <div className="shortcut-item">
            <span>This help</span>
            <span className="keys"><kbd>?</kbd></span>
          </div>
        </div>
      </div>
    </div>
  );
};
