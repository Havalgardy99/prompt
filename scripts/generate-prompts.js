#!/usr/bin/env node
/**
 * Generate 965 additional prompts (ids 36-1000), validate existing, merge and write data/prompts.json
 * Run from project root: node scripts/generate-prompts.js
 */
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'prompts.json');
const IMAGE_BASE = 'https://images.unsplash.com/photo-';
const PLACEHOLDER_IMG = 'https://placehold.co/800x450/1e1b4b/6366f1?text=Prompt';

const CATEGORIES = {
  image: { subcategories: ['art', 'photo', 'design'], weight: 45 },
  video: { subcategories: ['generation', 'upscale', 'editing'], weight: 20 },
  article: { subcategories: ['guides', 'news', 'tutorials'], weight: 20 },
  student: { subcategories: ['summarize', 'quiz', 'exam'], weight: 15 }
};

const DIFFICULTIES = ['beginner', 'intermediate', 'pro'];
const TOOLS = {
  image: [['midjourney', 'dalle', 'leonardo'], ['midjourney', 'stable-diffusion'], ['dalle', 'leonardo', 'gemini']],
  video: [['sora', 'runway', 'pika'], ['runway', 'topaz'], ['runway', 'invideo']],
  article: [['chatgpt', 'claude', 'gemini'], ['perplexity', 'claude'], ['chatgpt', 'perplexity']],
  student: [['chatgpt', 'claude', 'gemini'], ['chatgpt', 'notion-ai'], ['claude', 'gemini', 'perplexity']]
};

// Seed data for generating varied image prompts
const IMAGE_SUBJECTS = ['mountain landscape', 'portrait', 'abstract shape', 'product', 'animal', 'cityscape', 'forest', 'fantasy creature', 'food', 'architecture', 'vehicle', 'flower', 'ocean', 'space scene', 'character', 'logo concept', 'pattern', 'interior', 'still life', 'sunset'];
const IMAGE_STYLES = ['photorealistic', 'watercolor', 'digital art', 'minimalist', 'cinematic', 'vintage', 'neon', 'pastel', 'monochrome', '3D render', 'flat design', 'oil painting', 'anime', 'sketch', 'retro', 'modern', 'noir', 'surreal', 'geometric', 'organic'];
const IMAGE_ASPECTS = ['16:9', '1:1', '3:4', '2:3', '4:5', '9:16'];

// Seed data for video prompts
const VIDEO_TYPES = ['drone shot', 'timelapse', 'product reveal', 'nature scene', 'urban walk', 'talking head', 'motion graphic', 'VFX element', 'slow motion', 'documentary style', 'commercial', 'cinematic'];
const VIDEO_STYLES = ['4K', 'cinematic', 'smooth', 'film grain', 'professional', 'dramatic', 'calm', 'dynamic'];

// Seed data for article prompts
const ARTICLE_TOPICS = ['prompt tips', 'AI tools comparison', 'workflow guide', 'ethics overview', 'parameter reference', 'style consistency', 'negative prompts', 'aspect ratios', 'tool selection', 'best practices', 'getting started', 'advanced techniques', 'industry news', 'tutorial steps', 'troubleshooting'];
const ARTICLE_STYLES = ['educational', 'comparative', 'step-by-step', 'reference', 'informative', 'practical'];

// Seed data for student prompts
const STUDENT_TYPES = ['summarize notes', 'quiz from chapter', 'exam prep', 'flashcards', 'key terms', 'essay outline', 'compare concepts', 'define terms', 'practice problems', 'study plan', 'review sheet', 'concept map'];

const TAGS_BY_CATEGORY = {
  image: ['4k', '8k', 'photorealistic', 'animation', 'cinematic', 'minimalist', 'portrait', 'landscape', 'art', 'product', 'vintage', 'logo', 'watercolor', 'noir'],
  video: ['4k', 'cinematic', 'timelapse', 'enhancer', 'upscale', 'slow-motion', 'vfx', 'commercial', 'documentary', 'drone', 'nature'],
  article: ['guide', 'tutorial', 'news', 'reference', 'comparison', 'tips', 'workflow'],
  student: ['summarize', 'quiz', 'exam', 'flashcards', 'study', 'notes', 'practice']
};

