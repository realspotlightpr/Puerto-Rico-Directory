import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("production shell does not load intrusive ad networks", async () => {
  const [html, app, footer] = await Promise.all([
    read("../index.html"),
    read("../src/App.tsx"),
    read("../src/components/layout/Footer.tsx"),
  ]);
  const source = `${html}\n${app}\n${footer}`;
  assert.doesNotMatch(source, /monetag|nap5k|adsterra|highperformanceformat/i);
  assert.doesNotMatch(source, /openAdPreferences|role="dialog"/i);
});

test("retains a labeled, non-overlay footer placement", async () => {
  const app = await read("../src/App.tsx");
  assert.match(app, /AdSlot placement="site-footer"/);
  assert.doesNotMatch(app, /fixed|inset-0|z-\[100\]/);
});

test("inline ad component remains responsive and pass-aware", async () => {
  const adSlot = await read("../src/components/ads/AdSlot.tsx");
  assert.match(adSlot, /data-full-width-responsive="true"/);
  assert.match(adSlot, /activePass/);
  assert.match(adSlot, /aria-label="Advertisement"/);
});
