import React from 'react';
import { AppSettings, THEMES, PALETTE, AccentColor } from '../types';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (updater: (prev: AppSettings) => AppSettings) => void;
  onSelectTheme: (themeId: string) => void;
  onSelectAccent: (accent: AccentColor) => void;
  onToggleYouTubeMode: (enabled: boolean) => void;
  onToggleSystemTheme: (enabled: boolean) => void;
  onReset: () => void;
}

export const SettingsDrawer: React.FC<SettingsDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSelectTheme,
  onSelectAccent,
  onToggleYouTubeMode,
  onToggleSystemTheme,
  onReset,
}) => {
  const currentAccent = settings.accent;
  const activePaletteItem = PALETTE.find(
    (p) => p.h === currentAccent.h && p.s === currentAccent.s && p.l === currentAccent.l
  );

  const getRangeFill = (val: number, min: number, max: number) => {
    return `${((val - min) / (max - min)) * 100}%`;
  };

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
        aria-label="Settings"
        aria-hidden={!isOpen}
      >
        <div className="settings-head">
          <h2>Settings</h2>
          <button
            className="icon-btn"
            id="settings-close"
            aria-label="Close settings"
            onClick={onClose}
          >
            <svg viewBox="0 0 24 24">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="settings-body">
          {/* THEME */}
          <div className="setting-group">
            <h3>Theme</h3>
            <div className="theme-grid" id="theme-grid">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  className={`theme-swatch ${settings.theme === t.id && !settings.ytMode ? 'is-active' : ''}`}
                  title={t.name}
                  onClick={() => onSelectTheme(t.id)}
                >
                  <span className="sw" style={{ background: t.sw }}></span>
                  <span className="nm">{t.name}</span>
                </button>
              ))}
            </div>

            <div className="setting-row" style={{ marginTop: '10px' }}>
              <div>
                <div className="label">YouTube style</div>
                <div className="sub">Familiar red accents &amp; dark grey look</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="opt-yt"
                  checked={settings.ytMode}
                  onChange={(e) => onToggleYouTubeMode(e.target.checked)}
                />
                <span className="track"></span>
                <span className="knob"></span>
              </label>
            </div>

            <div className="setting-row">
              <div>
                <div className="label">Follow system</div>
                <div className="sub">Auto light / dark</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="opt-system"
                  checked={settings.systemTheme}
                  onChange={(e) => onToggleSystemTheme(e.target.checked)}
                />
                <span className="track"></span>
                <span className="knob"></span>
              </label>
            </div>
          </div>

          {/* ACCENT PALETTE */}
          <div className="setting-group">
            <h3>Accent palette</h3>
            <div className="palette-grid" id="palette-grid">
              {PALETTE.map((a) => {
                const isActive =
                  !settings.ytMode &&
                  a.h === currentAccent.h &&
                  a.s === currentAccent.s &&
                  a.l === currentAccent.l;
                return (
                  <button
                    key={a.name}
                    className={`palette-dot ${isActive ? 'is-active' : ''}`}
                    data-dark-check={a.l <= 62 ? 1 : 0}
                    style={{ background: `hsl(${a.h},${a.s}%,${a.l}%)` }}
                    title={a.name}
                    aria-label={a.name}
                    onClick={() => onSelectAccent(a)}
                  />
                );
              })}
            </div>
            <div className="palette-name" id="palette-name">
              {settings.ytMode
                ? 'YouTube Red (YouTube style)'
                : activePaletteItem?.name || ''}
            </div>
          </div>

          {/* APPEARANCE */}
          <div className="setting-group">
            <h3>Appearance</h3>
            <div className="setting-row">
              <div>
                <div className="label">Border radius</div>
                <div className="sub" id="radius-val">{settings.radius}px</div>
              </div>
              <input
                type="range"
                id="opt-radius"
                min="6"
                max="26"
                step="1"
                value={settings.radius}
                style={{ ['--fill' as any]: getRangeFill(settings.radius, 6, 26) }}
                aria-label="Border radius"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateSettings((prev) => ({ ...prev, radius: val }));
                }}
              />
            </div>

            <div className="setting-row">
              <div>
                <div className="label">UI density</div>
              </div>
              <div className="segmented" id="density-seg">
                <button
                  className={settings.density === 0.85 ? 'is-active' : ''}
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, density: 0.85 }))}
                >
                  Compact
                </button>
                <button
                  className={settings.density === 1 ? 'is-active' : ''}
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, density: 1 }))}
                >
                  Cozy
                </button>
                <button
                  className={settings.density === 1.15 ? 'is-active' : ''}
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, density: 1.15 }))}
                >
                  Spacious
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="label">Transparency</div>
                <div className="sub" id="glass-val">{settings.glass}%</div>
              </div>
              <input
                type="range"
                id="opt-glass"
                min="20"
                max="95"
                step="1"
                value={settings.glass}
                style={{ ['--fill' as any]: getRangeFill(settings.glass, 20, 95) }}
                aria-label="Panel transparency"
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  onUpdateSettings((prev) => ({ ...prev, glass: val }));
                }}
              />
            </div>
          </div>

          {/* MOTION & EFFECTS */}
          <div className="setting-group">
            <h3>Motion &amp; effects</h3>
            <div className="setting-row">
              <div>
                <div className="label">Motion level</div>
              </div>
              <div className="segmented" id="motion-seg">
                <button
                  className={settings.motion === 0 ? 'is-active' : ''}
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, motion: 0 }))}
                >
                  Off
                </button>
                <button
                  className={settings.motion === 0.6 ? 'is-active' : ''}
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, motion: 0.6 }))}
                >
                  Reduced
                </button>
                <button
                  className={settings.motion === 1 ? 'is-active' : ''}
                  onClick={() => onUpdateSettings((prev) => ({ ...prev, motion: 1 }))}
                >
                  Full
                </button>
              </div>
            </div>

            <div className="setting-row">
              <div>
                <div className="label">Background effects</div>
                <div className="sub">Orbs, shapes &amp; glow</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="opt-fx"
                  checked={settings.fx}
                  onChange={(e) => onUpdateSettings((prev) => ({ ...prev, fx: e.target.checked }))}
                />
                <span className="track"></span>
                <span className="knob"></span>
              </label>
            </div>
          </div>

          {/* PLAYBACK */}
          <div className="setting-group">
            <h3>Playback</h3>
            <div className="setting-row">
              <div>
                <div className="label">Autoplay on paste</div>
                <div className="sub">Start videos automatically</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="opt-autoplay"
                  checked={settings.autoplay}
                  onChange={(e) => onUpdateSettings((prev) => ({ ...prev, autoplay: e.target.checked }))}
                />
                <span className="track"></span>
                <span className="knob"></span>
              </label>
            </div>

            <div className="setting-row">
              <div>
                <div className="label">Save history</div>
                <div className="sub">Remember watched videos</div>
              </div>
              <label className="toggle">
                <input
                  type="checkbox"
                  id="opt-history"
                  checked={settings.saveHistory}
                  onChange={(e) => onUpdateSettings((prev) => ({ ...prev, saveHistory: e.target.checked }))}
                />
                <span className="track"></span>
                <span className="knob"></span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-foot">
          <button id="reset-settings" onClick={onReset}>
            Reset all settings
          </button>
        </div>
      </aside>
    </>
  );
};
