export const AUDIO_EXTENSIONS: string[];
export const MISSION_AUDIO: Record<string, string>;
export const MISSION_TITLES: Record<string, string>;

export function resolveMissionAudio(id: string): string | undefined;

export function stripExtension(name: string): string;
export function stripLevelPrefix(name: string): string;
export function normalize(name: string): string;
export function tokens(name: string): Set<string>;
export function titleMatchesMission(fileName: string, missionTitle: string): boolean;
export function findMissionsForAudioFile(
  fileName: string,
  titles?: Record<string, string>
): string[];
