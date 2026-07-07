import { app, BrowserWindow, dialog, ipcMain, shell } from "electron";
import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readFile, readdir, rename, stat, writeFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { dirname, extname, join, parse, resolve } from "node:path";
import { parseFile } from "music-metadata";
import type {
  AddMarkerInput,
  Audiobook,
  AudiobookMarker,
  ImportError,
  ImportResult,
  OsMediaCommand,
  OsMediaState,
  PlayerSettings,
  SaveProgressInput,
  SupportedAudioExtension
} from "../shared/types";

interface LibraryStore {
  version: 1;
  books: Audiobook[];
  settings: PlayerSettings;
}

const supportedExtensions = new Set<SupportedAudioExtension>([".mp3", ".m4a", ".m4b"]);
const defaultSettings: PlayerSettings = {
  playbackRate: 1,
  skipSeconds: 30,
  autoSaveSeconds: 5
};

let cachedStore: LibraryStore | null = null;
let writeQueue = Promise.resolve();
let mediaServer: Server | null = null;
let mediaServerPort: number | null = null;

const mediaToken = randomUUID();
const osMediaStates = new Map<number, OsMediaState>();

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#f5f5f7",
    show: false,
    title: "Audiobook Player",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#f5f5f7",
      symbolColor: "#1d1d1f",
      height: 38
    },
    webPreferences: {
      preload: join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);
  mainWindow.on("app-command", (event, command) => {
    const osCommand = osMediaCommandForAppCommand(command, osMediaStates.get(mainWindow.id));
    if (!osCommand) return;
    event.preventDefault();
    sendOsMediaCommand(mainWindow, osCommand);
  });
  mainWindow.on("closed", () => osMediaStates.delete(mainWindow.id));
  updateWindowOsMediaState(mainWindow, { canPlay: false, isPlaying: false });
  mainWindow.once("ready-to-show", () => mainWindow.show());

  if (process.env.ELECTRON_RENDERER_URL) {
    void mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    void mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }
}

function normalizeOsMediaState(value: unknown): OsMediaState {
  if (!value || typeof value !== "object") {
    return { canPlay: false, isPlaying: false };
  }

  const candidate = value as Partial<OsMediaState>;
  return {
    canPlay: Boolean(candidate.canPlay),
    isPlaying: Boolean(candidate.isPlaying),
    title: typeof candidate.title === "string" && candidate.title.trim() ? candidate.title.trim() : undefined,
    author: typeof candidate.author === "string" && candidate.author.trim() ? candidate.author.trim() : undefined
  };
}

function sendOsMediaCommand(targetWindow: BrowserWindow, command: OsMediaCommand): void {
  if (targetWindow.isDestroyed()) return;
  targetWindow.webContents.send("os-media:command", command);
}

function osMediaCommandForAppCommand(command: string, state: OsMediaState | undefined): OsMediaCommand | null {
  if (!state?.canPlay) return null;

  switch (command) {
    case "media-play-pause":
      return state?.isPlaying ? "pause" : "play";
    case "media-play":
      return "play";
    case "media-pause":
    case "media-stop":
      return "pause";
    case "media-nexttrack":
    case "media-next-track":
      return "seek-forward";
    case "media-previoustrack":
    case "media-previous-track":
      return "seek-backward";
    default:
      return null;
  }
}

function updateWindowOsMediaState(targetWindow: BrowserWindow, state: OsMediaState): void {
  if (targetWindow.isDestroyed()) return;
  osMediaStates.set(targetWindow.id, state);
}

function storePath(): string {
  return join(app.getPath("userData"), "library.json");
}

function emptyStore(): LibraryStore {
  return {
    version: 1,
    books: [],
    settings: { ...defaultSettings }
  };
}

function normalizeSettings(settings: Partial<PlayerSettings> | undefined): PlayerSettings {
  return {
    playbackRate: clamp(Number(settings?.playbackRate ?? defaultSettings.playbackRate), 0.5, 3),
    skipSeconds: Math.round(clamp(Number(settings?.skipSeconds ?? defaultSettings.skipSeconds), 5, 120)),
    autoSaveSeconds: Math.round(clamp(Number(settings?.autoSaveSeconds ?? defaultSettings.autoSaveSeconds), 2, 30))
  };
}

function normalizeStore(value: unknown): LibraryStore {
  if (!value || typeof value !== "object") {
    return emptyStore();
  }

  const candidate = value as Partial<LibraryStore>;
  const books = Array.isArray(candidate.books) ? candidate.books.filter(isAudiobookLike) : [];

  return {
    version: 1,
    books: books.map((book) => ({
      ...book,
      markers: Array.isArray(book.markers) ? book.markers : [],
      progressPosition: Number.isFinite(book.progressPosition) ? book.progressPosition : 0,
      completed: Boolean(book.completed)
    })),
    settings: normalizeSettings(candidate.settings)
  };
}

