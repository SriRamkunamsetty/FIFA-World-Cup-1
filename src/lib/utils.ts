/** Joins conditional class names, skipping falsy values. Avoids pulling in clsx/tailwind-merge for one small need. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

/** Formats an ISO timestamp as a short local time string for the UI. */
export function formatClock(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
