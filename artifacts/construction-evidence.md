# Player-directed construction — verified 2026-11-15

Production preview: http://localhost:3011/.

## Behavior and controls

- Choose Solar panel, Battery storage or Greenhouse in the building-kit sidebar. Mission highlights the next available device; unavailable cards explain their prerequisite.
- Choose one of two surveyed plots using a numbered map marker or its named button in the mission card. Cancel returns the kit before placement. One delivered kit per device; construction does not add resource costs.
- Two astronauts carry parcels to the selected site, prepare a foundation, assemble a frame, finish the building and return home. Twelve-second construction is driven by the mission store, not renderer speed.
- Solar and storage advance the existing discovery sequence only after completion. Greenhouse requires all three research findings and explicit placement. Growing plants is unavailable until construction completes.
- Habitat and greenhouse are separate GLBs. No greenhouse shape, picker or map icon exists before construction. The dome is revealed at 75% construction as its final assembly stage; it becomes usable at 100%.
- Notebook and hidden-tab work pause. Reduced motion uses stationary poses and still completes the task. Restart clears placement, progress and greenhouse visibility.

## Assets and layout

- Source `base-scene.glb` preserved. `scripts/split-base-model.py` cuts at the narrow connecting tunnel, seals cut surfaces and exports `habitat-scene.glb` (668,424 bytes) and `greenhouse-scene.glb` (422,364 bytes). Details in `model-generation/base-split.md` and `.json`.
- Alternative sites corrected using actual GLB bounds and sampled road geometry. Conservative clearance to road edge: alternate solar 1.27 world units, alternate greenhouse 0.98. Placement choices are surveyed slots, not unrestricted drag-and-drop.
- Desktop sidebar remains clear of the mission card. Phone picker closes after choice; landscape picker temporarily replaces the mission card and scrolls.

## Checks performed

- `bun run build`: passes. Replaced platform-dependent `cp -r` packaging with `scripts/prepare-standalone.mjs` using Node filesystem copying; standalone assets load in Windows production preview.
- Scoped ESLint: store, catalog, scene, GameUI, BuildingPanel, ResearchPanel and DiscoveryPanel pass.
- `bun test tests/research-gates.test.js tests/construction.test.js`: 5 tests pass, 51 assertions. Checks research prerequisites, no instant build, invalid placement, duplicate dispatch, resource accounting, invalid ticks, cancel, modal pause, sunset guard and reset.
- Full production browser mission through actual controls: alternate solar plot, wiring/sunset, alternate battery plot, charging, morning rover plan, night, full water shielding/shelter, research survey/water/light, alternate greenhouse plot, water/light/crop, correct final answer. Final energy 1/6, water 95%, Mission complete.
- Before greenhouse placement: `greenhouseVisible=false`, placements contain only solar and battery. After research it remains false until explicit construction. After construction: placements include greenhouse slot1; crew returned to original home positions.
- Production browser console: 0 errors, 0 warnings. Separate habitat and greenhouse models loaded successfully; fused base model not requested by map.
- Restart: placements `{}`, construction `none`, greenhouseVisible `false`.
- Reduced-motion solar build: crew poses unchanged across750ms during assembly; completed normally and returned home.
- Notebook pause: construction progress unchanged while open, resumes on close. State-level sunset guard prevents freezing builders with a preview during work.
- Viewports checked:1440×900,390×844,844×390. Landscape kit panel y140..374, task intentionally hidden while selecting kit. Selection restores task; no horizontal overflow.

## Captures and motion

Unpaused timed frame sequences at the real gameplay camera:

- `construction-solar-{8,28,52,79,94}.png`
- `construction-greenhouse-{8,28,52,79,94}.png`
- `construction-empty-production.png`, `construction-greenhouse-ready.png`
- `construction-placement-mobile.png`, `construction-battery-mobile.png`, `construction-greenhouse-choice-mobile.png`, `construction-kits-landscape.png`

Inspected approach, stationary assembly and return frames. Parcels/tools and foundation/frame match displayed stages; no collapsing geometry observed. Motion is procedural on unrigged meshes, not authored skeletal clips. Renderer sample: empty scene404,162 triangles/63 calls; completed base572,578 triangles/160 calls; greenhouse final assembly572,938 triangles/184 calls (renderer includes shadow passes). No physical-device frame-rate benchmark performed.

For this prototype increment, timed captures, observable diagnostics and real-input mission coverage were used instead of introducing a deterministic visual-baseline system. Captures are manual regression evidence, not pixel-diff test results.

## Independent review and remaining limits

Review found sunset-preview/build-motion conflict and alternate plot/road intersections; both corrected. Landscape picker overlap corrected and browser verified.

Full `tsc --noEmit` still reports three pre-existing dependency/type issues: socket.io-client, socket.io, PrismaClient. Existing Next configuration skips type errors; build success is not a clean project-wide typecheck.

Child-oriented instructions/layout were tested functionally, not through a user study with children. Routes and fixed plots do not implement free-placement collision physics. NASA research/API provenance is unchanged from `research-sources.md`.

Skills applied: threejs-game-director, threejs-gameplay-systems, threejs-game-ui-designer (ui-patterns), threejs-aaa-graphics-builder by scene worker, threejs-qa-release (release-checks and visual-test-harness).
