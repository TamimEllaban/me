import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { parse } from "acorn";

const root = process.cwd();
const publicDir = resolve(root, ".output/public");
const assetsDir = join(publicDir, "assets");

function fail(message) {
  console.error(`Legacy build check failed: ${message}`);
  process.exitCode = 1;
}

const assetNames = await readdir(assetsDir);
const legacyScripts = assetNames.filter((name) => name.endsWith(".js") && name.includes("-legacy"));

if (!legacyScripts.includes("app-legacy.js") || !legacyScripts.includes("polyfills-legacy.js")) {
  fail("stable app-legacy.js/polyfills-legacy.js assets are missing");
}

for (const name of legacyScripts) {
  const source = await readFile(join(assetsDir, name), "utf8");
  try {
    parse(source, { ecmaVersion: 5, sourceType: "script" });
  } catch (error) {
    fail(`${name} is not ES5 syntax: ${error.message}`);
  }
}

const fallbackCssName = assetNames.find(
  (name) => name.startsWith("legacy-tv-") && name.endsWith(".css"),
);
if (!fallbackCssName) {
  fail("legacy-tv CSS fallback is missing");
} else {
  const css = await readFile(join(assetsDir, fallbackCssName), "utf8");
  for (const feature of [
    "@layer",
    "var(--",
    "oklch(",
    "color-mix(",
    ":is(",
    ":where(",
    "display:grid",
    "backdrop-filter",
    "100dvh",
  ]) {
    if (css.includes(feature)) fail(`${fallbackCssName} still contains ${feature}`);
  }
}

const serverEntry = pathToFileURL(resolve(root, ".output/server/index.mjs")).href;
const server = await import(`${serverEntry}?legacy-check=${Date.now()}`);
const response = await server.default.fetch(
  new Request("http://localhost/unlock", {
    headers: {
      "user-agent":
        "Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36 Chrome/38.0.2125.122 Safari/537.36 WebAppManager",
    },
  }),
  {},
  { waitUntil() {}, passThroughOnException() {} },
);
const html = await response.text();
if (!html.includes("$_TSR.router=(function($R)")) {
  fail("legacy UA did not receive the ES5 stream-barrier bootstrap");
}
if (html.includes("$_TSR.router=($R=>")) {
  fail("legacy UA still contains the arrow-function stream barrier");
}

const inlineScriptPattern = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
let match;
while ((match = inlineScriptPattern.exec(html))) {
  if (/\bsrc=/.test(match[1])) continue;
  try {
    parse(match[2], { ecmaVersion: 5, sourceType: "script" });
  } catch (error) {
    fail(`inline HTML script is not ES5: ${error.message}`);
  }
}

if (!process.exitCode) {
  console.log(
    `Legacy build check passed: ${legacyScripts.length} ES5 scripts, ${fallbackCssName}, and ES5 inline bootstrap.`,
  );
}
