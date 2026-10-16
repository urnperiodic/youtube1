import React, { useState, forwardRef, useImperativeHandle, useRef } from 'react';
import { PlayItem } from '../types';
import { Parser } from '../utils/parser';

export interface CommandBarHandle {
  focus: () => void;
  setValue: (val: string) => void;
}

interface CommandBarProps {
  onPlay: (item: PlayItem) => void;
  onSearch: (query: string) => void;
  lastHistoryItem: PlayItem | null;
  isPlaying: boolean;
  onToast: (msg: string) => void;
}

export const CommandBar = forwardRef<CommandBarHandle, CommandBarProps>(
  ({ onPlay, onSearch, lastHistoryItem, isPlaying, onToast }, ref) => {
    const [inputValue, setInputValue] = useState('');
    const [showError, setShowError] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      focus: () => {
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      setValue: (val: string) => {
        setInputValue(val);
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
        setShowError(false);
        onPlay(parsedItem);
        setInputValue('');
        return;
      }

      if (Parser.looksLikeUrl(v)) {
        setShowError(true);
        inputRef.current?.focus();
        return;
      }

      setShowError(false);
      onSearch(v);
    };

    const handleFormSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      handleSubmit(inputValue);
    };

    const handlePaste = async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (!text) {
          onToast('Clipboard is empty');
          return;
        }
        const trimmed = text.trim();
        setInputValue(trimmed);
        if (Parser.parse(trimmed)) {
          handleSubmit(trimmed);
        } else {
          inputRef.current?.focus();
        }
      } catch {
        onToast('Clipboard blocked — paste manually with Ctrl+V');
        inputRef.current?.focus();
      }
    };

    return (
      <section id="command-bar" aria-label="Watch or search">
        <form id="url-form" onSubmit={handleFormSubmit} autoComplete="off">
          <div className="url-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.8-3.8" />
            </svg>
            <input
              ref={inputRef}
              id="url-input"
              type="text"
              inputMode="search"
              placeholder="Paste a YouTube link to watch — or type keywords to search…"
              aria-label="YouTube URL or search query"
              spellCheck="false"
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (showError) setShowError(false);
              }}
            />
            <button
              type="button"
              id="paste-btn"
              title="Paste from clipboard"
              onClick={handlePaste}
            >
              Paste
            </button>
          </div>
          <button type="submit" className="btn-primary" id="watch-btn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1L20.6 13c.8-.5.8-1.6 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1z" />
            </svg>
            Go
          </button>
        </form>

        <p className={`input-error ${showError ? 'show' : ''}`} id="url-error" role="alert">
          That looks like a broken link. Check the URL, or type keywords to search instead.
        </p>

        <p className="input-hint">
          Press <kbd>/</kbd> to focus · <kbd>Ctrl</kbd>+<kbd>V</kbd> anywhere to paste &amp; play · <kbd>?</kbd> for shortcuts
        </p>

        {lastHistoryItem && !isPlaying && (
          <button
            id="resume-chip"
            className="show"
            title="Resume last video"
            onClick={() => onPlay({ ...lastHistoryItem })}
          >
            <svg viewBox="0 0 24 24">
              <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1L20.6 13c.8-.5.8-1.6 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1z" />
            </svg>
            <span className="rc-title" id="resume-title">
              Resume · {lastHistoryItem.title || (lastHistoryItem.kind === 'playlist' ? 'YouTube Playlist' : 'last video')}
            </span>
          </button>
        )}
      </section>
    );
  }
);
CommandBar.displayName = 'CommandBar';
