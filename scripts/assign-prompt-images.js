#!/usr/bin/env node
/**
 * Assign a unique image URL to every prompt in data/prompts.json.
 * Uses Picsum (picsum.photos) for deterministic, distinct photos per prompt id.
 * Run from project root: node scripts/assign-prompt-images.js
 */
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'prompts.json');

function getImageUrl(prompt) {
  const id = prompt.id;
  // Picsum: same seed always returns same image. 800x450 fits card layout.
  return `https://picsum.photos/seed/prompt-${id}/800/450`;
}

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const prompts = data.prompts || [];

  prompts.forEach(function (p) {
    p.image = getImageUrl(p);
  });

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 0));
  console.log('Assigned image URLs to', prompts.length, 'prompts.');
}

main();
