# Greenhouse research sources

Reviewed 2026-11-15 against official NASA pages and the OSDR metadata API.

## Research evidence

| Game lesson | Official source | Supported fact |
| --- | --- | --- |
| Survey a greenhouse site | [NASA Mars Trek](https://trek.nasa.gov/mars/jpl/config/textAbout.html) | Trek provides elevation profiles, slope and lighting analysis for exploration planning. |
| Prepare the water kit | [NASA Growing Plants in Space](https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/) | Veggie uses plant pillows containing prepared growing material and fertilizer, with water delivery and lighting. |
| Check the grow light | [NASA OSDR OSD-314](https://osdr.nasa.gov/bio/repo/data/studies/OSD-314) | The study examines six-day-old Arabidopsis seedlings under different gravity and light conditions on the ISS, including red light and darkness. |

The OSD-314 title is *Adaptive response of Arabidopsis seedlings in microgravity and Mars reduced gravity environment is enhanced by red light photostimulation*. It is a spaceflight plant experiment, with reduced gravity produced experimentally. It does not establish food-crop yields on Mars or demonstrate human safety.

## API and provenance

- Verified [OSDR metadata endpoint](https://osdr.nasa.gov/osdr/data/osd/meta/314) returned HTTP 200 without an API key.
- Study metadata is found in `study["OSD-314"].studies`, selecting `identifier === "OSD-314"`.
- The game route `/api/nasa/research` fetches this fixed endpoint with a four-second timeout and validates the study identifier and title.
- `source: "live"` means the study title was retrieved from NASA during this request. The child-friendly summary remains an authored, reviewed explanation.
- `source: "cached"` means NASA was unavailable or returned an unexpected response. The bundled metadata review date is retained in `checkedAt`.
- No live Mars measurements are obtained by this route.

## Game interpretation

The rover's site survey, crew water-kit check, and grow-light check are fictional training tasks inspired by the sources above. Terrain results, task durations, unlock rules and harvest quantities are game design values. No Mars elevation dataset or real location-specific measurements are loaded for this lesson. The water kit and prepared growing medium are supplies from Earth. The lesson makes no claim that untreated Martian soil or water is suitable for plants.

## Verification

- ESLint passed for the research content and API route.
- The running local endpoint returned `source: "live"`, `studyId: "OSD-314"`, the verified NASA title and an ISO retrieval timestamp on 2026-11-15.
- Isolated execution with a simulated network failure and a wrong-study response returned the reviewed `cached` fallback in both cases.
- Source retrieval is independent of mission progress, so NASA availability does not block play.
