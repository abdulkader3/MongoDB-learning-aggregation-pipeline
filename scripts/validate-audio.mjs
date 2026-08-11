// Validates the mission → audio mapping against the actual contents of
// public/audio/. Run with: npm run check:audio
//
// Detects:
//   • audio files present but not mapped to any mission  (unmatched)
//   • missions mapped in the registry but with no file on disk
//   • missions that expect audio but have no mapping     (missing)
//   • two missions mapped to the same audio file         (duplicate)
//   • registry filenames that do not match the mission title (misnamed)
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  AUDIO_EXTENSIONS,
  MISSION_AUDIO,
  MISSION_TITLES,
  findMissionsForAudioFile,
  resolveMissionAudio,
  titleMatchesMission,
} from "../shared/mission-audio.mjs";
import { REFERENCE_PIPELINES } from "../shared/reference.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const audioDir = join(root, "public", "audio");

const isAudioFile = (name) =>
  AUDIO_EXTENSIONS.includes(name.split(".").pop().toLowerCase());

let exitCode = 0;
const warn = (message) => {
  console.log(`⚠  ${message}`);
  exitCode = 1;
};
const ok = (message) => console.log(`✓  ${message}`);

console.log("Audio ↔ Mission mapping check\n");

// 1. Actual files in public/audio/
let files = [];
if (existsSync(audioDir)) {
  files = readdirSync(audioDir).filter(isAudioFile).sort();
} else {
  warn(`public/audio/ does not exist (${audioDir})`);
}

// 2. Registry integrity: two missions mapped to the same file
const byFile = {};
for (const [id, file] of Object.entries(MISSION_AUDIO)) {
  (byFile[file] ??= []).push(id);
}
for (const [file, ids] of Object.entries(byFile)) {
  if (ids.length > 1) {
    warn(`Duplicate audio mapping: ${ids.join(", ")} → ${file}`);
  }
}

// 3. Per-mission status
const missionIds = Object.keys(REFERENCE_PIPELINES);
let mappedCount = 0;
for (const id of missionIds) {
  const file = MISSION_AUDIO[id];
  const label = MISSION_TITLES[id] ?? id;
  if (!file) {
    warn(`Missing audio: ${id} — ${label}`);
    continue;
  }
  mappedCount += 1;
  const url = resolveMissionAudio(id);
  if (!files.includes(file)) {
    warn(`${id} (${label}) → mapped to "${file}" but the file is missing from public/audio/`);
    continue;
  }
  if (!titleMatchesMission(file, label)) {
    warn(`${id} (${label}) → "${file}" does not appear to match the mission title`);
    continue;
  }
  ok(`${id}  ${label}  →  ${url}`);
}

// 4. Files in public/audio/ not referenced by the registry
const registered = new Set(Object.values(MISSION_AUDIO));
for (const file of files) {
  if (registered.has(file)) continue;
  const candidates = findMissionsForAudioFile(file);
  const hint =
    candidates.length === 1
      ? ` (title matches ${candidates[0]} — ${MISSION_TITLES[candidates[0]]})`
      : "";
  warn(`Unmatched audio: ${file}${hint}`);
}

// 5. Summary
const missing = missionIds.filter((id) => !MISSION_AUDIO[id]);
console.log("\n----------------------------------------");
console.log(`Mapped: ${mappedCount}/${missionIds.length} missions`);
if (missing.length > 0) {
  console.log(`Missing audio for: ${missing.map((id) => `${id} — ${MISSION_TITLES[id] ?? id}`).join(", ")}`);
}
if (exitCode === 0) {
  console.log("All audio files are correctly mapped.");
} else {
  console.log("Resolve the issues above before considering the audio set complete.");
}

process.exit(exitCode);
