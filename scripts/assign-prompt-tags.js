#!/usr/bin/env node
/**
 * Assign tags to every prompt for filtering (e.g. 4K, Animation, Enhancer).
 * Run from project root: node scripts/assign-prompt-tags.js
 */
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'prompts.json');

const TAGS_BY_CATEGORY = {
  image: ['4k', '8k', 'photorealistic', 'animation', 'cinematic', 'minimalist', 'portrait', 'landscape', 'art', 'product', 'vintage', 'logo', 'watercolor', 'noir'],
  video: ['4k', 'cinematic', 'timelapse', 'enhancer', 'upscale', 'slow-motion', 'vfx', 'commercial', 'documentary', 'drone', 'nature'],
  article: ['guide', 'tutorial', 'news', 'reference', 'comparison', 'tips', 'workflow'],
  student: ['summarize', 'quiz', 'exam', 'flashcards', 'study', 'notes', 'practice']
};

function pick(arr, n) {
  const out = [];
  const copy = [...arr];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function assignTags(p) {
  const list = TAGS_BY_CATEGORY[p.category] || [];
  if (!list.length) {
    p.tags = [];
    return;
  }
  const numTags = 1 + (p.id % 3);
  const chosen = pick(list, Math.min(numTags, list.length));
  if (p.tips && p.tips.quality) {
    const q = (p.tips.quality || '').toLowerCase();
    if (q.indexOf('4k') >= 0) chosen.push('4k');
    if (q.indexOf('8k') >= 0) chosen.push('8k');
  }
  if (p.tips && p.tips.style) {
    const s = (p.tips.style || '').toLowerCase();
    if (s.indexOf('cinematic') >= 0) chosen.push('cinematic');
    if (s.indexOf('animation') >= 0 || s.indexOf('anime') >= 0) chosen.push('animation');
  }
  p.tags = [...new Set(chosen)];
}

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const prompts = data.prompts || [];

  prompts.forEach(function (p) {
    assignTags(p);
  });

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 0));
  console.log('Assigned tags to', prompts.length, 'prompts.');
}

main();
