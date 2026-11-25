// Generates importable n8n workflow JSON from the SDK sources.
// Usage: npm install && npm run export
import { mkdirSync, writeFileSync } from 'node:fs';

const sources = [
  ['../sdk-source/resume-job-matcher.workflow.ts', 'resume-job-matcher'],
  ['../sdk-source/save-job-matches-to-word.workflow.ts', 'save-job-matches-to-word'],
];

mkdirSync(new URL('../workflows/', import.meta.url), { recursive: true });
for (const [src, out] of sources) {
  const mod = await import(src);
  const json = mod.default.toJSON({ tidyUp: true });
  writeFileSync(new URL(`../workflows/${out}.json`, import.meta.url), JSON.stringify(json, null, 2));
  console.log(`Wrote workflows/${out}.json`);
}
