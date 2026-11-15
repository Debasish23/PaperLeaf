const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });

export function formatDate(ts) {
  return dateFmt.format(new Date(ts));
}

/** "Today, 3:40 PM", "Yesterday, 9:12 AM" or a plain date. */
export function formatEdited(ts) {
  const d = new Date(ts);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  if (ts >= startOfToday.getTime()) return `Today, ${timeFmt.format(d)}`;
  if (ts >= startOfToday.getTime() - dayMs) return `Yesterday, ${timeFmt.format(d)}`;
  return dateFmt.format(d);
}

export function countWords(text) {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
