import { useEffect, useRef } from "react";

export type KeyPressEventName = "keydown" | "keyup";

export interface UseKeyPressOptions {
  enabled?: boolean;
  eventName?: KeyPressEventName;
  target?: EventTarget | null;
  preventDefault?: boolean;
  ignoreEditable?: boolean;
  ignoreModifiedKeys?: boolean;
  ignoreRepeat?: boolean;
  caseSensitive?: boolean;
}

export type KeyPressHandler = (event: KeyboardEvent) => void | Promise<void>;

export function useKeyPress(
  keys: string | readonly string[],
  handler: KeyPressHandler,
  options: UseKeyPressOptions = {}
): void {
  const keysRef = useRef<readonly string[]>([]);
  const handlerRef = useRef(handler);
  const optionsRef = useRef(options);

  keysRef.current = Array.isArray(keys) ? keys : [keys];
  handlerRef.current = handler;
  optionsRef.current = options;

  const enabled = options.enabled ?? true;
  const eventName = options.eventName ?? "keydown";
  const target = options.target;

  useEffect(() => {
    if (!enabled) return;

    const eventTarget = target === undefined ? window : target;
    if (!eventTarget) return;

    const listener = (event: Event): void => {
      if (!(event instanceof KeyboardEvent)) return;

      const currentOptions = optionsRef.current;
      if (event.isComposing) return;
      if (currentOptions.ignoreRepeat && event.repeat) return;
      if ((currentOptions.ignoreModifiedKeys ?? true) && hasModifierKey(event)) return;
      if ((currentOptions.ignoreEditable ?? true) && isEditableTarget(event.target)) return;
      if (!matchesKey(event.key, keysRef.current, currentOptions.caseSensitive ?? false)) return;

      if (currentOptions.preventDefault) event.preventDefault();
      void handlerRef.current(event);
    };

    eventTarget.addEventListener(eventName, listener);
    return () => eventTarget.removeEventListener(eventName, listener);
  }, [enabled, eventName, target]);
}

function hasModifierKey(event: KeyboardEvent): boolean {
  return event.altKey || event.ctrlKey || event.metaKey;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function matchesKey(eventKey: string, keys: readonly string[], caseSensitive: boolean): boolean {
  if (caseSensitive) return keys.includes(eventKey);

  const normalizedEventKey = eventKey.toLowerCase();
  return keys.some((key) => key.toLowerCase() === normalizedEventKey);
}
