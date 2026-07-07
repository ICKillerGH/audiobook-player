import type { Audiobook, AudiobookMarker } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatTime } from "@/shared/lib/format";

interface MarkerListPanelProps {
  selectedBook?: Audiobook;
  onJumpToMarker: (marker: AudiobookMarker) => void | Promise<void>;
  onRemoveMarker: (marker: AudiobookMarker) => void | Promise<void>;
}

export function MarkerListPanel({ selectedBook, onJumpToMarker, onRemoveMarker }: MarkerListPanelProps) {
  return (
    <section className="scroll-quiet flex max-h-[520px] min-h-[280px] flex-col overflow-y-auto rounded-module bg-white p-4 shadow-hairline">
      <div className="mb-4">
        <Badge>Saved Places</Badge>
        <h3 className="mt-3 font-display text-utility text-apple-ink">Marker list</h3>
      </div>

      <div className="space-y-3">
        {selectedBook?.markers.length ? (
          selectedBook.markers.map((marker) => (
            <div key={marker.id} className="rounded-panel bg-apple-gray p-3">
              <button
                type="button"
                className="w-full text-left"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void onJumpToMarker(marker);
                }}
              >
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
    </section>
  );
}
