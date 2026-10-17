# Clarity Video

A distraction-free YouTube viewer built with React, TypeScript, and Vite. Watch YouTube videos and playlists in peace — no algorithmic feeds, no comments, no ads, and no noise.

## Features

- **Omnibox Command Bar**: Paste YouTube video URLs, YouTube Shorts, or playlist links to watch immediately, or type keywords to search.
- **Privacy-Friendly Embed Player**: Plays videos via `youtube-nocookie.com` with clean controls, aspect-ratio preservation, and responsive layout.
- **Real-Time oEmbed Metadata**: Fetches vidqeo titles and author/channel details automatically.
- **Relevance-Ranked Search**: Searches videos across public Invidious instances + local library with intelligent token and channel weighting.
- **Personal Library**: Local history (up to 60 items) and saved favorites with one-click toggles and persistence in browser storage (`localStorage`).
- **Comprehensive Theming**:
  - 8 distinct color themes (Midnight, Slate, Ocean, Emerald, Sunset, Lavender, Light, AMOLED) + dedicated YouTube style mode.
  - 14 customizable accent colors.
  - Border radius, UI density, transparency (glassmorphism), and motion level controls.
  - Animated ambient orbs and interactive cursor glow (can be toggled in settings).
- **Focus Mode & PiP**: Dim background noise for deep listening/viewing, with quick Esc key exit.
- **Keyboard Shortcuts**:
  - `/`: Focus search/URL bar
  - `Ctrl + V`: Paste & play anywhere
  - `S`: Toggle settings panel
  - `D`: Toggle Focus mode
  - `F`: Favorite current video
  - `Shift + F`: Fullscreen player
  - `C`: Copy share link
  - `P`: Picture-in-Picture instructions
  - `T`: Cycle color theme
  - `Esc`: Close open drawers/modals & exit focus mode
  - `?`: Open keyboard shortcuts helper

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Bundler & Dev Server**: Vite
- **Styling**: Native CSS with custom design tokens, backdrop filters, and keyframe animations

## Development

```bash
npm run dev
```

The app will run on port 3000.
