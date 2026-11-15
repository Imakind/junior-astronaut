"use client";

import { Battery, Check, Hammer, LockKeyhole, Sprout, Sun, X } from "lucide-react";
import { useGame, type BuildDevice } from "@/lib/game-store";
import { isBuildAvailable } from "@/lib/building-catalog";

export const BUILD_LABELS: Record<BuildDevice, string> = {
  solar: "Solar panel", battery: "Battery storage", greenhouse: "Greenhouse",
};
const kits = [
  { device: "solar" as const, Icon: Sun, description: "Makes electricity from sunlight.", locked: "Our first building kit." },
  { device: "battery" as const, Icon: Battery, description: "Saves electricity for the night.", locked: "Try sunset with your solar panel first." },
  { device: "greenhouse" as const, Icon: Sprout, description: "Protects plants so we can grow food.", locked: "After sunrise: research a site, water and light." },
];

export default function BuildingPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const g = useGame();
  const eligible = kits.find(kit => isBuildAvailable(g, kit.device));
  return <div className="pointer-events-none absolute left-2 top-[88px] z-30 lg:left-4 lg:top-24">
    <button onClick={() => onOpenChange(!open)} aria-expanded={open} aria-controls="building-kits" className="pointer-events-auto flex min-h-11 items-center gap-2 rounded-xl border border-amber-200/60 bg-slate-950/95 px-3 text-sm font-bold text-amber-200 shadow-lg lg:hidden">
      <Hammer className="h-5 w-5" />{open ? "Close kits" : "Build kits"}
      {!open && eligible && <span className="h-2 w-2 rounded-full bg-amber-300" aria-label="A kit is ready" />}
    </button>
    <aside id="building-kits" aria-label="Building kits" className={`pointer-events-auto mt-2 w-56 max-w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl border border-white/20 bg-slate-950/95 p-3 text-white shadow-2xl lg:mt-0 lg:block lg:max-h-[calc(100dvh-var(--game-task-height,150px)-124px)] ${open ? "block max-h-[calc(100dvh-var(--game-task-height,150px)-230px)] max-lg:landscape:max-h-[calc(100dvh-156px)]" : "hidden"}`}>
      <div className="mb-2 flex items-center justify-between gap-2"><h2 className="text-base font-bold text-amber-200">Build our base</h2><button aria-label="Close building kits" onClick={() => onOpenChange(false)} className="flex h-11 w-11 items-center justify-center lg:hidden"><X className="h-4 w-4" /></button></div>
      <p className="mb-3 text-xs leading-relaxed text-slate-300">Choose a kit. Pick a marked plot. Our crew will build it!</p>
      <div className="space-y-2">
        {kits.map(({ device, Icon, description, locked }) => {
          const built = g.placements[device] !== undefined;
          const working = g.construction?.device === device;
          const available = isBuildAvailable(g, device);
          const selected = g.selectedBuild === device;
          const status = built ? "Built" : working ? "Crew is building" : selected ? "Choose a plot on the map" : available ? "Your mission needs this" : g.construction ? "Wait for our crew to finish" : locked;
          return <button key={device} disabled={!available} aria-pressed={selected} aria-label={`Choose ${BUILD_LABELS[device]} kit`} onClick={() => { g.selectBuild(device); onOpenChange(false); requestAnimationFrame(() => document.querySelector<HTMLButtonElement>('[aria-label="Available building plots"] button')?.focus()); }} className={`flex min-h-20 w-full items-start gap-2 rounded-xl border p-3 text-left focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default ${available ? "border-amber-300/80 bg-amber-300/10 hover:bg-amber-300/20" : "border-slate-700 bg-slate-900/60"}`}>
            <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${available ? "text-amber-300" : built ? "text-emerald-300" : "text-slate-400"}`} aria-hidden="true" />
            <span className="min-w-0"><strong className="block text-sm">{BUILD_LABELS[device]}</strong><span className="mt-1 block text-xs leading-relaxed text-slate-300">{description}</span><span className={`mt-2 flex items-start gap-1 text-xs leading-relaxed ${available ? "text-amber-200" : built ? "text-emerald-300" : "text-slate-400"}`}>{built ? <Check className="h-3.5 w-3.5 shrink-0" /> : !available && !working ? <LockKeyhole className="h-3.5 w-3.5 shrink-0" /> : null}{status}</span></span>
          </button>;
        })}
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">One of each kit came with the crew. Building uses no stored energy or water.</p>
    </aside>
  </div>;
}
