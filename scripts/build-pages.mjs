// Static GitHub Pages build: sets GH_PAGES=1, runs `next build`, adds out/.nojekyll
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const nextBin = require.resolve("next/dist/bin/next");

const run = spawnSync(process.execPath, [nextBin, "build"], {
  stdio: "inherit",
  env: { ...process.env, GH_PAGES: "1" },
});
if (run.status !== 0) process.exit(run.status ?? 1);

// stop Jekyll from hiding the _next folder
writeFileSync("out/.nojekyll", "");
console.log("Pages build ready in out/");
