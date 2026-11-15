"use client";

import { useEffect } from "react";
import { useGame, type StormEventData } from "@/lib/game-store";
import GameUI from "@/components/game/GameUI";
import MarsBaseScene from "@/components/game/MarsBaseScene";

import ObjectModals from "@/components/game/ObjectModals";
import StormModal from "@/components/game/StormModal";
import NightOverlay from "@/components/game/NightOverlay";
import DawnResult, { QuizScreen } from "@/components/game/DawnResult";
import SciencePanel from "@/components/game/SciencePanel";
import IntroScreen from "@/components/game/IntroScreen";

import GreenhouseModal from "@/components/game/GreenhouseModal";

export default function Page() {
  const initFromDonki = useGame((s) => s.initFromDonki);
  const phase = useGame((s) => s.phase);

  // Load real NASA DONKI space-weather events on first mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/nasa/donki");
        const data = await res.json();
        if (cancelled) return;
        if (data?.events?.length) {
          initFromDonki({
            source: data.source,
            message: data.message,
            events: data.events as StormEventData[],
          });
        }
      } catch {
        /* game works without a live storm event */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [initFromDonki]);

  return (
    <div className="fixed inset-0 h-[100dvh] overflow-hidden bg-slate-950">
      <IntroScreen />
      <main className="absolute inset-0" aria-label="Mars base game">
        <MarsBaseScene />
        <NightOverlay />
        <GameUI />
      </main>
      {/* Overlays */}
      <ObjectModals />
      <StormModal />
      <GreenhouseModal />
      <SciencePanel />
      <DawnResult />
      {phase === "quiz" && <QuizScreen />}
    </div>
  );
}

