"use client";

import { useGame } from "@/lib/game-store";
import { BUILD_LABELS } from "./BuildingPanel";

export default function DiscoveryPanel() {
  const g = useGame();
  const button = "w-full rounded-xl bg-amber-400 p-3 text-left font-bold text-slate-950 hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-white";
  const titles = {
    base: "Our home needs power.",
    panel: "Sunlight caught. Where does it go?",
    wired: "The lights are on!",
    problem: "How can we keep the lights on?",
    storage: "A place to save electricity.",
    charged: "Will our idea work after sunset?",
    ready: "Ready to explore.",
  };
  if (g.selectedBuild || g.construction) {
    const device = g.selectedBuild ?? g.construction!.device;
    return <aside className="space-y-4 rounded-xl border border-slate-700 bg-slate-900 p-5 text-white">
      <p className="text-xs font-bold text-amber-300">YOUR BUILDING PLAN</p>
      <h2 className="text-xl font-bold">{BUILD_LABELS[device]}</h2>
      {g.construction ? <><p className="text-sm">The astronauts are building on your chosen plot.</p><progress aria-label="Paused construction progress" className="h-3 w-full accent-amber-300" value={g.construction.progress} max={100} /><p className="text-sm">{Math.floor(g.construction.progress)}% built · paused while you read</p></> : <p className="text-sm">Your kit is ready. Close this notebook, then choose a marked plot on the map or its name in your mission card.</p>}
      <p className="text-sm text-amber-200">Close the notebook to continue.</p>
    </aside>;
  }
  return <aside className="w-full lg:w-80 xl:w-96 rounded-xl border border-slate-700 bg-slate-900 p-5 text-white space-y-4">
    <p className="text-xs text-amber-300 font-bold">BUILD YOUR FIRST POWER SYSTEM</p>
    <h2 className="text-xl font-bold">{titles[g.discovery]}</h2>
    <p className="text-sm leading-relaxed text-slate-200" aria-live="polite">{g.assistantText || "The crew has just arrived. They need electricity for a lamp, warm air and a fan. Close this notebook and choose a solar panel from Build kits, then pick its plot."}</p>
    {g.discovery === "base" && <p className="text-sm text-slate-400">The crew can wait safely in the landing shelter while you build.</p>}
    {g.discovery === "panel" && <button className={button} onClick={g.wirePanel}>Connect panel to base</button>}
    {(["wired", "problem", "charged"].includes(g.discovery)) && <>
      <div className="rounded-lg bg-slate-800 p-3 text-sm">
        <strong>{g.previewDark ? "SUNSET PREVIEW" : "DAYLIGHT"}</strong>
        <p>{g.previewDark ? "Try your design safely. This preview uses no stored energy." : "Watch the cable and the base lamp as the sunlight changes."}</p>
      </div>
      <button className={button} onClick={g.previewDark ? g.restoreDaylight : g.previewSunset}>{g.previewDark ? "Return to daylight" : "Preview sunset"}</button>
    </>}
    {g.discovery === "problem" && <p className="rounded-lg border border-amber-300/30 bg-amber-300/10 p-3 text-sm text-amber-200">A battery saves spare electricity for later. Close this notebook, choose Battery storage in Build kits, then pick a plot for our crew.</p>}
    {g.discovery === "storage" && <>
      <p>Stored energy: <strong>{g.battery}/6</strong></p>
      <button className={button} onClick={g.baseConnected ? g.chargeStorage : g.connectBase}>{g.baseConnected ? "Collect spare sunlight · +4 stored" : "Connect panel → storage → base"}</button>
    </>}
    {g.discovery === "charged" && <p className="text-amber-200">Stored for the real night: {g.battery}/6 units</p>}
    {g.discovery === "charged" && g.previewDark && <button className={button} onClick={g.finishDiscovery}>It works! Explore the rover →</button>}
    <p className="text-xs text-slate-400">Buildings use the kits delivered with the crew. Construction pauses while this notebook is open.</p>
  </aside>;
}
