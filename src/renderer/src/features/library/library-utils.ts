import type { Audiobook } from "@shared/types";

export function filterBooks(books: Audiobook[], search: string): Audiobook[] {
  const query = search.trim().toLowerCase();
  if (!query) return books;

  return books.filter((book) => `${book.title} ${book.author} ${book.album ?? ""} ${book.fileName}`.toLowerCase().includes(query));
}

export function totalLibraryMinutes(books: Audiobook[]): number {
  return Math.round(books.reduce((total, book) => total + book.duration, 0) / 60);
}
