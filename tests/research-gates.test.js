import { beforeEach, expect, test } from "bun:test";
import { useGame } from "../src/lib/game-store";

beforeEach(() => useGame.getState().restart());

function dawn() {
  useGame.setState({ discovery: "ready", phase: "dawn", timeOfDay: "Dawn", battery: 0, robotStatus: "charge-in-morning" });
}

function completeJob() {
  for (let i = 0; i < 13; i++) useGame.getState().tickResearch(1);
}

test("research gates construction and charges morning energy once", () => {
  dawn();
  useGame.getState().startGreenhouse();
  expect(useGame.getState().phase).toBe("research");
  expect(useGame.getState().battery).toBe(2);
  useGame.getState().startGreenhouse();
  expect(useGame.getState().battery).toBe(2);
  useGame.getState().buildGreenhouse();
  useGame.getState().openModal("greenhouse");
  expect(useGame.getState().greenhouseBuilt).toBe(false);
  expect(useGame.getState().modal).toBeNull();
  useGame.getState().startResearchJob("light");
  expect(useGame.getState().activeResearchJob).toBe("survey");
  completeJob();
  useGame.getState().startResearchJob("light");
  expect(useGame.getState().activeResearchJob).toBeNull();
  useGame.getState().startResearchJob("water");
  completeJob();
  useGame.getState().startResearchJob("light");
  completeJob();
  useGame.getState().buildGreenhouse();
  expect(useGame.getState().greenhouseBuilt).toBe(false);
  expect(useGame.getState().selectedBuild).toBe("greenhouse");
  useGame.getState().placeBuilding(0);
  expect(useGame.getState().greenhouseBuilt).toBe(false);
  for (let i = 0; i < 13; i++) useGame.getState().tickConstruction(1);
  expect(useGame.getState().phase).toBe("greenhouse");
  expect(useGame.getState().greenhouseBuilt).toBe(true);
  expect(useGame.getState().battery).toBe(2);
  useGame.getState().waterPlant();
  useGame.getState().togglePlantLight();
  expect(useGame.getState().water).toBe(95);
  expect(useGame.getState().battery).toBe(1);
});

test("reset cancels research and invalid ticks cannot advance it", () => {
  dawn();
  useGame.getState().startGreenhouse();
  useGame.getState().tickResearch(NaN);
  useGame.getState().tickResearch(-1);
  expect(useGame.getState().researchProgress.survey).toBe(0);
  useGame.getState().tickResearch(1);
  useGame.getState().restart();
  completeJob();
  expect(useGame.getState().researchProgress).toEqual({ survey: 0, water: 0, light: 0 });
  expect(useGame.getState().activeResearchJob).toBeNull();
  expect(useGame.getState().greenhouseBuilt).toBe(false);
});
