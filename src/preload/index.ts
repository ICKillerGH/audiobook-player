import { contextBridge, ipcRenderer, type IpcRendererEvent } from "electron";
import type {
  AddMarkerInput,
  AudiobookApi,
  OsMediaCommand,
  OsMediaState,
  PlayerSettings,
  SaveProgressInput
} from "../shared/types";

const audiobookApi: AudiobookApi = {
  getLibrary: () => ipcRenderer.invoke("library:get"),
  importFiles: () => ipcRenderer.invoke("library:import-files"),
  importFolder: () => ipcRenderer.invoke("library:import-folder"),
  removeBook: (bookId: string) => ipcRenderer.invoke("library:remove", bookId),
  getMediaUrl: (bookId: string) => ipcRenderer.invoke("book:media-url", bookId),
  saveProgress: (input: SaveProgressInput) => ipcRenderer.invoke("progress:save", input),
  addMarker: (input: AddMarkerInput) => ipcRenderer.invoke("marker:add", input),
  removeMarker: (bookId: string, markerId: string) => ipcRenderer.invoke("marker:remove", bookId, markerId),
  getSettings: () => ipcRenderer.invoke("settings:get"),
  updateSettings: (settings: Partial<PlayerSettings>) => ipcRenderer.invoke("settings:update", settings),
  revealInFolder: (bookId: string) => ipcRenderer.invoke("book:reveal", bookId),
  setOsMediaState: (state: OsMediaState) => ipcRenderer.send("os-media:update-state", state),
  onOsMediaCommand: (callback: (command: OsMediaCommand) => void) => {
    const listener = (_event: IpcRendererEvent, command: OsMediaCommand): void => callback(command);
    ipcRenderer.on("os-media:command", listener);
    return () => ipcRenderer.off("os-media:command", listener);
  }
};

contextBridge.exposeInMainWorld("audiobook", audiobookApi);
