#!/usr/bin/env node
/**
 * Translate all prompts (title, description, and detail for 1–35) into Arabic and Kurdish
 * using MyMemory free API (en|ar and en|ku). Merges into i18n/ar.json and i18n/ckb.json.
 *
 * Usage (from project root):
 *   node scripts/translate-prompts.js
 *   node scripts/translate-prompts.js --ar-only     # only Arabic
 *   node scripts/translate-prompts.js --ckb-only    # only Kurdish
 *   node scripts/translate-prompts.js --from 100    # start from prompt id 100 (resume)
 *   node scripts/translate-prompts.js --to 50       # only translate up to id 50
 *
 * Optional env: MYMEMORY_EMAIL=you@example.com for higher daily limit (50k chars/day).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_PATH = path.join(ROOT, 'data', 'prompts.json');
const I18N_DIR = path.join(ROOT, 'i18n');
const PROGRESS_PATH = path.join(ROOT, 'scripts', 'translate-progress.json');

const DELAY_MS = 1500; // between API calls to avoid rate limits
const MYMEMORY_MAX_CHARS = 500; // API limit per request

const args = process.argv.slice(2);
const arOnly = args.includes('--ar-only');
const ckbOnly = args.includes('--ckb-only');
let fromId = 1;
let toId = Infinity;
const fromIdx = args.indexOf('--from');
if (fromIdx !== -1 && args[fromIdx + 1]) fromId = Math.max(1, parseInt(args[fromIdx + 1], 10));
const toIdx = args.indexOf('--to');
if (toIdx !== -1 && args[toIdx + 1]) toId = parseInt(args[toIdx + 1], 10);

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function translateLibreTranslate(text, targetLang) {
  if (!text || !text.trim()) return '';
  const apiKey = process.env.LIBRETRANSLATE_API_KEY;
  if (!apiKey) throw new Error('LibreTranslate requires LIBRETRANSLATE_API_KEY');
  const res = await fetch('https://libretranslate.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: targetLang,
      format: 'text',
      api_key: apiKey
    })
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`LibreTranslate ${res.status}: ${t}`);
  }
  const data = await res.json();
  return data.translatedText || text;
}

async function translateMyMemory(text, targetLang) {
  if (!text || !text.trim()) return '';
  const langpair = targetLang === 'ku' ? 'en|ku' : 'en|ar';
  const q = text.length > MYMEMORY_MAX_CHARS ? text.slice(0, MYMEMORY_MAX_CHARS - 1) : text;
  const url = new URL('https://api.mymemory.translated.net/get');
  url.searchParams.set('q', q);
  url.searchParams.set('langpair', langpair);
  const email = process.env.MYMEMORY_EMAIL;
  if (email) url.searchParams.set('de', email);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MyMemory ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const translated = data.responseData?.translatedText;
  if (data.responseStatus === 429) throw new Error('MyMemory daily limit reached. Set MYMEMORY_EMAIL or run tomorrow.');
  if (translated && translated.trim()) return translated.trim();
  return text;
}

/** Use MyMemory for both; if LIBRETRANSLATE_API_KEY is set, use LibreTranslate for Arabic. */
async function translateText(text, lang, preferLibre) {
  if (preferLibre && lang === 'ar' && process.env.LIBRETRANSLATE_API_KEY)
    return translateLibreTranslate(text, lang);
  const myMemoryLang = lang === 'ar' ? 'ar' : 'ku';
  return translateMyMemory(text, myMemoryLang);
}

function loadProgress() {
  try {
    const raw = fs.readFileSync(PROGRESS_PATH, 'utf8');
    return JSON.parse(raw);
  } catch {
    return { ar: {}, ckb: {} };
  }
}

function saveProgress(progress) {
  fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress, null, 2), 'utf8');
}