function pickTags(category, n) {
  const list = TAGS_BY_CATEGORY[category] || [];
  return pickN(list, Math.min(n, list.length));
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function pickN(arr, n) {
  const out = [];
  const copy = [...arr];
  while (out.length < n && copy.length) {
    out.push(...copy.splice(Math.floor(Math.random() * copy.length), 1));
  }
  return out;
}

function slugify(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'prompt';
}

function ensureUniqueSlug(slug, used) {
  let s = slug;
  let i = 0;
  while (used.has(s)) s = slug + '-' + (++i);
  used.add(s);
  return s;
}

function getRelatedIds(id, maxId, count = 3) {
  const pool = [];
  for (let i = 1; i <= maxId && i !== id; i++) pool.push(i);
  return pickN(pool, Math.min(count, pool.length));
}

function getImageUrl(prompt) {
  const id = prompt.id;
  return 'https://picsum.photos/seed/prompt-' + id + '/800/450';
}

function generateImagePrompt(id, slugSet) {
  const subject = pick(IMAGE_SUBJECTS);
  const style = pick(IMAGE_STYLES);
  const ar = pick(IMAGE_ASPECTS);
  const title = `${style.charAt(0).toUpperCase() + style.slice(1)} ${subject}`;
  const slug = ensureUniqueSlug(slugify(title + '-' + id), slugSet);
  const prompt = `Create an image: ${subject} in ${style} style. Use high quality, detailed composition with clear focal point and balanced lighting. Specify aspect ratio ${ar}. Include descriptive mood and texture where relevant. Avoid blurry, low-quality, or distorted output. Prefer crisp edges and coherent style. Suitable for portfolios, social media, or print. --ar ${ar}`;
  return {
    id,
    category: 'image',
    subcategory: pick(CATEGORIES.image.subcategories),
    difficulty: pick(DIFFICULTIES),
    slug,
    image: getImageUrl({ id }),
    prompt,
    tips: { aspectRatio: ar, style: style + ', ' + subject, negativePrompt: 'blurry, low quality, distorted', quality: 'high detail' },
    toolTags: pick(TOOLS.image),
    relatedIds: getRelatedIds(id, id - 1),
    title,
    description: `${style} style ${subject}. Good for portfolios and social media.`,
    tags: pickTags('image', 1 + (id % 3))
  };
}

function generateVideoPrompt(id, slugSet) {
  const type = pick(VIDEO_TYPES);
  const style = pick(VIDEO_STYLES);
  const title = (style.charAt(0).toUpperCase() + style.slice(1)) + ' ' + type;
  const slug = ensureUniqueSlug(slugify(title + '-' + id), slugSet);
  const prompt = `Generate a video: ${type}. Style should be ${style} with smooth, professional motion. Use 4K resolution if possible. Keep lighting and color consistent. Avoid shaky camera, artificial-looking effects, or low resolution. The result should be suitable for commercial or documentary use. Maintain natural pacing and clear composition throughout.`;
  return {
    id,
    category: 'video',
    subcategory: pick(CATEGORIES.video.subcategories),
    difficulty: pick(DIFFICULTIES),
    slug,
    image: getImageUrl({ id }),
    prompt,
    tips: { aspectRatio: '16:9', style: style + ', ' + type, negativePrompt: 'shaky, low res', quality: '4K' },
    toolTags: pick(TOOLS.video),
    relatedIds: getRelatedIds(id, id - 1),
    title,
    description: `Video prompt for ${type}. ${style} look.`,
    tags: pickTags('video', 1 + (id % 3))
  };
}

function generateArticlePrompt(id, slugSet) {
  const topic = pick(ARTICLE_TOPICS);
  const style = pick(ARTICLE_STYLES);
  const title = `Article: ${topic.charAt(0).toUpperCase() + topic.slice(1)}`;
  const slug = ensureUniqueSlug(slugify('article-' + topic + '-' + id), slugSet);
  const prompt = `Write a short ${style} article about ${topic} for AI image or video creators. Include clear headings, step-by-step or numbered sections where useful, and actionable tips that readers can apply immediately. Mention specific tools or parameters when relevant. Keep the tone clear and concise. Aim for practical value: the reader should be able to improve their workflow or results after reading.`;
  return {
    id,
    category: 'article',
    subcategory: pick(CATEGORIES.article.subcategories),
    difficulty: pick(DIFFICULTIES),
    slug,
    image: getImageUrl({ id }),
    prompt,
    tips: { aspectRatio: 'N/A', style: style, negativePrompt: 'N/A', quality: 'Concise' },
    toolTags: pick(TOOLS.article),
    relatedIds: getRelatedIds(id, id - 1),
    title,
    description: `${style} guide on ${topic}. For creators and learners.`,
    tags: pickTags('article', 1 + (id % 3))
  };
}

function generateStudentPrompt(id, slugSet) {
  const type = pick(STUDENT_TYPES);
  const title = `Student: ${type.charAt(0).toUpperCase() + type.slice(1)}`;
  const slug = ensureUniqueSlug(slugify('student-' + type + '-' + id), slugSet);
  const prompt = `Help me with ${type}. [Paste your lecture notes, book excerpt, or study material here.] Format the output clearly for study and review. Include main ideas, key definitions, and at least one concrete example per major concept. Use bullet points or short paragraphs. The result should be suitable for quick revision before a quiz or exam.`;
  return {
    id,
    category: 'student',
    subcategory: pick(CATEGORIES.student.subcategories),
    difficulty: pick(DIFFICULTIES),
    slug,
    image: getImageUrl({ id }),
    prompt,
    tips: { aspectRatio: 'N/A', style: 'Study aid', negativePrompt: 'N/A', quality: 'Clear' },
    toolTags: pick(TOOLS.student),
    relatedIds: getRelatedIds(id, id - 1),
    title,
    description: `Use for ${type}. Paste your material and get structured output.`,
    tags: pickTags('student', 1 + (id % 3))
  };
}

function validateAndFixPrompts(prompts) {
  const idSet = new Set(prompts.map(p => p.id));
  prompts.forEach(p => {
    if (p.relatedIds && Array.isArray(p.relatedIds)) {
      p.relatedIds = p.relatedIds.filter(rid => idSet.has(rid) && rid !== p.id).slice(0, 5);
    }
    if (!p.title) p.title = 'Prompt ' + p.id;
    if (!p.description) p.description = 'Use this prompt with your preferred AI tool.';
    if (typeof p.prompt !== 'string') p.prompt = '';
    p.prompt = p.prompt.replace(/\0/g, '').trim();
    if (p.prompt.length < 20) p.prompt = (p.prompt || 'Use this prompt with your AI tool.') + ' Add your own details for best results.';
  });
  return prompts;
}

function main() {
  const raw = fs.readFileSync(DATA_PATH, 'utf8');
  const data = JSON.parse(raw);
  let prompts = data.prompts || [];
  const categories = data.categories || {
    image: { subcategories: ['art', 'photo', 'design'] },
    video: { subcategories: ['generation', 'upscale', 'editing'] },
    article: { subcategories: ['guides', 'news', 'tutorials'] },
    student: { subcategories: ['summarize', 'quiz', 'exam'] }
  };

  prompts = validateAndFixPrompts(prompts);
  const existingIds = new Set(prompts.map(p => p.id));
  const slugSet = new Set(prompts.map(p => p.slug));

  const toAdd = 1000 - prompts.length;
  if (toAdd <= 0) {
    console.log('Already have', prompts.length, 'prompts. Writing validated file.');
    fs.writeFileSync(DATA_PATH, JSON.stringify({ prompts, categories }, null, 0));
    return;
  }

  const counts = { image: 0, video: 0, article: 0, student: 0 };
  const totalWeights = Object.values(CATEGORIES).reduce((s, c) => s + c.weight, 0);
  const targets = {};
  Object.keys(CATEGORIES).forEach(cat => {
    targets[cat] = Math.round((CATEGORIES[cat].weight / totalWeights) * toAdd);
  });

  let nextId = Math.max(...existingIds, 0) + 1;
  const generators = {
    image: generateImagePrompt,
    video: generateVideoPrompt,
    article: generateArticlePrompt,
    student: generateStudentPrompt
  };

  for (let i = 0; i < toAdd; i++) {
    let cat = pick(Object.keys(CATEGORIES));
    while (counts[cat] >= targets[cat] && Object.values(counts).some(c => c < targets[Object.keys(counts)[0]])) {
      cat = pick(Object.keys(CATEGORIES));
    }
    const p = generators[cat](nextId, slugSet);
    prompts.push(p);
    counts[cat]++;
    nextId++;
  }

  prompts.sort((a, b) => a.id - b.id);
  fs.writeFileSync(DATA_PATH, JSON.stringify({ prompts, categories }, null, 0));
  console.log('Written', prompts.length, 'prompts to', DATA_PATH);
  console.log('Counts:', counts);
}

main();
