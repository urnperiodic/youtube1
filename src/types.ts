export interface PlayItem {
  kind: 'video' | 'playlist';
  videoId?: string;
  listId?: string | null;
  start?: number;
  title?: string;
  author?: string;
  thumb?: string | null;
  watchedAt?: number;
  favedAt?: number;
  description?: string;
  viewCount?: number;
  lengthSeconds?: number;
  publishedText?: string;
  inLibrary?: boolean;
  score?: number;
}

export interface AccentColor {
  name: string;
  h: number;
  s: number;
  l: number;
}

export interface ThemeOption {
  id: string;
  name: string;
  sw: string;
}

export interface AppSettings {
  theme: string;
  systemTheme: boolean;
  accent: { h: number; s: number; l: number };
  radius: number;
  density: number;
  glass: number;
  motion: number;
  fx: boolean;
  autoplay: boolean;
  saveHistory: boolean;
  ytMode: boolean;
  preYT: { theme: string; accent: { h: number; s: number; l: number } } | null;
  history: PlayItem[];
  favorites: PlayItem[];
}

export const THEMES: ThemeOption[] = [
  { id: 'midnight', name: 'Midnight', sw: 'linear-gradient(135deg,#0b0d14,#1c2133)' },
  { id: 'slate',    name: 'Slate',    sw: 'linear-gradient(135deg,#101318,#222834)' },
  { id: 'ocean',    name: 'Ocean',    sw: 'linear-gradient(135deg,#071118,#14405a)' },
  { id: 'emerald',  name: 'Emerald',  sw: 'linear-gradient(135deg,#08120d,#155e3e)' },
  { id: 'sunset',   name: 'Sunset',   sw: 'linear-gradient(135deg,#170d0c,#8a3a24)' },
  { id: 'lavender', name: 'Lavender', sw: 'linear-gradient(135deg,#100d1a,#4d3a85)' },
  { id: 'light',    name: 'Light',    sw: 'linear-gradient(135deg,#ffffff,#dfe4f0)' },
  { id: 'amoled',   name: 'AMOLED',   sw: 'linear-gradient(135deg,#000,#141417)' },
];

export const PALETTE: AccentColor[] = [
  { name: 'Indigo · Midnight',  h: 226, s: 100, l: 71 },
  { name: 'Sky · Ocean',        h: 199, s: 95,  l: 60 },
  { name: 'Cyan · Midnight',    h: 190, s: 90,  l: 55 },
  { name: 'Teal · Ocean',       h: 170, s: 80,  l: 45 },
  { name: 'Emerald · Emerald',  h: 152, s: 70,  l: 52 },
  { name: 'Lime · Emerald',     h: 90,  s: 70,  l: 50 },
  { name: 'Amber · Sunset',     h: 45,  s: 95,  l: 58 },
  { name: 'Orange · Sunset',    h: 18,  s: 95,  l: 62 },
  { name: 'Rose · Sunset',      h: 340, s: 85,  l: 60 },
  { name: 'Magenta · Lavender', h: 310, s: 80,  l: 62 },
  { name: 'Purple · Midnight',  h: 280, s: 85,  l: 62 },
  { name: 'Violet · Lavender',  h: 265, s: 90,  l: 70 },
  { name: 'Steel · Slate',      h: 215, s: 40,  l: 55 },
  { name: 'Snow · Light',       h: 220, s: 15,  l: 88 },
];

export const YT_ACCENT: AccentColor = { name: 'YouTube Red', h: 0, s: 100, l: 50 };

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'midnight',
  systemTheme: false,
  accent: { h: 226, s: 100, l: 71 },
  radius: 0,
  density: 1,
  glass: 62,
  motion: 1,
  fx: true,
  autoplay: true,
  saveHistory: true,
  ytMode: false,
  preYT: null,
  history: [],
  favorites: [],
};

export const STORAGE_KEY = 'clarity.v1';
