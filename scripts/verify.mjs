import { readFileSync } from "node:fs";
import vm from "node:vm";

const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
const main = readFileSync("main.js", "utf8");
const styles = readFileSync("styles.css", "utf8");

if (manifest.id !== "floating-headings-mobile") throw new Error("Unexpected plugin ID");
if (manifest.isDesktopOnly !== false) throw new Error("Plugin must support mobile");
if (versions[manifest.version] !== manifest.minAppVersion) throw new Error("versions.json mismatch");

for (const required of [
  "Platform.isMobile",
  "document.addEventListener(\"pointerdown\"",
  "Toggle floating headings",
  "closeAfterNavigation",
  "getRenderedHeadings",
]) {
  if (!main.includes(required)) throw new Error(`Missing mobile behavior: ${required}`);
}

for (const required of [
  ".floating-heading-mobile.is-touch",
  "safe-area-inset-right",
  "touch-action",
  "min-height: 44px",
]) {
  if (!styles.includes(required)) throw new Error(`Missing mobile CSS: ${required}`);
}

new vm.Script(main, { filename: "main.js" });
console.log(`Verified ${manifest.name} ${manifest.version}`);
