// Deterministic PRNG utilities for the Mongo Quest dataset.
// Every generated dataset is reproducible from a single numeric seed.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeRng(seed) {
  const rand = mulberry32(seed);

  const rng = {
    /** float in [min, max) */
    float(min = 0, max = 1) {
      return min + rand() * (max - min);
    },
    /** float rounded to `decimals` */
    dec(min, max, decimals = 2) {
      const v = min + rand() * (max - min);
      const p = Math.pow(10, decimals);
      return Math.round(v * p) / p;
    },
    /** int in [min, max] inclusive */
    int(min, max) {
      return Math.floor(rand() * (max - min + 1)) + min;
    },
    bool(p = 0.5) {
      return rand() < p;
    },
    pick(arr) {
      return arr[Math.floor(rand() * arr.length)];
    },
    /** n distinct picks */
    pickN(arr, n) {
      const copy = [...arr];
      const out = [];
      const k = Math.min(n, copy.length);
      for (let i = 0; i < k; i++) {
        const idx = Math.floor(rand() * copy.length);
        out.push(copy.splice(idx, 1)[0]);
      }
      return out;
    },
    /** n picks with replacement */
    pickWithReplacement(arr, n) {
      const out = [];
      for (let i = 0; i < n; i++) out.push(rng.pick(arr));
      return out;
    },
    shuffle(arr) {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
    /** ISO datetime between two Date values */
    date(from, to) {
      const f = typeof from === "string" ? Date.parse(from) : from.getTime();
      const t = typeof to === "string" ? Date.parse(to) : to.getTime();
      return new Date(f + rand() * (t - f)).toISOString();
    },
    /** 24-hex-character ObjectId-like string */
    oid() {
      let out = "";
      for (let i = 0; i < 24; i++) {
        out += Math.floor(rand() * 16).toString(16);
      }
      return out;
    },
    /** weighted pick: { value: weight } */
    weighted(map) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = rand() * total;
      for (const [value, w] of entries) {
        r -= w;
        if (r <= 0) return value;
      }
      return entries[entries.length - 1][0];
    },
    /** gaussian-ish int centered around mid */
    normal(mid, spread) {
      const u = rand() + rand() + rand() + rand() - 2;
      return Math.max(0, Math.round(mid + u * spread));
    },
  };
  return rng;
}

const FIRST_NAMES = [
  "Aiden", "Maya", "Leo", "Nora", "Kai", "Ivy", "Owen", "Zara", "Ethan", "Lila",
  "Noah", "Ella", "Liam", "Aria", "Lucas", "Sofia", "Mason", "Chloe", "Logan", "Amara",
  "Elijah", "Nadia", "Caleb", "Priya", "Hunter", "Freya", "Dylan", "Sienna", "Carter", "Talia",
  "Julian", "Ines", "Marcus", "Yara", "Felix", "Esme", "Adrian", "Nia", "Roman", "Hana",
  "Diego", "Anika", "Sam", "Cleo", "Marco", "Lena", "Omar", "Greta", "Ivan", "Mira",
];

const LAST_NAMES = [
  "Silva", "Khan", "Moreau", "Ito", "Novak", "Osei", "Petrov", "Tanaka", "Vargas", "Weber",
  "Andersen", "Bianchi", "Castillo", "Dube", "El-Sayed", "Fischer", "Garcia", "Haddad", "Ibrahim", "Jansen",
  "Kaur", "Larsen", "Mbeki", "Nakamura", "Okafor", "Pereira", "Quinn", "Rojas", "Sato", "Torres",
  "Ueda", "Vidal", "Wallace", "Xu", "Yilmaz", "Zhao", "Adeyemi", "Barlow", "Cruz", "Dominguez",
  "Erickson", "Farrell", "George", "Huang", "Iyer", "Johansson", "Kim", "Lindberg", "Marchetti", "Norton",
];

const CITIES = [
  "Austin", "Berlin", "Lagos", "Toronto", "São Paulo", "Singapore", "Sydney", "Tokyo", "Lima", "Amsterdam",
  "Nairobi", "Seoul", "Mexico City", "Cairo", "Mumbai", "Dubai", "Stockholm", "Lisbon", "Warsaw", "Bangkok",
  "Madrid", "Paris", "Chicago", "Denver", "Oslo", "Vienna", "Athens", "Buenos Aires", "Hanoi", "Casablanca",
];

const COUNTRIES = [
  "USA", "Germany", "Nigeria", "Canada", "Brazil", "Singapore", "Australia", "Japan", "Peru", "Netherlands",
  "Kenya", "South Korea", "Mexico", "Egypt", "India", "UAE", "Sweden", "Portugal", "Poland", "Thailand",
  "Spain", "France", "USA", "USA", "Norway", "Austria", "Greece", "Argentina", "Vietnam", "Morocco",
];

const EMAIL_DOMAINS = [
  "mail.com", "inbox.net", "work.co", "fastmail.io", "proton.me", "outlook.com",
  "hq.dev", "startup.io", "corp.com", "acme.io",
];

export const NAME_POOLS = { FIRST_NAMES, LAST_NAMES, CITIES, COUNTRIES, EMAIL_DOMAINS };

export function personName(rng) {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

export function emailFromName(rng, name) {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, ".");
  return `${base}.${rng.int(10, 999)}@${rng.pick(EMAIL_DOMAINS)}`;
}
