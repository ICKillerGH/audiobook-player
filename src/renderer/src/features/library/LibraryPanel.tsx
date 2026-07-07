import type { Audiobook } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/ui/surface";
import { cn } from "@/lib/utils";
import { BookCover } from "@/shared/components/BookCover";
import { FolderIcon, SearchIcon } from "@/shared/components/icons";
import { bookProgress, formatDuration, formatLibraryMinutes } from "@/shared/lib/format";
import { totalLibraryMinutes } from "./library-utils";

interface LibraryPanelProps {
  books: Audiobook[];
  visibleBooks: Audiobook[];
  selectedBook?: Audiobook;
  isImporting: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  onSelectBook: (bookId: string) => void;
}

export function LibraryPanel({ books, visibleBooks, selectedBook, isImporting, search, onSearchChange, onSelectBook }: LibraryPanelProps) {
  return (
    <Surface className="min-h-0" innerClassName="flex min-h-0 flex-col p-5">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-text text-micro font-semibold uppercase tracking-[0.2em] text-apple-neutral">Library</p>
          <p className="mt-1 text-control text-apple-neutral">{books.length} books · {formatLibraryMinutes(totalLibraryMinutes(books))}</p>
        </div>
        {isImporting ? <Badge tone="blue">Scanning</Badge> : null}
      </div>

      <div className="relative mb-4">
        <SearchIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-apple-neutral" />
        <Input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="Search books, authors, files" className="pl-11" />
      </div>

      <div className="scroll-quiet min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {visibleBooks.length ? (
          visibleBooks.map((book) => (
            <button
              key={book.id}
              type="button"
              onClick={() => onSelectBook(book.id)}
              className={cn(
                "group flex w-full gap-3 rounded-panel p-3 text-left transition-[background-color,transform,box-shadow] duration-500 ease-apple hover:bg-black/[0.035] active:scale-[0.99]",
                selectedBook?.id === book.id && "bg-black/[0.055] shadow-hairline"
              )}
            >
              <BookCover book={book} size="small" />
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate font-text text-[15px] font-semibold leading-tight text-apple-ink">{book.title}</p>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase text-apple-neutral shadow-hairline">
                    {book.extension.slice(1)}
                  </span>
                </div>
                <p className="mt-1 truncate text-control text-apple-neutral">{book.author}</p>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10">
                  <div className="h-full rounded-full bg-apple-blue" style={{ width: `${bookProgress(book)}%` }} />
                </div>
                <p className="mt-2 text-micro text-apple-neutral">{bookProgress(book)}% · {formatDuration(book.duration)}</p>
              </div>
            </button>
          ))
        ) : (
          <EmptyLibrary search={search} />
        )}
      </div>
    </Surface>
  );
}

function EmptyLibrary({ search }: { search: string }) {
  return (
    <div className="rounded-module bg-apple-gray p-5 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-hairline">
        <FolderIcon className="text-apple-neutral" />
      </div>
      <h2 className="mt-4 font-display text-[22px] font-semibold">{search ? "No matches" : "No audiobooks yet"}</h2>
      <p className="mt-2 text-control text-apple-neutral">
        {search ? "Try a different title, author, or file name." : "Add individual files or scan a folder for .mp3, .m4a, and .m4b files."}
      </p>
    </div>
  );
}
