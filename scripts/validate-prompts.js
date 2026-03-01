#!/usr/bin/env node
/**
 * Validate and fix prompt text in data/prompts.json:
 * - Ensure prompt is a string, strip null bytes, trim
 * - Ensure minimum length for usability
 * Run from project root: node scripts/validate-prompts.js
 */
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'prompts.json');
const MIN_LENGTH = 30;

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  const prompts = data.prompts || [];
  let fixed = 0;

  prompts.forEach(function (p) {
    if (typeof p.prompt !== 'string') {
      p.prompt = 'Use this prompt with your AI tool. Add your own details for best results.';
      fixed++;
      return;
    }
    const cleaned = p.prompt.replace(/\0/g, '').trim();
    if (cleaned !== p.prompt) {
      p.prompt = cleaned;
      fixed++;
    }
    if (p.prompt.length < MIN_LENGTH) {
      p.prompt = (p.prompt || 'Use this prompt with your AI tool.') + ' Add your own details, style, or context for best results.';
      fixed++;
    }
  });

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 0));
  console.log('Validated', prompts.length, 'prompts.', fixed > 0 ? 'Fixed ' + fixed + '.' : 'No changes needed.');
}

main();
