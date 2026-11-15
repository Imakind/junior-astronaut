# Separate habitat and greenhouse

Source: `public/models/base-scene.glb`, preserved unchanged.

The source contains one fused mesh. Inspection of its X/Z and X/Y vertex projections (`base-coordinates.png`) shows the habitat on negative X and the greenhouse on positive X, joined by a narrow tunnel. `scripts/split-base-model.py` clips triangles at X = 0.15, caps each tunnel end, and removes disconnected fragments smaller than 100 faces. It exports two independently loadable GLBs:

- `habitat-scene.glb`: 37,140 triangles, 668,424 bytes.
- `greenhouse-scene.glb`: 23,456 triangles, 422,364 bytes.

The map loads these files instead of the fused source. Habitat is permanent. Greenhouse visibility requires completed placement or an explicitly selected construction job in its final assembly stage (75% or later). No greenhouse icon, picker or mesh appears before construction. The new objects use the established ivory/steel material palette.

Scene construction uses two astronauts: carry supplies → approach plot → assemble foundation/frame with tools → finish shell → return home. Both crews' positions are driven by store progress; tools and parcels belong to each astronaut. Reduced motion suppresses walking/hammer oscillation while the mission timer and staged assembly remain usable. This is procedural animation, not a newly generated skeletal rig.

All three buildable objects support both catalog plots. Placed geometry, pickers, projected labels and power cables follow the selected positions. The plot buttons expose accessible names for keyboard/touch input. Scene diagnostics expose `data-greenhouse-visible`, `data-construction`, `data-placements`, and crew positions.

Checks performed: split script exports both files; scoped ESLint passes; full TypeScript check reports only the pre-existing socket.io-client, socket.io and PrismaClient errors. Parent owns consolidated browser mission and motion screenshots.
