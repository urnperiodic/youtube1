import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  AppSettings,
  DEFAULT_SETTINGS,
  STORAGE_KEY,
  PlayItem,
  THEMES,
  AccentColor,
  YT_ACCENT,
} from './types';
import { Parser } from './utils/parser';
import { fetchRemoteSearch, searchLibrary, calculateRelevance } from './utils/search';
import { AmbientBackground } from './components/AmbientBackground';
import { Navbar, NavbarSearchHandle } from './components/Navbar';
import { VideoPlayer } from './components/VideoPlayer';
import { SearchTakeover } from './components/SearchTakeover';
import { LibraryModal } from './components/LibraryModal';
import { SettingsDrawer } from './components/SettingsDrawer';
import { ShortcutsModal } from './components/ShortcutsModal';
import { Toast } from './components/Toast';

export const App: React.FC = () => {
  // Load settings from localStorage
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  });

  const [currentVideo, setCurrentVideo] = useState<PlayItem | null>(null);
  const [searchValue, setSearchValue] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchResults, setSearchResults] = useState<PlayItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [showFab, setShowFab] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const navbarSearchRef = useRef<NavbarSearchHandle>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const searchSeqRef = useRef<number>(0);
  const debounceTimerRef = useRef<number | null>(null);

  // Toast trigger
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2600);
  }, []);

  // Save settings on update
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Storage unavailable
    }
  }, [settings]);

  // Sync document styles and classes with settings
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;

    const r = root.style;
    r.setProperty('--accent-h', String(settings.accent.h));
    r.setProperty('--accent-s', `${settings.accent.s}%`);
    r.setProperty('--accent-l', `${settings.accent.l}%`);
    r.setProperty('--on-accent', settings.accent.l > 62 ? '#0b0d14' : '#ffffff');

    r.setProperty('--radius', `${settings.radius}px`);
    r.setProperty('--density', String(settings.density));
    r.setProperty('--glass-alpha', String(settings.glass / 100));
    r.setProperty('--motion', String(settings.motion));

    root.classList.toggle('no-motion', settings.motion === 0);
    root.classList.toggle('fx-off', !settings.fx);
  }, [settings.theme, settings.accent, settings.radius, settings.density, settings.glass, settings.motion, settings.fx]);

  // Sync Focus Mode class
  useEffect(() => {
    document.body.classList.toggle('focus-mode', isFocusMode);
  }, [isFocusMode]);

  // Follow system theme listener
  useEffect(() => {
    if (!settings.systemTheme || settings.ytMode) return;

    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const sync = () => {
      setSettings((prev) => ({
        ...prev,
        theme: mq.matches ? 'light' : 'midnight',
      }));
    };
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [settings.systemTheme, settings.ytMode]);

  // Scroll listener for FAB
  useEffect(() => {
    const handleScroll = () => {
      setShowFab(window.scrollY > 320);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Play a video/playlist item
  const playVideo = useCallback(
    (item: PlayItem) => {
      setCurrentVideo(item);
      setIsSearchActive(false);

      // Add to history if enabled
      if (settings.saveHistory) {
        setSettings((prev) => {
          const keyOf = (i: PlayItem) =>
            i.kind === 'playlist' ? `pl:${i.listId}` : `v:${i.videoId}`;
          const currentKey = keyOf(item);
          const filtered = prev.history.filter((h) => keyOf(h) !== currentKey);
          const updated = [{ ...item, watchedAt: Date.now() }, ...filtered].slice(0, 60);
          return { ...prev, history: updated };
        });
      }
    },
    [settings.saveHistory]
  );

  // Search execution
  const executeSearch = useCallback(
    async (q: string) => {
      const query = q.trim();
      if (!query) {
        setSearchResults([]);
        setIsSearching(false);
        setSearchStatus('');
        return;
      }

      const seq = ++searchSeqRef.current;
      setIsSearching(true);
      setSearchStatus('Searching…');

      const remote = await fetchRemoteSearch(query);
      if (seq !== searchSeqRef.current) return; // superseded

      const libMatches = searchLibrary(query, [...settings.favorites, ...settings.history]);
      const seen = new Set<string>();
      const merged: PlayItem[] = [];

      for (const r of remote || []) {
        if (!r.videoId || seen.has(r.videoId)) continue;
        seen.add(r.videoId);
        merged.push({
          ...r,
          score: calculateRelevance(query, r),
          inLibrary: libMatches.some((l) => l.videoId === r.videoId),
        });
      }

      for (const l of libMatches) {
        if (l.videoId && seen.has(l.videoId)) continue;
        if (l.videoId) seen.add(l.videoId);
        merged.push({
          ...l,
          score: calculateRelevance(query, l) + 2,
          inLibrary: true,
        });
      }

      merged.sort((a, b) => (b.score || 0) - (a.score || 0));
      const finalResults = merged.slice(0, 24);

      setSearchResults(finalResults);
      setIsSearching(false);
      setSearchStatus(
        remote
          ? `${finalResults.length} result${finalResults.length === 1 ? '' : 's'}`
          : finalResults.length
          ? 'Matches from your library'
          : 'No results found'
      );
    },
    [settings.favorites, settings.history]
  );

  // Debounced search when searchValue changes and search is active
  useEffect(() => {
    if (!isSearchActive) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchValue.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      setSearchStatus('');
      return;
    }

    debounceTimerRef.current = window.setTimeout(() => {
      executeSearch(searchValue);
    }, 280);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchValue, isSearchActive, executeSearch]);

  // Initial deep links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const v = params.get('v');
    const q = params.get('q');
    if (v) {
      const parsed = Parser.parse(v) || Parser.parse(decodeURIComponent(v));
      if (parsed) {
        playVideo(parsed);
        return;
      }
    }
    if (q) {
      setSearchValue(q);
      setIsSearchActive(true);
      executeSearch(q);
      return;
    }
  }, [executeSearch, playVideo]);

  // Favorites helpers
  const keyOfItem = (i?: PlayItem | null) =>
    i ? (i.kind === 'playlist' ? `pl:${i.listId}` : `v:${i.videoId}`) : '';

  const isItemFav = useCallback(
    (item: PlayItem) => {
      const key = keyOfItem(item);
      return Boolean(key && settings.favorites.some((f) => keyOfItem(f) === key));
    },
    [settings.favorites]
  );

  const toggleFav = useCallback(
    (item?: PlayItem | null) => {
      if (!item) return;
      const key = keyOfItem(item);
      if (!key) return;

      const isFavNow = settings.favorites.some((f) => keyOfItem(f) === key);
      if (isFavNow) {
        setSettings((prev) => ({
          ...prev,
          favorites: prev.favorites.filter((f) => keyOfItem(f) !== key),
        }));
        showToast('Removed from favorites');
      } else {
        setSettings((prev) => ({
          ...prev,
          favorites: [{ ...item, favedAt: Date.now() }, ...prev.favorites],
        }));
        showToast('Added to favorites ♥');
      }
    },
    [settings.favorites, showToast]
  );

  const clearHistory = useCallback(() => {
    if (!settings.history.length) {
      showToast('History is already empty');
      return;
    }
    setSettings((prev) => ({ ...prev, history: [] }));
    showToast('History cleared');
  }, [settings.history.length, showToast]);

  const updateItemMeta = useCallback((updatedItem: PlayItem) => {
    setCurrentVideo((prev) => {
      if (!prev) return null;
      const prevKey = prev.kind === 'playlist' ? `pl:${prev.listId}` : `v:${prev.videoId}`;
      const updatedKey = updatedItem.kind === 'playlist' ? `pl:${updatedItem.listId}` : `v:${updatedItem.videoId}`;
      if (prevKey === updatedKey) {
        return { ...prev, ...updatedItem };
      }
      return prev;
    });

    setSettings((prev) => {
      const updateList = (list: PlayItem[]) =>
        list.map((it) => {
          const itKey = it.kind === 'playlist' ? `pl:${it.listId}` : `v:${it.videoId}`;
          const updatedKey = updatedItem.kind === 'playlist' ? `pl:${updatedItem.listId}` : `v:${updatedItem.videoId}`;
          if (itKey === updatedKey) {
            return {
              ...it,
              title: updatedItem.title || it.title,
              author: updatedItem.author || it.author,
              thumb: updatedItem.thumb || it.thumb,
            };
          }
          return it;
        });

      return {
        ...prev,
        history: updateList(prev.history),
        favorites: updateList(prev.favorites),
      };
    });
  }, []);

  // Theme actions
  const selectTheme = (id: string) => {
    setSettings((prev) => {
      const nextYtMode = prev.ytMode && id !== 'youtube' ? false : prev.ytMode;
      return { ...prev, theme: id, ytMode: nextYtMode };
    });
    const found = THEMES.find((t) => t.id === id);
    showToast(`Theme: ${found ? found.name : id === 'youtube' ? 'YouTube' : id}`);
  };

  const cycleTheme = () => {
    const idx = THEMES.findIndex((t) => t.id === settings.theme);
    const next = THEMES[(idx + 1) % THEMES.length];
    selectTheme(next.id);
  };

  const selectAccent = (accent: AccentColor) => {
    setSettings((prev) => ({
      ...prev,
      ytMode: false,
      accent: { h: accent.h, s: accent.s, l: accent.l },
    }));
    showToast(`Accent: ${accent.name}`);
  };

  const toggleYouTubeMode = (enabled: boolean) => {
    if (enabled) {
      setSettings((prev) => ({
        ...prev,
        preYT: {
          theme: prev.theme === 'youtube' ? 'midnight' : prev.theme,
          accent: { ...prev.accent },
        },
        ytMode: true,
        systemTheme: false,
        theme: 'youtube',
        accent: { h: YT_ACCENT.h, s: YT_ACCENT.s, l: YT_ACCENT.l },
      }));
      showToast('YouTube style on');
    } else {
      setSettings((prev) => {
        const restore = prev.preYT || {
          theme: DEFAULT_SETTINGS.theme,
          accent: DEFAULT_SETTINGS.accent,
        };
        return {
          ...prev,
          ytMode: false,
          theme: restore.theme,
          accent: restore.accent,
        };
      });
      showToast('YouTube style off — your look is back');
    }
  };

  const toggleSystemTheme = (enabled: boolean) => {
    setSettings((prev) => {
      const next = { ...prev, systemTheme: enabled };
      if (enabled && prev.ytMode) {
        next.ytMode = false;
        next.accent = prev.preYT ? prev.preYT.accent : DEFAULT_SETTINGS.accent;
      }
      return next;
    });
    if (!enabled) showToast('System theme off');
  };

  const resetSettings = () => {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      history: prev.history,
      favorites: prev.favorites,
    }));
    showToast('Settings reset to defaults');
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);

      if (e.key === 'Escape') {
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
        if (isSettingsOpen) {
          setIsSettingsOpen(false);
          return;
        }
        if (isLibraryOpen) {
          setIsLibraryOpen(false);
          return;
        }
        if (isSearchActive) {
          setIsSearchActive(false);
          return;
        }
        if (isFocusMode) {
          setIsFocusMode(false);
          return;
        }
        if (isTyping) {
          target.blur();
          return;
        }
        return;
      }

      // Paste & play anywhere
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'v' && !isTyping) {
        e.preventDefault();
        navigator.clipboard
          ?.readText()
          .then((text) => {
            const parsed = Parser.parse(text);
            if (parsed) {
              playVideo(parsed);
              showToast('Playing pasted link');
            } else {
              setSearchValue(text);
              setIsSearchActive(true);
              navbarSearchRef.current?.focus();
            }
          })
          .catch(() => {
            showToast('Clipboard blocked — paste manually');
            navbarSearchRef.current?.focus();
          });
        return;
      }

      if (isTyping || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case '/':
          e.preventDefault();
          navbarSearchRef.current?.focus();
          setIsSearchActive(true);
          break;
        case '?':
          e.preventDefault();
          setIsShortcutsOpen((prev) => !prev);
          break;
        case 's':
        case 'S':
          if (e.shiftKey) break;
          e.preventDefault();
          setIsSettingsOpen((prev) => !prev);
          break;
        case 't':
          e.preventDefault();
          cycleTheme();
          break;
        case 'd':
        case 'D':
          e.preventDefault();
          if (!currentVideo) {
            showToast('Play something first');
          } else {
            setIsFocusMode((prev) => !prev);
          }
          break;
        case 'f':
          if (currentVideo) {
            toggleFav(currentVideo);
          }
          break;
        case 'F':
          const wrap = document.getElementById('frame-wrap') as any;
          if (wrap) {
            if (document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            } else {
              (wrap.requestFullscreen || wrap.webkitRequestFullscreen)?.call(wrap);
            }
          }
          break;
        case 'c':
          if (currentVideo) {
            const shareUrl = Parser.shareUrl(currentVideo);
            navigator.clipboard
              ?.writeText(shareUrl)
              .then(() => showToast('Share link copied'))
              .catch(() => showToast(shareUrl));
          } else {
            showToast('Nothing playing yet');
          }
          break;
        case 'p':
          if (currentVideo) {
            showToast('Right-click the video twice → "Picture in picture"');
          } else {
            showToast('Play something first');
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isShortcutsOpen,
    isSettingsOpen,
    isLibraryOpen,
    isSearchActive,
    isFocusMode,
    currentVideo,
    cycleTheme,
    playVideo,
    showToast,
    toggleFav,
  ]);

  return (
    <>
      <AmbientBackground fx={settings.fx} motion={settings.motion} />

      <Navbar
        ref={navbarSearchRef}
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        isSearchActive={isSearchActive}
        onSearchActive={setIsSearchActive}
        onPlay={playVideo}
        onSearchSubmit={(q) => {
          executeSearch(q);
          setIsSearchActive(true);
        }}
        onClearSearch={() => {
          setSearchValue('');
          setSearchResults([]);
        }}
        onOpenLibrary={() => setIsLibraryOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onCycleTheme={cycleTheme}
        onOpenSettings={() => setIsSettingsOpen(true)}
        lastHistoryItem={settings.history[0] || null}
        isPlaying={Boolean(currentVideo)}
        onToast={showToast}
      />

      <main>
        {/* If Search is active (pressed), it takes up the entire area! */}
        {isSearchActive ? (
          <SearchTakeover
            query={searchValue}
            results={searchResults}
            loading={isSearching}
            status={searchStatus}
            recentItems={settings.history}
            favorites={settings.favorites}
            onSelectVideo={playVideo}
            onSelectQuery={(topic) => {
              setSearchValue(topic);
              executeSearch(topic);
            }}
            onClose={() => setIsSearchActive(false)}
          />
        ) : currentVideo ? (
          <VideoPlayer
            current={currentVideo}
            autoplay={settings.autoplay}
            isFav={isItemFav(currentVideo)}
            onToggleFav={() => toggleFav(currentVideo)}
            onUpdateMeta={updateItemMeta}
            onToast={showToast}
            onToggleFocusMode={() => setIsFocusMode((prev) => !prev)}
          />
        ) : (
          /* Clean Idle State when nothing is playing yet */
          <div
            className="idle-welcome-card"
            onClick={() => {
              setIsSearchActive(true);
              navbarSearchRef.current?.focus();
            }}
          >
            <div className="idle-welcome-inner">
              <div className="idle-brand-mark">
                <svg viewBox="0 0 24 24">
                  <path d="M6 3.8v16.4c0 1 1.1 1.6 2 1.1l13-8.2c.8-.5.8-1.7 0-2.2L8 2.7c-.9-.5-2 .1-2 1.1z" />
                </svg>
              </div>
              <h2>Watch distraction-free</h2>
              <p>Click the search bar above or press <kbd>/</kbd> to search YouTube or paste any link.</p>
              {settings.history[0] && (
                <button
                  className="idle-resume-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    playVideo(settings.history[0]);
                  }}
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M7 4.6v14.8c0 .9 1 1.5 1.8 1L20.6 13c.8-.5.8-1.6 0-2L8.8 3.6c-.8-.5-1.8.1-1.8 1z" />
                  </svg>
                  Resume: {settings.history[0].title || 'Last watched video'}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Focus mode exit pill */}
      <button
        id="focus-exit"
        onClick={() => setIsFocusMode(false)}
        aria-label="Exit Focus Mode"
      >
        Press <strong>Esc</strong> or click to exit Focus Mode
      </button>

      {/* Scroll back to top FAB */}
      <button
        id="fab"
        className={showFab ? 'show' : ''}
        title="Back to top"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <svg viewBox="0 0 24 24">
          <path d="M12 19V5M5.5 11.5 12 5l6.5 6.5" />
        </svg>
      </button>

      <LibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        history={settings.history}
        favorites={settings.favorites}
        onPlay={playVideo}
        onToggleFav={toggleFav}
        onClearHistory={clearHistory}
        isFav={isItemFav}
      />

      <SettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={setSettings}
        onSelectTheme={selectTheme}
        onSelectAccent={selectAccent}
        onToggleYouTubeMode={toggleYouTubeMode}
        onToggleSystemTheme={toggleSystemTheme}
        onReset={resetSettings}
      />

      <ShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <Toast message={toastMsg} />
    </>
  );
};
