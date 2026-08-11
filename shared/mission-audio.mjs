// ---------------------------------------------------------------------------
// Mission → audio registry.
//
// Single source of truth connecting the application's mission IDs to the
// generated audio files in public/audio/. The mission ID is authoritative;
// the filename is the human-readable association used to match and validate.
//
// Naming convention (keep this when adding new files):
//   <level number>-<Recognizable Mission Title>.wav
// e.g. 1-Warm Up.wav, 2-Count It.wav, 3-Monthly Revenue.wav
// ---------------------------------------------------------------------------

export const AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "ogg", "webm"];

// Explicit mapping: mission id → filename (exactly as stored in public/audio/).
// Add one line here for every new audio file you generate.
export const MISSION_AUDIO = {
  m01: "1—Warm Up.wav",
  m02: "2—Count It.wav",
  m03: "1—Filter First.wav",
  m04: "2—Order Matters.wav",
  m05: "1—Big Spenders.wav",
  m06: "2—Multi-Condition.wav",
  m07: "1—Product Catalogue.wav",
  m08: "2—Group Aggregates.wav",
  m09: "3—Monthly Revenue.wav",
  m10: "1—Customers & Orders.wav",
  m11: "2—Top Customers.wav",
  m12: "1—Unwind.wav",
  m13: "2—Genre Popularity.wav",
};

// Short, recognizable labels used by the audio naming convention and by the
// validation diagnostics. These are NOT mission definitions — the full
// mission data lives in lib/challenges/data.ts.
export const MISSION_TITLES = {
  m01: "Warm Up",
  m02: "Count It",
  m03: "Filter First",
  m04: "Order Matters",
  m05: "Big Spenders",
  m06: "Multi-Condition",
  m07: "Product Catalogue",
  m08: "Group Aggregates",
  m09: "Monthly Revenue",
  m10: "Customers & Orders",
  m11: "Top Customers",
  m12: "Unwind",
  m13: "Genre Popularity",
  m14: "Actor Filmography",
  m15: "Nested Arrays",
  m16: "Amazon-Style",
  m17: "HR Analytics",
  m18: "Banking",
  m19: "Book Bestsellers",
  m20: "Social Engagement",
  m21: "Hospital Analytics",
  m22: "Customer 360",
  m23: "Review Profiles",
  m24: "Running Revenue",
  m25: "Top 3 Per Year",
  m26: "Facets",
  m27: "Follower Reach",
  m28: "BOSS",
};

// ---------------------------------------------------------------------------
// Resolvers (used by the application)
// ---------------------------------------------------------------------------

/**
 * Returns the public URL for a mission's audio asset, or undefined when the
 * mission has no audio mapped yet.
 */
export function resolveMissionAudio(id) {
  const file = MISSION_AUDIO[id];
  return file ? `/audio/${file}` : undefined;
}

// ---------------------------------------------------------------------------
// Normalization & title matching (used by scripts/validate-audio.mjs)
// ---------------------------------------------------------------------------

/** Removes a trailing extension, e.g. "1-Warm Up.wav" → "1-Warm Up". */
export function stripExtension(name) {
  return String(name ?? "").replace(/\.[A-Za-z0-9]+$/, "");
}

/** Removes the leading level/category number, e.g. "3-Monthly Revenue" → "Monthly Revenue". */
export function stripLevelPrefix(name) {
  return String(name ?? "").replace(/^\d+\s*[-–—]?\s*/, "");
}

/** Lowercases and collapses all punctuation/whitespace to single spaces. */
export function normalize(name) {
  return String(name ?? "")
    .toLowerCase()
    .replace(/\.[A-Za-z0-9]+$/, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The distinct word tokens of a name (normalized). */
export function tokens(name) {
  return new Set(normalize(name).split(/\s+/).filter(Boolean));
}

/**
 * Whether a filename's title portion contains every token of a mission's
 * recognizable title. Extra words in the filename are tolerated; a missing
 * token is a mismatch (e.g. "1-Unwind.wav" does not match "Big Spenders").
 */
export function titleMatchesMission(fileName, missionTitle) {
  const fileTokens = tokens(stripLevelPrefix(fileName));
  const titleTokens = tokens(missionTitle);
  if (fileTokens.size === 0 || titleTokens.size === 0) return false;
  for (const token of titleTokens) {
    if (!fileTokens.has(token)) return false;
  }
  return true;
}

/**
 * Mission ids whose recognizable title is fully contained in a filename's
 * title. Used to suggest which mission an unmatched audio file belongs to.
 */
export function findMissionsForAudioFile(fileName, titles = MISSION_TITLES) {
  const fileTokens = tokens(stripLevelPrefix(fileName));
  if (fileTokens.size === 0) return [];
  return Object.keys(titles).filter((id) => {
    const titleTokens = tokens(titles[id]);
    if (titleTokens.size === 0) return false;
    for (const token of titleTokens) {
      if (!fileTokens.has(token)) return false;
    }
    return true;
  });
}
