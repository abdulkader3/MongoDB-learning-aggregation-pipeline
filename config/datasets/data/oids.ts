/** Deterministic, environment-safe ObjectId-like generator (24 hex chars). */
export function oid(salt: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < salt.length; i += 1) {
    const c = salt.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619);
    h2 = Math.imul(h2 ^ c, 2654435761);
  }
  const pad = (n: number) => n.toString(16).padStart(12, "0");
  return (pad(h1 >>> 0) + pad(h2 >>> 0)).slice(0, 24);
}

/** Produces an ISO date string for a local calendar date. */
export function iso(y: number, m: number, d: number) {
  return new Date(y, m - 1, d).toISOString();
}

export function isoDateTime(isoDate: string, time: string) {
  return new Date(`${isoDate}T${time}`).toISOString();
}
