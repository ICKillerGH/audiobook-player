import type { Audiobook, AudiobookMarker } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { bookProgress, formatDate, formatFileSize, formatTime } from "@/shared/lib/format";

interface BookDetailsPanelProps {
  selectedBook?: Audiobook;
  statusMessage: string;
  onRevealInFolder: (bookId: string) => void | Promise<void>;
  onRemoveBook: () => void | Promise<void>;
  onJumpToMarker: (marker: AudiobookMarker) => void | Promise<void>;
  onRemoveMarker: (marker: AudiobookMarker) => void | Promise<void>;
}

export function BookDetailsPanel({ selectedBook, statusMessage, onRevealInFolder, onRemoveBook, onJumpToMarker, onRemoveMarker }: BookDetailsPanelProps) {
  return (
    <Surface className="min-h-0" innerClassName="flex min-h-0 flex-col p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <Badge>Book Details</Badge>
          <h3 className="mt-3 font-display text-utility">Markers</h3>
        </div>
        {selectedBook ? (
          <Button variant="ghost" size="sm" onClick={() => void onRevealInFolder(selectedBook.id)}>
            Reveal
          </Button>
        ) : null}
      </div>

      <div className="scroll-quiet min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {selectedBook?.markers.length ? (
          selectedBook.markers.map((marker) => (
            <div key={marker.id} className="rounded-panel bg-apple-gray p-3">
              <button type="button" className="w-full text-left" onClick={() => void onJumpToMarker(marker)}>
                <div className="flex items-center justify-between gap-3">
                  <p className="font-text text-[15px] font-semibold text-apple-ink">{marker.label}</p>
                  <span className="rounded-full bg-white px-2 py-1 text-micro font-semibold text-apple-link shadow-hairline">
                    {formatTime(marker.timestamp)}
                  </span>
                </div>
                <p className="mt-2 text-micro text-apple-neutral">Created {formatDate(marker.createdAt)}</p>
              </button>
              <button type="button" className="mt-3 text-micro font-semibold text-apple-neutral hover:text-apple-ink" onClick={() => void onRemoveMarker(marker)}>
                Remove marker
              </button>
            </div>
          ))
        ) : (
          <div className="rounded-module bg-apple-gray p-4 text-control text-apple-neutral">
            {selectedBook ? "No markers yet. Save one from the current playback position." : "Select a book to see markers."}
          </div>
        )}
      </div>

      <div className="mt-3 border-t border-apple-soft pt-3 text-control text-apple-neutral">
        <p className="truncate">{selectedBook?.fileName ?? "No file selected"}</p>
        <p className="mt-1">{selectedBook ? `${formatFileSize(selectedBook.size)} · ${bookProgress(selectedBook)}% complete` : statusMessage}</p>
        {selectedBook ? (
          <Button variant="ghost" size="sm" className="mt-3 text-apple-neutral" onClick={() => void onRemoveBook()}>
            Remove from library
          </Button>
        ) : null}
      </div>
    </Surface>
  );
}
