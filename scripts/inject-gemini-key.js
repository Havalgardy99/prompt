/**
 * Cloudflare Pages build: inject GEMINI_API_KEY and GEMINI_MODEL from env.
 * Writes to js/gemini-config.default.js so the deployed site gets the key.
 * In Cloudflare: Settings → Variables and Secrets → Add GEMINI_API_KEY (and optionally GEMINI_MODEL).
 * Build command: node scripts/inject-gemini-key.js
 */
const fs = require('fs');
const path = require('path');

const key = process.env.GEMINI_API_KEY || '';
const model = process.env.GEMINI_MODEL || '';

const outPath = path.join(__dirname, '..', 'js', 'gemini-config.default.js');
const content =
  '// Injected at build time from Cloudflare env (Variables and Secrets)\n' +
  'window.GEMINI_API_KEY = ' + JSON.stringify(key) + ';\n' +
  'window.GEMINI_MODEL = ' + JSON.stringify(model) + ';\n';

fs.writeFileSync(outPath, content, 'utf8');
console.log('Wrote js/gemini-config.default.js (key ' + (key ? 'set' : 'empty') + ')');
