# @contentstorage/core

> A key-value based CMS core library that fetches content from ContentStorage and generates TypeScript types

[![npm version](https://img.shields.io/npm/v/@contentstorage/core.svg)](https://www.npmjs.com/package/@contentstorage/core)
[![License](https://img.shields.io/npm/l/@contentstorage/core.svg)](https://github.com/kaidohussar/contentstorage-core/blob/master/LICENSE)

## Features

- **Key-Value Storage** - Organize content with hierarchical dot-notation paths
- **Multi-Language Support** - Built-in support for 40+ languages
- **TypeScript First** - Automatic type generation from your content
- **Type Safety** - Full autocompletion and type checking for content access
- **Live Editor Integration** - Real-time content editing without page reload
- **Special Content Types** - Support for text, images, and A/B test variations
- **Variable Substitution** - Dynamic content with template variables
- **CLI Tools** - Easy content management with professional CLI

## Installation

```bash
npm install @contentstorage/core
```

or

```bash
yarn add @contentstorage/core
```

## Quick Start

### 1. Create Configuration File

Create `contentstorage.config.js` in your project root:

```javascript
export default {
  contentKey: 'your-content-key',
  languageCodes: ['EN', 'FR', 'DE'],
  contentDir: 'src/content/json',
  typesOutputFile: 'src/content/content-types.d.ts'
};
```

### 2. Pull Content & Generate Types

```bash
# Pull content from ContentStorage CDN
npx contentstorage pull

# Generate TypeScript type definitions
npx contentstorage generate-types
```

### 3. Initialize and Use in Your App

```typescript
import { initContentStorage, fetchContent, getText, getImage } from '@contentstorage/core';

// Initialize
initContentStorage({
  contentKey: 'your-content-key',
  languageCodes: ['EN', 'FR', 'DE']
});

// Fetch content for a language
await fetchContent('EN');

// Access content with full type safety
const title = getText('HomePage.title');
// → { contentId: 'HomePage.title', text: 'Welcome!' }

const heroImage = getImage('HomePage.hero');
// → { contentId: 'HomePage.hero', data: { url: '...', altText: '...' } }

// Use variables in text
const greeting = getText('HomePage.greeting', { name: 'John' });
// → { contentId: 'HomePage.greeting', text: 'Hello John!' }
```

## CLI Commands

### `contentstorage pull`

Pull content from ContentStorage CDN

```bash
npx contentstorage pull [options]
```

**Options:**
- `--content-key <key>` - Content key for your project
- `--content-dir <dir>` - Directory to save content files
- `--lang <code>` - Language code (e.g., EN, FR)
- `--pending-changes` - Fetch pending/draft content

**Examples:**
```bash
npx contentstorage pull --content-key abc123
npx contentstorage pull --lang EN --pending-changes
npx contentstorage pull --content-dir src/content
```

### `contentstorage generate-types`

Generate TypeScript type definitions from content

```bash
npx contentstorage generate-types [options]
```

**Options:**
- `--output <file>` - Output file for generated types
- `--content-key <key>` - Content key for your project
- `--lang <code>` - Language code (e.g., EN, FR)
- `--pending-changes` - Use pending/draft content

**Examples:**
```bash
npx contentstorage generate-types --output src/types.ts
npx contentstorage generate-types --content-key abc123 --lang EN
```

### `contentstorage --help`

Show all available commands and options

```bash
npx contentstorage --help
npx contentstorage pull --help
npx contentstorage generate-types --help
```

## Configuration

### Configuration File (`contentstorage.config.js`)

```javascript
export default {
  // Required: Unique content identifier
  contentKey: 'your-content-key',

  // Required: Array of language codes
  languageCodes: ['EN', 'FR', 'DE', 'ES'],

  // Optional: Local storage path (default: src/content/json)
  contentDir: 'src/content/json',

  // Optional: Types file path (default: src/content/content-types.ts)
  typesOutputFile: 'src/content/content-types.d.ts',

  // Optional: Fetch draft content
  pendingChanges: false
};
```

### Supported Languages

The library supports 40+ languages including:
EN, FR, DE, ES, IT, PT, NL, PL, RU, TR, SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SL, SR, and more.

## API Reference

### Initialization

#### `initContentStorage(config)`

Initialize the content storage system.

```typescript
initContentStorage({
  contentKey: string,
  languageCodes: LanguageCode[]
});
```

#### `setContentLanguage(config)`

Set content for a specific language.

```typescript
setContentLanguage({
  languageCode: LanguageCode,
  contentJson: object
});
```

### Content Retrieval

#### `getText<Path>(contentId, variables?)`

Get localized text with optional variable substitution.

```typescript
const result = getText('HomePage.title');
// → { contentId: 'HomePage.title', text: 'Welcome!' }

const greeting = getText('HomePage.greeting', { name: 'John', count: 5 });
// → { contentId: 'HomePage.greeting', text: 'Hello John, you have 5 items' }
```

**Returns:** `{ contentId: string, text: string }`

#### `getImage(contentId)`

Get image content with CDN URL.

```typescript
const image = getImage('HomePage.hero');
// → {
//     contentId: 'HomePage.hero',
//     data: {
//       contentstorage_type: 'image',
//       url: 'https://cdn.contentstorage.app/...',
//       altText: 'Hero image'
//     }
//   }
```

**Returns:** `{ contentId: string, data: ImageObject } | undefined`

#### `getVariation(contentId, variationKey?, variables?)`

Get content variation for A/B testing.

```typescript
const cta = getVariation('HomePage.cta', 'mobile');
// → { contentId: 'HomePage.cta', text: 'Tap Now' }

// Defaults to 'default' variation if not specified
const ctaDefault = getVariation('HomePage.cta');
```

**Returns:** `{ contentId: string, text: string }`

### Content Fetching

#### `fetchContent(languageCode)`

Fetch content from ContentStorage CDN.

```typescript
await fetchContent('EN');
```

## TypeScript Integration

The library uses interface augmentation for type-safe content access:

```typescript
// After running: npx contentstorage generate-types
// The generated types augment the ContentStructure interface

import { getText } from '@contentstorage/core';

// TypeScript knows all available content paths
const title = getText('HomePage.title'); // ✅ Autocomplete works
const invalid = getText('Invalid.path'); // ❌ TypeScript error
```

## Content Structure

Content is organized in a hierarchical key-value structure:

```json
{
  "HomePage": {
    "title": "Welcome to Our App",
    "greeting": "Hello {name}, you have {count} items",
    "hero": {
      "contentstorage_type": "image",
      "url": "hero.jpg",
      "altText": "Hero image"
    },
    "cta": {
      "contentstorage_type": "variation",
      "data": {
        "default": "Click Here",
        "mobile": "Tap Now",
        "desktop": "Click to Continue"
      }
    }
  }
}
```

**Access with dot notation:**
- `getText('HomePage.title')` → "Welcome to Our App"
- `getText('HomePage.greeting', { name: 'John', count: 5 })` → "Hello John, you have 5 items"
- `getImage('HomePage.hero')` → Image object with CDN URL
- `getVariation('HomePage.cta', 'mobile')` → "Tap Now"

## Package.json Scripts

Add these scripts to your `package.json` for convenience:

```json
{
  "scripts": {
    "content:pull": "contentstorage pull",
    "content:types": "contentstorage generate-types",
    "content:sync": "npm run content:pull && npm run content:types",
    "prebuild": "npm run content:sync"
  }
}
```

Then run:

```bash
npm run content:pull    # Pull content
npm run content:types   # Generate types
npm run content:sync    # Pull and generate in one command
```

## Integration with React

For React integration, use [@contentstorage/react](https://www.npmjs.com/package/@contentstorage/react) which builds on top of this core library and provides React-specific components and hooks.

## Live Editor Mode

When running in an iframe with live editor parameters, the library automatically:
- Loads the live editor script from CDN
- Tracks content usage via `window.memoryMap`
- Enables real-time content updates without page reload

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format code
npm run prettier:write

# Release
npm run release
```

## Requirements

- Node.js >= 18.0.0
- TypeScript >= 5.0.0 (for type generation)

## License

MIT

## Author

Kaido Hussar - [kaidohus@gmail.com](mailto:kaidohus@gmail.com)

## Links

- [Homepage](https://contentstorage.app)
- [GitHub](https://github.com/kaidohussar/contentstorage-core)
- [npm](https://www.npmjs.com/package/@contentstorage/core)

## Support

For issues and questions, please [open an issue](https://github.com/kaidohussar/contentstorage-core/issues) on GitHub.
