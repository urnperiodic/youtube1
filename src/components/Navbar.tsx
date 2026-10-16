import React, { useRef, useImperativeHandle, forwardRef } from 'react';
import { Parser } from '../utils/parser';
import { PlayItem } from '../types';

export interface NavbarSearchHandle {
  focus: () => void;
  setValue: (val: string) => void;
}

interface NavbarProps {
  searchValue: string;
  onSearchChange: (val: string) => void;
  isSearchActive: boolean;
  onSearchActive: (active: boolean) => void;
  onPlay: (item: PlayItem) => void;
  onSearchSubmit: (query: string) => void;
  onClearSearch: () => void;
  onOpenLibrary: () => void;
  onOpenShortcuts: () => void;
  onCycleTheme: () => void;
  onOpenSettings: () => void;
  lastHistoryItem: PlayItem | null;
  isPlaying: boolean;
  onToast: (msg: string) => void;
}

export const Navbar = forwardRef<NavbarSearchHandle, NavbarProps>(({
  searchValue,
  onSearchChange,
  isSearchActive,
  onSearchActive,
  onPlay,
  onSearchSubmit,
  onClearSearch,
  onOpenLibrary,
  onOpenShortcuts,
  onCycleTheme,
  onOpenSettings,
  lastHistoryItem,
  isPlaying,
  onToast,
}, ref) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
      inputRef.current?.select();
    },
    setValue: (val: string) => {
      onSearchChange(val);
    },
  }));

  const handleSubmit = (text: string) => {
    const v = text.trim();
    if (!v) {
      inputRef.current?.focus();
      return;
    }

    const parsedItem = Parser.parse(v);
    if (parsedItem) {
      onPlay(parsedItem);
      onSearchChange('');
      onSearchActive(false);
      return;
    }

    if (Parser.looksLikeUrl(v)) {
      onToast('That looks like a broken link. Check the URL or search keywords.');
      inputRef.current?.focus();
      return;
    }

    onSearchSubmit(v);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSubmit(searchValue);
  };

  const scrollToTop = (e: React.MouseEvent) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header id="navbar">
      <nav className="nav-inner" aria-label="Main navigation">
        <a className="brand" href="#" id="brand-home" onClick={scrollToTop}>
          <span className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 3.8v16.4c0 1 1.1 1.6 2 1.1l13-8.2c.8-.5.8-1.7 0-2.2L8 2.7c-.9-.5-2 .1-2 1.1z" />
            </svg>
          </span>
          Clarity Video
        </a>

        {/* Navbar Search Bar */}
        <form
          className={`nav-search-form ${isSearchActive ? 'is-active' : ''}`}
          onSubmit={handleFormSubmit}
          autoComplete="off"
        >
          <div className="nav-search-field">
            <svg className="nav-search-ico" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              ref={inputRef}
              className="nav-search-input"
              type="text"
              inputMode="search"
              placeholder="Search or paste a link"
              aria-label="Search or paste a link"
              spellCheck="false"
              value={searchValue}
              onChange={(e) => {
                onSearchChange(e.target.value);
              }}
            />
            {searchValue && (
              <button
                type="button"
                className="nav-search-clear-btn"
                title="Clear input"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearSearch();
                  inputRef.current?.focus();
                }}
              >
                ✕
              </button>
            )}
            <button
              type="submit"
              className="nav-search-btn"
              title="Search or Go"
            >
              <svg viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.8-3.8" />
              </svg>
            </button>
          </div>
        </form>

        <div className="nav-links">
          {lastHistoryItem && !isPlaying && (
            <button
              className="nav-link resume-nav-btn"
              title="Resume last video"
              onClick={() => onPlay({ ...lastHistoryItem })}
            >
              Resume
            </button>
          )}
          <button className="nav-link" onClick={onOpenLibrary}>
            Library
          </button>
          <button
            className="icon-btn"
            id="shortcuts-btn"
            title="Keyboard shortcuts (?)"
            aria-label="Keyboard shortcuts"
            onClick={onOpenShortcuts}
          >
            <svg viewBox="0 0 24 24">
              <rect x="2" y="6" width="20" height="12" rx="2.5" />
              <path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10" />
            </svg>
          </button>
          <button
            className="icon-btn"
            id="theme-quick"
            title="Cycle theme (T)"
            aria-label="Cycle theme"
            onClick={onCycleTheme}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4.5" />
              <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" />
            </svg>
          </button>
          <button
            className="icon-btn"
            id="settings-btn"
            title="Settings (S)"
            aria-label="Open settings"
            onClick={onOpenSettings}
          >
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M19.4 15a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.09a1.6 1.6 0 0 0-1.05-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.6 1.6 0 0 0 4.6 15a1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.09A1.6 1.6 0 0 0 4.56 9a1.6 1.6 0 0 0-.32-1.77l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.6 1.6 0 0 0 8.84 4.7 1.6 1.6 0 0 0 9.8 3.24V3a2 2 0 1 1 4 0v.09c0 .64.38 1.21.97 1.47.58.25 1.25.13 1.77-.32l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.6 1.6 0 0 0-.32 1.77c.25.58.83.97 1.47.97H21a2 2 0 1 1 0 4h-.09c-.64 0-1.22.38-1.51.99z" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
});

Navbar.displayName = 'Navbar';
