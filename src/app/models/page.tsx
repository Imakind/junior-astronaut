"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useState } from "react";

const ModelViewer = dynamic(() => import("@/components/game/RoverViewer"), { ssr: false });

const models = [
  { id: "rover", name: "Марсоход" },
  { id: "astronaut", name: "Астронавт" },
  { id: "base", name: "База" },
];

export default function ModelsPage() {
  const [selected, setSelected] = useState(models[0]);
  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-slate-100">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-11 items-center text-sky-300">← К игре</Link>
        <h1 className="mb-6 text-2xl font-bold">Модели для марсианской базы</h1>
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Выбор модели">
          {models.map((model) => (
            <button key={model.id} type="button" aria-pressed={selected.id === model.id}
              onClick={() => setSelected(model)}
              className={`min-h-11 rounded-md border px-5 ${selected.id === model.id ? "border-sky-400 bg-sky-800" : "border-slate-600 bg-slate-800"}`}>
              {model.name}
            </button>
          ))}
        </div>
        <ModelViewer key={selected.id} modelUrl={`/models/${selected.id}.glb`} label={selected.name} />
      </div>
    </main>
  );
}
