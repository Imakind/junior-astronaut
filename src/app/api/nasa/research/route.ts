import { NextResponse } from "next/server";
import { REVIEWED_PLANT_STUDY, type ResearchStudy } from "@/lib/greenhouse-research";

export const runtime = "nodejs";

type OsdrMetadata = {
  study?: {
    "OSD-314"?: {
      studies?: Array<{ identifier?: string; title?: string }>;
    };
  };
};

export async function GET() {
  try {
    const response = await fetch("https://osdr.nasa.gov/osdr/data/osd/meta/314", {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("OSDR metadata unavailable");
    const metadata: OsdrMetadata = await response.json();
    const study = metadata.study?.["OSD-314"]?.studies?.find(item => item.identifier === "OSD-314");
    if (typeof study?.title !== "string" || !study.title.trim()) {
      throw new Error("OSDR metadata has an unexpected structure");
    }
    const result: ResearchStudy = {
      ...REVIEWED_PLANT_STUDY,
      source: "live",
      title: study.title.trim(),
      checkedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  } catch {
    return NextResponse.json(REVIEWED_PLANT_STUDY);
  }
}