function isAudiobookLike(value: unknown): value is Audiobook {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Audiobook;
  return typeof candidate.id === "string" && typeof candidate.filePath === "string" && typeof candidate.title === "string";
}

async function loadStore(): Promise<LibraryStore> {
  if (cachedStore) return cachedStore;

  try {
    const raw = await readFile(storePath(), "utf8");
    cachedStore = normalizeStore(JSON.parse(raw));
  } catch {
    cachedStore = emptyStore();
  }

  return cachedStore;
}

async function persistStore(store: LibraryStore): Promise<void> {
  cachedStore = store;
  writeQueue = writeQueue.then(async () => {
    const target = storePath();
    await mkdir(dirname(target), { recursive: true });
    const temp = `${target}.tmp`;
    await writeFile(temp, JSON.stringify(store, null, 2), "utf8");
    await rename(temp, target);
  });

  await writeQueue;
}

function sortBooks(books: Audiobook[]): Audiobook[] {
  return [...books].sort((a, b) => {
    const aTime = new Date(a.lastPlayedAt ?? a.addedAt).getTime();
    const bTime = new Date(b.lastPlayedAt ?? b.addedAt).getTime();
    return bTime - aTime;
  });
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function extensionFor(filePath: string): SupportedAudioExtension | null {
  const extension = extname(filePath).toLowerCase();
  return supportedExtensions.has(extension as SupportedAudioExtension) ? (extension as SupportedAudioExtension) : null;
}

function bookIdForPath(filePath: string): string {
  return createHash("sha1").update(resolve(filePath).toLowerCase()).digest("hex");
}

function firstText(...values: Array<string | string[] | undefined>): string | undefined {
  for (const value of values) {
    if (Array.isArray(value)) {
      const text = value.find((entry) => entry.trim().length > 0);
      if (text) return text.trim();
      continue;
    }

    if (value?.trim()) return value.trim();
  }

  return undefined;
}

async function collectAudiobookFiles(paths: string[]): Promise<string[]> {
  const files = new Set<string>();

  async function visit(entryPath: string): Promise<void> {
    let entryStat;
    try {
      entryStat = await stat(entryPath);
    } catch {
      return;
    }

    if (entryStat.isDirectory()) {
      const children = await readdir(entryPath, { withFileTypes: true });
      await Promise.all(children.map((child) => visit(join(entryPath, child.name))));
      return;
    }

    if (entryStat.isFile() && extensionFor(entryPath)) {
      files.add(resolve(entryPath));
    }
  }

  await Promise.all(paths.map((entry) => visit(entry)));
  return [...files];
}

async function readAudiobook(filePath: string, existing?: Audiobook): Promise<Audiobook> {
  const extension = extensionFor(filePath);
  if (!extension) {
    throw new Error("Unsupported file type");
  }

  const fileStat = await stat(filePath);
  const metadata = await parseFile(filePath, { duration: true });
  const fileInfo = parse(filePath);
  const picture = metadata.common.picture?.[0];
  const coverDataUrl = picture
    ? `data:${picture.format};base64,${Buffer.from(picture.data).toString("base64")}`
    : existing?.coverDataUrl;
  const now = new Date().toISOString();

  return {
    id: bookIdForPath(filePath),
    title: firstText(metadata.common.title, metadata.common.album) ?? fileInfo.name,
    author: firstText(metadata.common.artist, metadata.common.artists, metadata.common.albumartist, metadata.common.composer) ?? "Unknown Author",
    album: firstText(metadata.common.album),
    filePath,
    fileName: fileInfo.base,
    extension,
    duration: Math.round(metadata.format.duration ?? existing?.duration ?? 0),
    size: fileStat.size,
    modifiedAt: new Date(fileStat.mtimeMs).toISOString(),
    addedAt: existing?.addedAt ?? now,
    lastPlayedAt: existing?.lastPlayedAt,
    progressPosition: existing?.progressPosition ?? 0,
    completed: existing?.completed ?? false,
    coverDataUrl,
    markers: existing?.markers ?? []
  };
}

async function importAudiobooks(paths: string[]): Promise<ImportResult> {
  const store = await loadStore();
  const files = await collectAudiobookFiles(paths);
  const errors: ImportError[] = [];
  let importedCount = 0;
  let updatedCount = 0;

  for (const filePath of files) {
    const id = bookIdForPath(filePath);
    const existingIndex = store.books.findIndex((book) => book.id === id);
    const existing = existingIndex >= 0 ? store.books[existingIndex] : undefined;

    try {
      const book = await readAudiobook(filePath, existing);
      if (existingIndex >= 0) {
        store.books[existingIndex] = book;
        updatedCount += 1;
      } else {
        store.books.push(book);
        importedCount += 1;
      }
    } catch (error) {
      errors.push({
        filePath,
        message: error instanceof Error ? error.message : "Unknown import error"
      });
    }
  }

  await persistStore(store);

  return {
    books: sortBooks(store.books),
    importedCount,
    updatedCount,
    skippedCount: Math.max(0, files.length - importedCount - updatedCount - errors.length),
    errors
  };
}

async function getBook(bookId: string): Promise<Audiobook> {
  const store = await loadStore();
  const book = store.books.find((entry) => entry.id === bookId);
  if (!book) throw new Error("Audiobook not found");
  return book;
}

async function saveProgress(input: SaveProgressInput): Promise<Audiobook> {
  const store = await loadStore();
  const book = store.books.find((entry) => entry.id === input.bookId);
  if (!book) throw new Error("Audiobook not found");

  const duration = input.duration && input.duration > 0 ? Math.round(input.duration) : book.duration;
  const position = clamp(input.position, 0, Math.max(duration, input.position, 0));
  const completionThreshold = duration > 0 ? duration * 0.985 : Number.POSITIVE_INFINITY;

  book.duration = duration;
  book.progressPosition = position;
  book.completed = duration > 0 && position >= completionThreshold;
  book.lastPlayedAt = new Date().toISOString();

  await persistStore(store);
  return book;
}

async function addMarker(input: AddMarkerInput): Promise<AudiobookMarker> {
  const store = await loadStore();
  const book = store.books.find((entry) => entry.id === input.bookId);
  if (!book) throw new Error("Audiobook not found");

  const marker: AudiobookMarker = {
    id: randomUUID(),
    bookId: input.bookId,
    timestamp: clamp(input.timestamp, 0, Math.max(input.timestamp, book.duration, 0)),
    label: input.label?.trim() || "Saved marker",
    createdAt: new Date().toISOString()
  };

  book.markers = [...book.markers, marker].sort((a, b) => a.timestamp - b.timestamp);
  await persistStore(store);
  return marker;
}

function contentTypeForExtension(extension: SupportedAudioExtension): string {
  if (extension === ".mp3") return "audio/mpeg";
  return "audio/mp4";
}

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Range",
    "Cache-Control": "no-store"
  };
}

