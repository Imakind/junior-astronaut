import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// Cross-platform equivalent of the Next standalone asset-copy step.
const standalone = resolve(".next/standalone");
mkdirSync(resolve(standalone, ".next"), { recursive: true });
cpSync(resolve(".next/static"), resolve(standalone, ".next/static"), { recursive: true });
cpSync(resolve("public"), resolve(standalone, "public"), { recursive: true });
