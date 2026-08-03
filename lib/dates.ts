export function toDayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDayKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function daysBetween(a: string, b: string) {
  const da = parseDayKey(a);
  const db = parseDayKey(b);
  return Math.round((db.getTime() - da.getTime()) / 86_400_000);
}

export function isYesterday(key: string) {
  return daysBetween(key, toDayKey()) === 1;
}

export function isToday(key: string) {
  return daysBetween(key, toDayKey()) === 0;
}

/** Deterministic index derived from a day key (for daily challenge rotation). */
export function dayIndex(seed = 7) {
  const key = toDayKey();
  let hash = seed;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) % 100_000;
  }
  return hash;
}

/** Format a streak list of day keys into a 14-day heatmap sequence. */
export function last14Days(today = toDayKey()) {
  const out: { key: string; label: string; active: boolean }[] = [];
  const base = parseDayKey(today);
  for (let i = 13; i >= 0; i -= 1) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    out.push({
      key: toDayKey(d),
      label: d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 2),
      active: false,
    });
  }
  return out;
}
