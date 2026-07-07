export type SupportedAudioExtension = ".mp3" | ".m4a" | ".m4b";

export interface AudiobookMarker {
  id: string;
  bookId: string;
  timestamp: number;
  label: string;
  createdAt: string;
}

export interface Audiobook {
  id: string;
  title: string;
  author: string;
  album?: string;
  filePath: string;
  fileName: string;
  extension: SupportedAudioExtension;
  duration: number;
  size: number;
  modifiedAt: string;
  addedAt: string;
  lastPlayedAt?: string;
  progressPosition: number;
  completed: boolean;
  coverDataUrl?: string;
  markers: AudiobookMarker[];
}

export interface PlayerSettings {
  playbackRate: number;
  skipSeconds: number;
  autoSaveSeconds: number;
}

export interface ImportError {
  filePath: string;
  message: string;
}

export interface ImportResult {
  books: Audiobook[];
  importedCount: number;
  updatedCount: number;
  skippedCount: number;
  errors: ImportError[];
}

export interface SaveProgressInput {
  bookId: string;
  position: number;
  duration?: number;
}

export interface AddMarkerInput {
  bookId: string;
  timestamp: number;
  label?: string;
}

export interface AudiobookApi {
  getLibrary: () => Promise<Audiobook[]>;
  importFiles: () => Promise<ImportResult>;
  importFolder: () => Promise<ImportResult>;
  removeBook: (bookId: string) => Promise<Audiobook[]>;
  getMediaUrl: (bookId: string) => Promise<string>;
  saveProgress: (input: SaveProgressInput) => Promise<Audiobook>;
  addMarker: (input: AddMarkerInput) => Promise<AudiobookMarker>;
  removeMarker: (bookId: string, markerId: string) => Promise<Audiobook>;
  getSettings: () => Promise<PlayerSettings>;
  updateSettings: (settings: Partial<PlayerSettings>) => Promise<PlayerSettings>;
  revealInFolder: (bookId: string) => Promise<void>;
}
