import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimerIcon } from "@/shared/components/icons";
import { formatCountdown } from "@/shared/lib/format";

const sleepPresets = [15, 30, 45, 60];

interface SleepTimerPanelProps {
  sleepRemaining: number | null;
  customSleepMinutes: string;
  onCustomSleepMinutesChange: (value: string) => void;
  onStartPreset: (minutes: number) => void;
  onStartCustom: () => void;
  onCancel: () => void;
}

export function SleepTimerPanel({
  sleepRemaining,
  customSleepMinutes,
  onCustomSleepMinutesChange,
  onStartPreset,
  onStartCustom,
  onCancel
}: SleepTimerPanelProps) {
  return (
    <div className="scroll-quiet flex min-h-0 flex-col overflow-y-auto rounded-module bg-white p-4 shadow-hairline">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge>Sleep</Badge>
          <h3 className="mt-3 font-display text-utility">Auto off</h3>
        </div>
        <TimerIcon className="text-apple-neutral" />
      </div>
      <p className="mt-2 text-control text-apple-neutral">When the timer ends, playback pauses. Your progress is saved before stopping.</p>
      <div className="mt-4 grid grid-cols-4 gap-2">
        {sleepPresets.map((minutes) => (
          <Button key={minutes} variant="quiet" size="sm" onClick={() => onStartPreset(minutes)}>
            {minutes}m
          </Button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <Input value={customSleepMinutes} onChange={(event) => onCustomSleepMinutesChange(event.target.value)} inputMode="numeric" className="h-10" />
        <Button variant="secondary" onClick={onStartCustom}>Set</Button>
      </div>
      <div className="mt-auto pt-4">
        {sleepRemaining === null ? (
          <p className="text-control text-apple-neutral">Timer inactive</p>
        ) : (
          <div className="flex items-center justify-between rounded-full bg-apple-ink px-4 py-3 text-white">
            <span className="text-control font-semibold">{formatCountdown(sleepRemaining)}</span>
            <button type="button" className="text-control text-white/[0.66] hover:text-white" onClick={onCancel}>
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
