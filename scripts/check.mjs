// Cheap checks that run in CI: every script parses, and vercel.json and the Capacitor config are valid JSON.
import { readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const files = [];
for (const dir of ["apps/web/api", "apps/web/public/app/js"]) for (const f of readdirSync(dir)) if (f.endsWith(".js")) files.push(`${dir}/${f}`);
files.push("apps/web/public/sw.js");
let bad = 0;
for (const f of files) {
  try { execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }); }
  catch (e) { bad++; console.error(`syntax error in ${f}\n${e.stderr}`); }
}
for (const f of ["apps/web/routes.json", "apps/site/routes.json", "apps/mobile/capacitor.config.json", "package.json"]) {
  try { JSON.parse(readFileSync(f, "utf8")); } catch (e) { bad++; console.error(`invalid JSON: ${f}: ${e.message}`); }
}
console.log(`${files.length} scripts and 3 JSON files checked, ${bad} problem(s)`);
process.exit(bad ? 1 : 0);
