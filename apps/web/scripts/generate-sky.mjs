// Generate the landing-page sky assets with Gemini image models ("Nano Banana").
// Usage:  GEMINI_API_KEY=... node scripts/generate-sky.mjs
// Writes public/assets/sky-hero.png (16:9). The CSS layers this ABOVE the
// procedural SVG fallback, so the moment this file exists the site uses it.
// NOTE: free-tier image quota is small; if you get 429s, retry after reset.

import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const KEY = process.env.GEMINI_API_KEY;
if (!KEY) {
  console.error("Set GEMINI_API_KEY in the environment first.");
  process.exit(1);
}

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../public/assets");
const MODELS = ["gemini-3.1-flash-image", "gemini-2.5-flash-image", "gemini-3-pro-image-preview"];

const PROMPTS = [
  {
    file: "sky-hero.png",
    prompt:
      "Ultra photorealistic serene daytime sky: brilliant azure blue gradient from deep blue at top " +
      "to pale ice blue at the horizon, majestic voluminous white cumulus clouds with crisp sunlit " +
      "edges, soft sun glow in the upper left, pristine, airy, high detail, no ground, no birds, " +
      "no text. Wide cinematic composition.",
  },
];

async function generate(model, prompt) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { imageConfig: { aspectRatio: "16:9" } },
      }),
    }
  );
  const json = await res.json();
  const part = (json.candidates?.[0]?.content?.parts ?? []).find((p) => p.inlineData);
  if (!part) throw new Error(json.error?.message ?? "no image in response");
  return Buffer.from(part.inlineData.data, "base64");
}

for (const { file, prompt } of PROMPTS) {
  let done = false;
  for (const model of MODELS) {
    try {
      const buf = await generate(model, prompt);
      writeFileSync(resolve(OUT_DIR, file), buf);
      console.log(`${file} <- ${model} (${Math.round(buf.length / 1024)} KB)`);
      done = true;
      break;
    } catch (err) {
      console.warn(`${model}: ${String(err.message).slice(0, 120)}`);
    }
  }
  if (!done) console.error(`FAILED: ${file} — likely image quota; retry after reset.`);
}
