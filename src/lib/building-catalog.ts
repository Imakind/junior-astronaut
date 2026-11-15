import type { GameState } from "./game-store";

export type BuildDevice = "solar" | "battery" | "greenhouse";
export type Construction = { device: BuildDevice; slot: number; progress: number };

// Surveyed, clear plots: children choose the location without accidentally
// placing a building across a road or through an existing habitat.
export const BUILD_SITES: Record<BuildDevice, { name: string; position: [number, number] }[]> = {
  solar: [
    { name: "Sunny west plot", position: [-25, 0] },
    { name: "Sunny northwest plot", position: [-23, -8] },
  ],
  battery: [
    { name: "Beside the power cable", position: [-12, 16] },
    { name: "Beside the solar array", position: [-22, 15] },
  ],
  greenhouse: [
    { name: "Near the habitat", position: [12, -6] },
    { name: "North garden plot", position: [10, -11] },
  ],
};

export function isBuildAvailable(state: Pick<GameState, "phase" | "discovery" | "placements" | "construction" | "researchProgress" | "activeResearchJob" | "greenhouseBuilt">, device: BuildDevice): boolean {
  if (state.construction || state.placements[device] !== undefined) return false;
  if (device === "solar") return state.phase === "evening" && state.discovery === "base";
  if (device === "battery") return state.phase === "evening" && state.discovery === "problem";
  return state.phase === "research" && !state.greenhouseBuilt && !state.activeResearchJob &&
    Object.values(state.researchProgress).every(value => value >= 100);
}
