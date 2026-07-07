import type { Audiobook } from "@shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookmarkIcon } from "@/shared/components/icons";
import { formatTime } from "@/shared/lib/format";

interface MarkerComposerProps {
  selectedBook?: Audiobook;
  markerLabel: string;
  currentTime: number;
  onMarkerLabelChange: (value: string) => void;
  onAddMarker: () => void | Promise<void>;
}

export function MarkerComposer({ selectedBook, markerLabel, currentTime, onMarkerLabelChange, onAddMarker }: MarkerComposerProps) {
  return (
    <div className="scroll-quiet flex min-h-0 flex-col overflow-y-auto rounded-module bg-apple-gray p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge tone="blue">Markers</Badge>
          <h3 className="mt-3 font-display text-utility">Save a moment</h3>
        </div>
        <BookmarkIcon className="text-apple-link" />
      </div>
      <p className="mt-2 text-control text-apple-neutral">Drop a marker at the current timestamp. Add a short note if the scene needs context.</p>
      <div className="mt-auto space-y-3 pt-4">
        <Input value={markerLabel} onChange={(event) => onMarkerLabelChange(event.target.value)} placeholder="Optional marker note" disabled={!selectedBook} />
        <Button variant="dark" className="w-full" onClick={() => void onAddMarker()} disabled={!selectedBook}>
          Save Marker at {formatTime(currentTime)}
        </Button>
      </div>
    </div>
  );
}
