import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileIcon, FolderIcon } from "@/shared/components/icons";

interface AppHeaderProps {
  isImporting: boolean;
  onImportFiles: () => void | Promise<void>;
  onImportFolder: () => void | Promise<void>;
}

export function AppHeader({ isImporting, onImportFiles, onImportFolder }: AppHeaderProps) {
  return (
    <header className="mb-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <img
          src="./app-icon.png"
          alt=""
          aria-hidden="true"
          draggable={false}
          className="h-16 w-16 select-none rounded-[1.4rem] shadow-soft"
        />
        <div>
          <Badge>Windows library player</Badge>
          <h1 className="mt-3 font-display text-[clamp(2rem,3.4vw,3.75rem)] font-semibold leading-[1.04] tracking-[-0.045em]">Audiobook Player</h1>
        </div>
      </div>
      <div className="no-drag flex items-center gap-3">
        <Button variant="secondary" onClick={() => void onImportFiles()} disabled={isImporting}>
          <FileIcon /> Files
        </Button>
        <Button variant="primary" onClick={() => void onImportFolder()} disabled={isImporting}>
          <FolderIcon /> Add Folder
        </Button>
      </div>
    </header>
  );
}
