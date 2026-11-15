"use client";

import { useEffect, useState } from "react";
import { useGame, type ResearchJob } from "@/lib/game-store";
import { RESEARCH_LESSONS, type ResearchStudy } from "@/lib/greenhouse-research";

export function ResearchController() {
  useEffect(() => {
    let previous = performance.now();
    const timer = setInterval(() => {
      const now = performance.now();
      const seconds = (now - previous) / 1000;
      previous = now;
      if (document.hidden || document.documentElement.dataset.gameDrawer === "open") return;
      const game = useGame.getState();
      if (game.modal) return;
      game.tickResearch(seconds);
      game.tickConstruction(seconds);
    }, 250);
    return () => clearInterval(timer);
  }, []);
  return null;
}

const order: ResearchJob[] = ["survey", "water", "light"];
const tasks = {
  survey: { title: "Scout is finding a place to build", activity: "Scout photographs the site and checks the terrain.", finding: "Our simulated site has room for a protected greenhouse beside the base." },
  water: { title: "Check the water supply", activity: "Your astronaut is inspecting the delivered water kit.", finding: "Our sealed water kit is ready. Plants will need this water in a prepared growing bed." },
  light: { title: "Test the grow light", activity: "Your astronaut is checking a powered light at the test bench.", finding: "Our test light works. The greenhouse can give plants light even when sunlight is unavailable." },
};

export default function ResearchPanel({ onOpenKits }: { onOpenKits: () => void }) {
  const g = useGame();
  const [study, setStudy] = useState<ResearchStudy | null>(null);
  const [sourceFailed, setSourceFailed] = useState(false);
  const [choiceHint, setChoiceHint] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/nasa/research", { signal: controller.signal }).then(response => {
      if (!response.ok) throw new Error("Research source unavailable");
      return response.json();
    }).then(data => setStudy(data)).catch(error => {
      if (error.name !== "AbortError") setSourceFailed(true);
    });
    return () => controller.abort();
  }, []);
  const next = order.find(job => g.researchProgress[job] < 100);
  const current = g.activeResearchJob ?? next;
  const previous = order.filter(job => g.researchProgress[job] >= 100).at(-1);
  const button = "min-h-11 w-full rounded-xl bg-amber-300 px-3 py-2 text-sm font-bold text-slate-950 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-white";

  return <div className="space-y-2" aria-label="Greenhouse research">
    <div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold text-amber-200">{current ? tasks[current].title : "What should we build?"}</h2><span className="shrink-0 text-xs text-slate-300">{order.filter(job => g.researchProgress[job] >= 100).length}/3 findings</span></div>
    {g.activeResearchJob ? <>
      <p className="text-xs text-slate-200">{tasks[g.activeResearchJob].activity}</p>
      <progress className="h-2 w-full accent-amber-300" aria-label={`${g.activeResearchJob} research progress`} value={g.researchProgress[g.activeResearchJob]} max={100} />
      <p className="text-xs text-slate-300">Travel → investigate → return · {Math.round(g.researchProgress[g.activeResearchJob])}%</p>
    </> : <>
      {previous && <p className="text-xs leading-relaxed text-emerald-200" role="status">{tasks[previous].finding}</p>}
      {next === "water" && <button className={button} onClick={() => g.startResearchJob("water")}>Send an astronaut to check water</button>}
      {next === "light" && <button className={button} onClick={() => g.startResearchJob("light")}>Send an astronaut to test the light</button>}
      {!next && <>
        <p className="text-xs text-slate-200">Use our findings. Where can we control the water and light?</p>
        <div className="grid gap-2 sm:grid-cols-2"><button className="min-h-11 rounded-xl border border-slate-500 px-3 text-sm" onClick={() => setChoiceHint("Outside we cannot control the growing conditions. Try a protected space with our water kit and grow light.")}>Plant outdoors</button><button className={button} onClick={onOpenKits}>Choose a greenhouse kit</button></div>
        {choiceHint && <p className="text-xs text-amber-200" role="status">{choiceHint}</p>}
      </>}
    </>}
    <details className="text-xs text-slate-300"><summary className="cursor-pointer py-2 font-semibold">What NASA studied</summary><div className="max-h-32 space-y-3 overflow-y-auto pb-2">
      {order.map(job => <p key={job}>{RESEARCH_LESSONS[job].summary} <a className="text-sky-300 underline" href={RESEARCH_LESSONS[job].url} target="_blank" rel="noopener noreferrer">{RESEARCH_LESSONS[job].source} ↗</a></p>)}
      <p>{study ? `${study.studyId} · ${study.source === "live" ? "NASA metadata loaded" : "Reviewed reference copy"}` : sourceFailed ? "Live metadata unavailable. The reviewed NASA links above remain available." : "Loading NASA study metadata…"}</p>
      {study && <a className="text-sky-300 underline" href={study.url} target="_blank" rel="noopener noreferrer">{study.title} ↗</a>}
      <p>Rover readings, checks and travel times are game simulations. The linked NASA studies explain the science.</p>
    </div></details>
  </div>;
}
