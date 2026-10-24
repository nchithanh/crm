import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "public", "build-id.json");

const buildId =
  (process.env.GITHUB_SHA && process.env.GITHUB_SHA.slice(0, 12)) ||
  `local-${Date.now().toString(36)}`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(
  outPath,
  `${JSON.stringify({ buildId, builtAt: new Date().toISOString() }, null, 2)}\n`,
);

console.log(`Wrote public/build-id.json (${buildId})`);