type ByteRange = { start: number; end: number };

function parseRangeHeader(rangeHeader: string | undefined, size: number): ByteRange | "invalid" | null {
  if (!rangeHeader) return null;

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return "invalid";

  const [, startText, endText] = match;
  if (!startText && !endText) return "invalid";

  if (!startText) {
    const suffixLength = Number(endText);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    return {
      start: Math.max(size - suffixLength, 0),
      end: size - 1
    };
  }

  const start = Number(startText);
  const end = endText ? Number(endText) : size - 1;

  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || end < start || start >= size) {
    return "invalid";
  }

  return {
    start,
    end: Math.min(end, size - 1)
  };
}

function sendPlain(res: ServerResponse, statusCode: number, message: string, extraHeaders: Record<string, string> = {}): void {
  res.writeHead(statusCode, {
    ...corsHeaders(),
    ...extraHeaders,
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": String(Buffer.byteLength(message))
  });
  res.end(message);
}

async function handleMediaRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    sendPlain(res, 405, "Method not allowed");
    return;
  }

  try {
    const requestUrl = new URL(req.url ?? "/", "http://127.0.0.1");
    const token = requestUrl.searchParams.get("token");
    if (token !== mediaToken || !requestUrl.pathname.startsWith("/media/")) {
      sendPlain(res, 404, "Not found");
      return;
    }

    const bookId = decodeURIComponent(requestUrl.pathname.slice("/media/".length));
    const book = await getBook(bookId);
    const fileStat = await stat(book.filePath);

    if (!fileStat.isFile() || fileStat.size <= 0) {
      sendPlain(res, 404, "Audio file not found");
      return;
    }

    const requestedRange = parseRangeHeader(req.headers.range, fileStat.size);
    if (requestedRange === "invalid") {
      sendPlain(res, 416, "Requested range not satisfiable", {
        "Content-Range": `bytes */${fileStat.size}`
      });
      return;
    }

    const range = requestedRange ?? { start: 0, end: fileStat.size - 1 };
    const contentLength = range.end - range.start + 1;
    const statusCode = requestedRange ? 206 : 200;

    res.writeHead(statusCode, {
      ...corsHeaders(),
      "Accept-Ranges": "bytes",
      "Content-Type": contentTypeForExtension(book.extension),
      "Content-Length": String(contentLength),
      ...(requestedRange ? { "Content-Range": `bytes ${range.start}-${range.end}/${fileStat.size}` } : {})
    });

    if (req.method === "HEAD") {
      res.end();
      return;
    }

    const stream = createReadStream(book.filePath, { start: range.start, end: range.end });
    stream.on("error", () => {
      if (!res.headersSent) {
        sendPlain(res, 500, "Could not read audio file");
      } else {
        res.destroy();
      }
    });
    stream.pipe(res);
  } catch (error) {
    sendPlain(res, 404, error instanceof Error ? error.message : "Audio file not available");
  }
}

