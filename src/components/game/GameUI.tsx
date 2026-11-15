"use client";

import { useEffect, useRef, useState } from "react";
import { Battery, Droplets, Users, BookOpen, Maximize, Minimize, X, ListChecks, ArrowRight } from "lucide-react";
import { useGame } from "@/lib/game-store";
import MissionPanel from "./MissionPanel";
import ResearchPanel, { ResearchController } from "./ResearchPanel";
import BuildingPanel, { BUILD_LABELS } from "./BuildingPanel";
import { BUILD_SITES } from "@/lib/building-catalog";

export default function GameUI() {
  const g = useGame();
  const [drawer, setDrawer] = useState<"mission" | "science" | null>(null);
  const [kitsOpen, setKitsOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [notice, setNotice] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const previousStage = useRef(g.discovery);
  const taskRef = useRef<HTMLElement>(null);
  const hideTask = ["dawn", "quiz", "complete", "storm-decision", "intro"].includes(g.phase) || !!g.modal;
  const showKits = !g.modal && !drawer && !["intro", "night", "storm-decision", "dawn", "quiz", "complete", "sunset-wait", "plan-check"].includes(g.phase);
  function openKits() {
    setKitsOpen(true);
    requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('#building-kits button[aria-pressed]:not([disabled])')?.focus());
  }

  useEffect(() => {
    const root = document.documentElement;
    const task = taskRef.current;
    if (hideTask || !task) {
      root.style.setProperty("--game-task-height", "0px");
      return () => { root.style.removeProperty("--game-task-height"); };
    }
    const update = () => root.style.setProperty("--game-task-height", `${Math.ceil(task.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(task);
    return () => {
      observer.disconnect();
      root.style.removeProperty("--game-task-height");
    };
  }, [hideTask]);

  useEffect(() => {
    const update = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);

  useEffect(() => {
    if (previousStage.current === g.discovery) return;
    previousStage.current = g.discovery;
    const id = requestAnimationFrame(() => setDrawer(null));
    return () => cancelAnimationFrame(id);
  }, [g.discovery]);

  useEffect(() => {
    if (!g.modal) return;
    const id = requestAnimationFrame(() => setDrawer(null));
    return () => cancelAnimationFrame(id);
  }, [g.modal]);

  useEffect(() => {
    if (!drawer || g.modal) return;
    document.documentElement.dataset.gameDrawer = "open";
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); setDrawer(null); }
      if (event.key !== "Tab") return;
      const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], [tabindex="0"]') ?? []);
      const first = items[0], last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", keyboard);
    return () => {
      delete document.documentElement.dataset.gameDrawer;
      document.removeEventListener("keydown", keyboard);
      if (previous?.isConnected && !useGame.getState().modal) previous.focus();
    };
  }, [drawer, g.modal]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else setNotice("Your browser already shows the game as large as it can.");
    } catch { setNotice("Full screen is unavailable. You can keep playing here."); }
  }

  let title = "Keep our crew warm tonight";
  let hint = "Choose a building to see how it helps our base.";
  let action: (() => void) | undefined;
  let actionText = "";
  if (g.discovery === "base") {
    title = "Let's catch some sunlight!"; hint = "Choose the solar panel kit. Then choose where our crew will build it.";
    action = openKits; actionText = "Find a solar panel kit";
  } else if (g.discovery === "panel") {
    title = "Give the electricity a path"; hint = "Connect the panel to the base. Watch the lights!";
    action = g.wirePanel; actionText = "Connect panel to base";
  } else if (g.discovery === "wired") {
    title = "The lights are on!"; hint = "What happens when the Sun goes down? Let's try.";
    action = g.previewSunset; actionText = "Preview sunset";
  } else if (g.discovery === "problem") {
    title = "How can we save sunlight?"; hint = "Our panel needs the Sun. Choose a battery kit to save electricity for later.";
    action = openKits; actionText = "Find a battery kit";
  } else if (g.discovery === "storage") {
    title = g.baseConnected ? "Save energy for tonight" : "Connect our new battery";
    hint = g.baseConnected ? "Sunlight can fill the battery while the base has power." : "A cable carries electricity into storage and then to our home.";
    action = g.baseConnected ? g.chargeStorage : g.connectBase;
    actionText = g.baseConnected ? "Collect spare sunlight · +4 stored" : "Connect panel → storage → base";
  } else if (g.discovery === "charged") {
    title = g.previewDark ? "Our lights stayed on!" : "Ready for another sunset?";
    hint = g.previewDark ? "The battery is powering our home. Now meet the rover." : "Try your battery in the dark. This test uses no stored energy.";
    action = g.previewDark ? g.finishDiscovery : g.previewSunset;
    actionText = g.previewDark ? "It works! Explore the rover →" : "Preview sunset";
  } else if (g.phase === "night") {
    title = "The battery is looking after us"; hint = "Watch our stored energy power the base through the night.";
  } else if (g.phase === "sunset-wait") {
    title = "Saving the last sunlight…"; hint = "The panels are topping up our battery.";
  } else if (g.phase === "greenhouse") {
    title = "Let's grow fresh food"; hint = "Our plants need water and light.";
    action = () => g.openModal("greenhouse"); actionText = "Open greenhouse";
  } else if (g.activeTaskId === "plan-rover") {
    title = "When should we charge the rover?"; hint = "We need energy for the crew and tomorrow's trip.";
    action = () => g.openModal("robot"); actionText = "Meet the rover";
  } else if (g.activeTaskId === "top-up") {
    title = "Save a little more sunlight"; hint = "The rover has energy. Refill the battery before dark.";
    action = () => g.openModal("solar"); actionText = "Visit solar panels";
  } else if (g.activeTaskId === "check-plan") {
    title = "Ready for our first night?"; hint = "Check our plan before the Sun goes down.";
    if (g.baseConnected && g.robotStatus !== "uncharged") action = g.startPlanCheck;
    actionText = "Check Plan";
  } else if (g.activeTaskId === "connect-battery") {
    title = "Power our home"; hint = "Connect the battery so the crew stays warm.";
    action = () => g.openModal("battery"); actionText = "Visit the battery";
  }
  if (g.selectedBuild) {
    title = `Where shall we build ${BUILD_LABELS[g.selectedBuild].toLowerCase()}?`;
    hint = "Choose a marked plot on the map, or pick its name below. Both places are safe for this kit.";
    action = g.cancelBuild; actionText = "Put this kit back";
  }
  const constructionStep = g.construction ? (g.construction.progress < 20 ? "Carrying the kit to your plot" : g.construction.progress < 45 ? "Preparing a strong foundation" : g.construction.progress < 75 ? "Putting the parts together" : g.construction.progress < 90 ? "Checking that everything is ready" : "Finished! The crew is returning home") : "";
  const tool = "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-slate-950/90 px-3 text-white shadow-lg hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-amber-300";

  return <>
    <ResearchController />
    <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:p-4">
      <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-white/15 bg-slate-950/90 px-3 text-white shadow-xl sm:gap-5 sm:px-5" aria-label="Base resources">
        <div className="hidden sm:block"><p className="text-sm font-bold text-amber-300">Junior Astronaut</p><p className="text-xs text-slate-300">{g.timeOfDay}</p></div>
        <span className="flex items-center gap-1.5"><Battery className="h-5 w-5 text-amber-300" aria-hidden="true" /><span className="text-sm font-bold tabular-nums"><span className="block text-[10px] font-normal text-slate-300">Energy</span>{g.battery}/{g.batteryMax}</span></span>
        <span className="flex items-center gap-1.5"><Droplets className="h-5 w-5 text-sky-300" aria-hidden="true" /><span className="text-sm font-bold tabular-nums"><span className="block text-[10px] font-normal text-slate-300">Water</span>{g.water}%</span></span>
        <span className="hidden items-center gap-1.5 min-[420px]:flex"><Users className="h-5 w-5 text-emerald-300" aria-hidden="true" /><span className="text-sm font-bold"><span className="block text-[10px] font-normal text-slate-300">Crew</span>{g.crew}</span></span>
      </div>
      <nav className="pointer-events-auto flex gap-1.5" aria-label="Game tools">
        <button className={tool} onClick={() => setDrawer("mission")} aria-label="Mission notebook"><ListChecks className="h-5 w-5" /><span className="hidden md:inline">Mission</span></button>
        <button className={tool} onClick={() => setDrawer("science")} aria-label="Science notebook"><BookOpen className="h-5 w-5" /></button>
        <button className={tool} onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}>{fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}</button>
      </nav>
    </header>
    {showKits && <BuildingPanel open={kitsOpen} onOpenChange={setKitsOpen} />}
    {!hideTask && <section ref={taskRef} aria-label="Your next task" className={`absolute inset-x-2 bottom-2 z-20 mx-auto max-h-[calc(100dvh-170px)] max-w-2xl overflow-y-auto rounded-2xl border border-amber-200/50 bg-slate-950/95 p-3 text-white shadow-2xl sm:bottom-4 sm:p-4 ${kitsOpen ? "max-lg:landscape:hidden" : ""}`}>
      {g.construction ? <div className="space-y-2"><div className="flex items-center justify-between gap-2"><h2 className="text-base font-bold text-amber-200 sm:text-lg">Our crew is building {BUILD_LABELS[g.construction.device].toLowerCase()}</h2><span className="text-sm font-bold tabular-nums text-amber-200">{Math.floor(g.construction.progress)}%</span></div><p className="text-sm text-slate-200" role="status">{constructionStep}</p><progress aria-label="Construction progress" className="h-3 w-full accent-amber-300" value={g.construction.progress} max={100} /><p className="text-xs text-slate-300">Watch the astronauts turn your kit into a building.</p></div> : g.phase === "research" && !g.selectedBuild ? <ResearchPanel onOpenKits={openKits} /> : <><div className="flex items-center gap-3"><div className="min-w-0 flex-1"><h2 className="text-base font-bold text-amber-200 sm:text-lg">{title}</h2><p className="mt-1 text-xs leading-relaxed text-slate-200 sm:text-sm">{hint}</p></div></div>
      {g.selectedBuild && <div className="mt-3 grid grid-cols-2 gap-2" aria-label="Available building plots">{BUILD_SITES[g.selectedBuild].map((site, slot) => <button key={site.name} onClick={() => g.placeBuilding(slot)} className="min-h-11 rounded-xl border border-amber-300 bg-amber-300 px-2 py-2 text-sm font-bold text-slate-950 hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-white">{site.name}</button>)}</div>}
      {action && <button onClick={action} className={`mt-2 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold focus-visible:outline-2 focus-visible:outline-white ${g.selectedBuild ? "border border-slate-600 text-slate-200 hover:bg-slate-800" : "bg-amber-300 text-slate-950 hover:bg-amber-200"}`}>{actionText}{!g.selectedBuild && <ArrowRight className="h-4 w-4 shrink-0" />}</button>}</>}
    </section>}
    {notice && <div role="status" className="absolute left-3 right-3 top-20 z-40 mx-auto flex max-w-md items-center gap-3 rounded-xl bg-slate-950 p-3 text-sm text-white">{notice}<button className="min-h-11 min-w-11" aria-label="Dismiss message" onClick={() => setNotice("")}><X /></button></div>}
    {drawer && <div className="absolute inset-0 z-40 flex justify-end bg-slate-950/65 backdrop-blur-sm" onClick={event => { if (event.target === event.currentTarget) setDrawer(null); }}>
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby="notebook-title" className="flex h-full w-full max-w-md flex-col border-l border-slate-600 bg-slate-950 text-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-700 p-4"><h2 id="notebook-title" className="text-xl font-bold">{drawer === "science" ? "Our science notebook" : "Our mission"}</h2><button ref={closeButton} className={tool} aria-label="Close notebook" onClick={() => setDrawer(null)}><X /></button></div>
        <div className="min-h-0 overflow-y-auto p-4">
          {drawer === "mission" ? <MissionPanel /> : <div className="space-y-5 text-sm leading-relaxed"><p>Can we keep four explorers warm for a whole night? Build, test, and find out together.</p><p>Our game uses simplified energy units. Real Mars missions need much more careful planning.</p><a className={`${tool} justify-start`} href="https://science.nasa.gov/mars/" target="_blank" rel="noopener noreferrer">Explore Mars with NASA ↗</a><a className={`${tool} justify-start`} href="https://trek.nasa.gov/mars/" target="_blank" rel="noopener noreferrer">See a real map of Mars ↗</a>{g.discovery === "ready" && <button className={tool} onClick={() => { setDrawer(null); g.openModal("science"); }}>Our mission's NASA sources</button>}</div>}
        </div>
      </div>
    </div>}
  </>;
}
