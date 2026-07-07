import { Dialog, DialogBody, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SleepTimerPanel } from "./SleepTimerPanel";

interface SleepTimerDialogProps {
  open: boolean;
  sleepRemaining: number | null;
  customSleepMinutes: string;
  onOpenChange: (open: boolean) => void;
  onCustomSleepMinutesChange: (value: string) => void;
  onStartPreset: (minutes: number) => void;
  onStartCustom: () => void;
  onCancel: () => void;
}

export function SleepTimerDialog({
  open,
  sleepRemaining,
  customSleepMinutes,
  onOpenChange,
  onCustomSleepMinutesChange,
  onStartPreset,
  onStartCustom,
  onCancel
}: SleepTimerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sleep timer</DialogTitle>
          <DialogDescription>Pause playback automatically after a preset or custom time.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <SleepTimerPanel
            sleepRemaining={sleepRemaining}
            customSleepMinutes={customSleepMinutes}
            onCustomSleepMinutesChange={onCustomSleepMinutesChange}
            onStartPreset={onStartPreset}
            onStartCustom={onStartCustom}
            onCancel={onCancel}
          />
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