async function main() {
  const rawData = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(rawData);
  const prompts = data.prompts || [];
  if (prompts.length === 0) {
    console.error('No prompts in data/prompts.json');
    process.exit(1);
  }

  const enPath = path.join(I18N_DIR, 'en.json');
  const enRaw = fs.readFileSync(enPath, 'utf8');
  const en = JSON.parse(enRaw);
  const enPrompts = en.prompts || {};

  const arPath = path.join(I18N_DIR, 'ar.json');
  const ckbPath = path.join(I18N_DIR, 'ckb.json');
  const ar = JSON.parse(fs.readFileSync(arPath, 'utf8'));
  const ckb = JSON.parse(fs.readFileSync(ckbPath, 'utf8'));
  ar.prompts = ar.prompts || {};
  ckb.prompts = ckb.prompts || {};

  let progress = loadProgress();
  // Seed progress from existing i18n so we don't lose already-translated keys when merging
  Object.keys(ar.prompts).forEach((k) => {
    if (!progress.ar[k]) progress.ar[k] = ar.prompts[k];
  });
  Object.keys(ckb.prompts).forEach((k) => {
    if (!progress.ckb[k]) progress.ckb[k] = ckb.prompts[k];
  });

  const doAr = !ckbOnly;
  const doCkb = !arOnly;
  let startIndex = prompts.findIndex((p) => p.id >= fromId);
  if (startIndex < 0) startIndex = 0;
  let endIndex = prompts.length;
  if (toId < Infinity) {
    const idx = prompts.findIndex((p) => p.id > toId);
    endIndex = idx === -1 ? prompts.length : idx;
  }
  const total = endIndex - startIndex;

  console.log(`Translating prompts ${fromId}..${prompts[endIndex - 1]?.id ?? toId} (${total} items). AR: ${doAr}, CKB: ${doCkb}. Delay ${DELAY_MS}ms.`);

  for (let i = startIndex; i < endIndex; i++) {
    const p = prompts[i];
    const id = p.id;
    const key = String(id);
    const title = (p.title || '').trim();
    const description = (p.description || '').trim();
    const detailEn = (enPrompts[key] && enPrompts[key].detail) ? enPrompts[key].detail.trim() : '';

    if (doAr) {
      if (!progress.ar[key]) {
        try {
          const [titleAr, descAr, detailAr] = await Promise.all([
            title ? translateText(title, 'ar', true) : '',
            description ? translateText(description, 'ar', true) : '',
            detailEn ? translateText(detailEn, 'ar', true) : ''
          ]);
          progress.ar[key] = { title: titleAr || title, description: descAr || description };
          if (detailAr) progress.ar[key].detail = detailAr;
        } catch (err) {
          console.error(`AR id ${id}: ${err.message}`);
          progress.ar[key] = { title, description };
          if (detailEn) progress.ar[key].detail = detailEn;
        }
        await sleep(DELAY_MS);
      }
      ar.prompts[key] = { ...progress.ar[key] };
    }

    if (doCkb) {
      if (!progress.ckb[key]) {
        try {
          const [titleCkb, descCkb, detailCkb] = await Promise.all([
            title ? translateText(title, 'ku', false) : '',
            description ? translateText(description, 'ku', false) : '',
            detailEn ? translateText(detailEn, 'ku', false) : ''
          ]);
          progress.ckb[key] = { title: titleCkb || title, description: descCkb || description };
          if (detailCkb) progress.ckb[key].detail = detailCkb;
        } catch (err) {
          console.error(`CKB id ${id}: ${err.message}`);
          progress.ckb[key] = { title, description };
          if (detailEn) progress.ckb[key].detail = detailEn;
        }
        await sleep(DELAY_MS);
      }
      ckb.prompts[key] = { ...progress.ckb[key] };
    }

    if ((i - startIndex + 1) % 25 === 0) {
      saveProgress(progress);
      fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
      fs.writeFileSync(ckbPath, JSON.stringify(ckb, null, 2), 'utf8');
      console.log(`Progress: ${i + 1}/${endIndex} (saved)`);
    }
  }

  saveProgress(progress);
  fs.writeFileSync(arPath, JSON.stringify(ar, null, 2), 'utf8');
  fs.writeFileSync(ckbPath, JSON.stringify(ckb, null, 2), 'utf8');
  console.log('Done. Updated i18n/ar.json and i18n/ckb.json.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
