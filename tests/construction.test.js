import { beforeEach, expect, test } from "bun:test";
import { useGame } from "../src/lib/game-store";

beforeEach(() => useGame.getState().restart());
const game = () => useGame.getState();
function finish() { for (let i = 0; i < 13; i++) game().tickConstruction(1); }

test("kit selection does not construct; valid placement takes time and advances discovery once", () => {
  game().selectBuild("battery");
  expect(game().selectedBuild).toBeNull();
  game().buildPanel();
  expect(game().discovery).toBe("base");
  expect(game().placements.solar).toBeUndefined();
  game().placeBuilding(-1);
  game().placeBuilding(0.5);
  game().placeBuilding(2);
  expect(game().construction).toBeNull();
  game().placeBuilding(1);
  expect(game().construction).toEqual({ device: "solar", slot: 1, progress: 0 });
  game().buildPanel();
  game().placeBuilding(0);
  game().wirePanel();
  expect(game().construction.slot).toBe(1);
  expect(game().discovery).toBe("base");
  game().tickConstruction(1);
  expect(game().placements.solar).toBeUndefined();
  finish();
  expect(game().discovery).toBe("panel");
  expect(game().placements.solar).toBe(1);
  expect(game().construction).toBeNull();
  game().wirePanel();
  game().previewSunset();
  game().buildStorage();
  game().placeBuilding(0);
  expect(game().previewDark).toBe(false);
  game().previewSunset();
  expect(game().previewDark).toBe(false);
  finish();
  expect(game().discovery).toBe("storage");
  expect(game().placements).toEqual({ solar: 1, battery: 0 });
  game().connectBase();
  game().chargeStorage();
  expect(game().battery).toBe(4);
});

test("cancel, invalid ticks, modal pause and reset cannot leave a building or delayed completion", () => {
  game().buildPanel();
  game().cancelBuild();
  game().placeBuilding(0);
  expect(game().construction).toBeNull();
  game().buildPanel();
  game().placeBuilding(0);
  game().tickConstruction(NaN);
  game().tickConstruction(-1);
  expect(game().construction.progress).toBe(0);
  useGame.setState({ modal: "science" });
  finish();
  expect(game().construction.progress).toBe(0);
  game().closeModal();
  game().tickConstruction(1000);
  expect(game().construction.progress).toBeLessThan(10);
  game().restart();
  finish();
  expect(game().construction).toBeNull();
  expect(game().placements).toEqual({});
  expect(game().selectedBuild).toBeNull();
  expect(game().greenhouseBuilt).toBe(false);
});

test("greenhouse cannot be planted or entered until construction is complete", () => {
  useGame.setState({ discovery: "ready", phase: "research", researchProgress: { survey: 100, water: 100, light: 100 }, battery: 2 });
  game().buildGreenhouse();
  game().placeBuilding(1);
  game().openModal("greenhouse");
  game().waterPlant();
  game().togglePlantLight();
  expect(game().modal).toBeNull();
  expect(game().water).toBe(100);
  expect(game().battery).toBe(2);
  expect(game().greenhouseBuilt).toBe(false);
  finish();
  expect(game().placements.greenhouse).toBe(1);
  expect(game().greenhouseBuilt).toBe(true);
  expect(game().modal).toBeNull();
  game().openModal("greenhouse");
  expect(game().modal).toBe("greenhouse");
});