async function ensureMediaServer(): Promise<number> {
  if (mediaServerPort) return mediaServerPort;

  return new Promise((resolveServer, rejectServer) => {
    const server = createServer((req, res) => {
      void handleMediaRequest(req, res);
    });

    server.once("error", rejectServer);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", rejectServer);
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        rejectServer(new Error("Could not start local media server"));
        return;
      }

      mediaServer = server;
      mediaServerPort = address.port;
      resolveServer(address.port);
    });
  });
}

function registerIpc(): void {
  ipcMain.on("os-media:update-state", (event, state: unknown) => {
    const targetWindow = BrowserWindow.fromWebContents(event.sender);
    if (!targetWindow) return;
    updateWindowOsMediaState(targetWindow, normalizeOsMediaState(state));
  });

  ipcMain.handle("library:get", async () => sortBooks((await loadStore()).books));

  ipcMain.handle("library:import-files", async () => {
    const result = await dialog.showOpenDialog({
      title: "Add audiobooks",
      buttonLabel: "Add to Library",
      properties: ["openFile", "multiSelections"],
      filters: [{ name: "Audiobooks", extensions: ["mp3", "m4a", "m4b"] }]
    });

    if (result.canceled) {
      const store = await loadStore();
      return { books: sortBooks(store.books), importedCount: 0, updatedCount: 0, skippedCount: 0, errors: [] } satisfies ImportResult;
    }

    return importAudiobooks(result.filePaths);
  });

  ipcMain.handle("library:import-folder", async () => {
    const result = await dialog.showOpenDialog({
      title: "Add audiobook folder",
      buttonLabel: "Scan Folder",
      properties: ["openDirectory", "multiSelections"]
    });

    if (result.canceled) {
      const store = await loadStore();
      return { books: sortBooks(store.books), importedCount: 0, updatedCount: 0, skippedCount: 0, errors: [] } satisfies ImportResult;
    }

    return importAudiobooks(result.filePaths);
  });

  ipcMain.handle("library:remove", async (_event, bookId: string) => {
    const store = await loadStore();
    store.books = store.books.filter((book) => book.id !== bookId);
    await persistStore(store);
    return sortBooks(store.books);
  });

  ipcMain.handle("book:media-url", async (_event, bookId: string) => {
    const book = await getBook(bookId);
    const port = await ensureMediaServer();
    return `http://127.0.0.1:${port}/media/${encodeURIComponent(book.id)}?token=${mediaToken}&modified=${encodeURIComponent(book.modifiedAt)}`;
  });

  ipcMain.handle("book:reveal", async (_event, bookId: string) => {
    const book = await getBook(bookId);
    shell.showItemInFolder(book.filePath);
  });

  ipcMain.handle("progress:save", async (_event, input: SaveProgressInput) => saveProgress(input));
  ipcMain.handle("marker:add", async (_event, input: AddMarkerInput) => addMarker(input));

  ipcMain.handle("marker:remove", async (_event, bookId: string, markerId: string) => {
    const store = await loadStore();
    const book = store.books.find((entry) => entry.id === bookId);
    if (!book) throw new Error("Audiobook not found");
    book.markers = book.markers.filter((marker) => marker.id !== markerId);
    await persistStore(store);
    return book;
  });

  ipcMain.handle("settings:get", async () => (await loadStore()).settings);
  ipcMain.handle("settings:update", async (_event, settings: Partial<PlayerSettings>) => {
    const store = await loadStore();
    store.settings = normalizeSettings({ ...store.settings, ...settings });
    await persistStore(store);
    return store.settings;
  });
}

if (process.platform === "win32") {
  app.setAppUserModelId("Audiobook Player");
}

app.whenReady().then(() => {
  registerIpc();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  mediaServer?.close();
  mediaServer = null;
  mediaServerPort = null;
});
