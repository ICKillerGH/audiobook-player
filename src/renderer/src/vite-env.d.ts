/// <reference types="vite/client" />

import type { AudiobookApi } from "@shared/types";

declare global {
  interface Window {
    audiobook: AudiobookApi;
  }
}

export {};
