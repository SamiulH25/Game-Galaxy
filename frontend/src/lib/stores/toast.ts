import { writable } from 'svelte/store';

export type ToastKind = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  message: string;
  kind: ToastKind;
}

let nextId = 0;
const timers = new Map<number, ReturnType<typeof setTimeout>>();

export const toasts = writable<Toast[]>([]);

export function showToast(message: string, kind: ToastKind = 'info', durationMs = 3200) {
  const id = ++nextId;
  toasts.update((list) => [...list, { id, message, kind }]);
  const timer = setTimeout(() => dismissToast(id), durationMs);
  timers.set(id, timer);
}

export function dismissToast(id: number) {
  const timer = timers.get(id);
  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }
  toasts.update((list) => list.filter((t) => t.id !== id));
}
