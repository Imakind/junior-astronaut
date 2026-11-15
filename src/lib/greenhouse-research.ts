export type ResearchStudy = {
  source: "live" | "cached";
  studyId: "OSD-314";
  title: string;
  summary: string;
  url: string;
  checkedAt: string;
};

export const RESEARCH_LESSONS = {
  survey: {
    title: "Choose a place for our greenhouse",
    summary: "NASA Mars Trek helps planners study heights, slopes and lighting. Our rover surveys a pretend site so we can choose where to build.",
    source: "NASA Mars Trek",
    url: "https://trek.nasa.gov/mars/jpl/config/textAbout.html",
  },
  water: {
    title: "Prepare water for the roots",
    summary: "NASA's Veggie plants grow in prepared root pillows with growing material, nutrients and water. Our crew checks the water kit delivered from Earth.",
    source: "NASA — Growing Plants in Space",
    url: "https://www.nasa.gov/exploration-research-and-technology/growing-plants-in-space/",
  },
  light: {
    title: "Learn from a plant experiment",
    summary: "Researchers compared red light and darkness for young Arabidopsis plants on the space station, including reduced gravity. Our crew checks a grow light using this research idea.",
    source: "NASA OSDR — OSD-314",
    url: "https://osdr.nasa.gov/bio/repo/data/studies/OSD-314",
  },
} satisfies Record<"survey" | "water" | "light", {
  title: string;
  summary: string;
  source: string;
  url: string;
}>;

// Reviewed from the official OSDR API on this date. This is a bundled fallback.
export const REVIEWED_PLANT_STUDY: ResearchStudy = {
  source: "cached",
  studyId: "OSD-314",
  title: "Adaptive response of Arabidopsis seedlings in microgravity and Mars reduced gravity environment is enhanced by red light photostimulation",
  summary: "This space-station experiment studied six-day-old Arabidopsis seedlings under different gravity and light conditions. It helps researchers ask how to grow plants in space. Our greenhouse timings and harvest amounts are game rules.",
  url: RESEARCH_LESSONS.light.url,
  checkedAt: "2026-11-15",
};
