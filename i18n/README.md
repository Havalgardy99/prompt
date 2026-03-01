# Translations (i18n)

All user-facing text is organized here so the site can switch language (English, Kurdish, Arabic) and stay consistent.

## Files

- **en.json** – English (default)
- **ar.json** – Arabic (RTL)
- **ckb.json** – Kurdish Sorani (RTL)

## Structure

| Section    | Use |
|-----------|-----|
| **meta**  | `dir`, `lang` for the document |
| **nav**   | Navigation labels, search placeholder |
| **hero**  | Homepage hero title, subtitle, buttons |
| **about** | About section title and body |
| **stats** | Labels for stats (Prompts, AI Tools, Articles, Languages) |
| **services** | Category cards (Image, Video, Tools, Articles, Student) |
| **howItWorks** | Steps (Choose category, Search & filter, Copy & create) |
| **showcase** | Featured prompts section |
| **testimonials** | Quote blocks |
| **faq** | FAQ questions and answers |
| **blog** | Read more, min read |
| **cta** | Call-to-action block |
| **footer** | Tagline, categories, links, about, copyright |
| **pageTitle** | Document title per page |
| **page** | Misc page text (e.g. aboutPrompts) |
| **categories** | Category names (image, video, article, etc.) |
| **difficulty** | Beginner, Intermediate, Pro |
| **pricing** | Free, Freemium, Paid |
| **actions** | Copy, Load more, Back, Related prompts |
| **errors** | Load/not-found messages (prompts, articles, tools) |
| **ui** | Filters (Level, Type, Tag), search, tips, aria labels |
| **prompts** | Per-prompt title/description/detail (ids 1–35 in en) |
| **tips** | Aspect ratio, style, negative prompt, quality |
| **tools** | Tool names and summaries by slug |
| **lang** | Language names for the selector |

## Usage in code

- **HTML:** `data-i18n="nav.imagePrompts"` → text content  
  `data-i18n-placeholder="nav.searchPlaceholder"` → placeholder  
  `data-i18n-aria-label="ui.ariaMenu"` → aria-label
- **JS:** `window.AIHub.t('errors.loadPrompts')` or pass a fallback:  
  `t('ui.noResults') || 'No results.'`

## Adding new text

1. Add the key to **en.json** in the right section (e.g. `ui.myLabel`).
2. Add the same key to **ar.json** and **ckb.json** with translated values.
3. In HTML use `data-i18n="section.key"` or in JS use `t('section.key')`.

Keeping keys identical across all three files avoids showing raw keys when a translation is missing.
