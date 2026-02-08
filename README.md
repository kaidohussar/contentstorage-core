# @contentstorage/core

> CLI tool for managing translations and generating TypeScript types from Contentstorage

[![npm version](https://img.shields.io/npm/v/@contentstorage/core.svg)](https://www.npmjs.com/package/@contentstorage/core)
[![License](https://img.shields.io/npm/l/@contentstorage/core.svg)](https://github.com/kaidohussar/contentstorage-core/blob/master/LICENSE)

## Overview

Contentstorage Core is a powerful CLI tool for managing translations and content. It pulls content from Contentstorage CDN, generates TypeScript types, and integrates seamlessly with popular i18n libraries.

## Features

- **Translation Management** - Pull and push content to/from Contentstorage
- **TypeScript Generation** - Automatic type generation from your content
- **Translation Statistics** - Analyze translation completeness across languages
- **Multi-Language Support** - Built-in support for 40+ languages
- **CLI Tools** - Professional command-line interface
- **API Key Authentication** - Secure project-level API keys for CI/CD integration
- **Plugin Ecosystem** - Integrate with i18next, react-intl, vue-i18n, and more

## Installation

```bash
npm install -D @contentstorage/core
```

or

```bash
yarn add -D @contentstorage/core
```

## Quick Start

### 1. Create Configuration File

Create `contentstorage.config.js` in your project root:

```javascript
export default {
  // Option A: Content Key (read-only access)
  contentKey: 'your-team-id/your-project-id',

  // Option B: API Key (read + write access) - recommended for CI/CD
  // apiKey: 'csk_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx',
  // projectId: 'your-project-uuid',

  languageCodes: ['EN', 'FR', 'DE'],
  contentDir: 'src/content/json',
  typesOutputFile: 'src/content/content-types.d.ts'
};
```

> **Note:** Use `contentKey` for read-only access (pull, stats). Use `apiKey` + `projectId` for full access including push operations. API keys can be created in Project Settings → API Keys.

### 2. Pull Content & Generate Types

```bash
# Pull content from Contentstorage CDN
npx contentstorage pull

# Generate TypeScript type definitions
npx contentstorage generate-types
```

### 3. Use with Your i18n Library

**With i18next:**
```bash
npm install @contentstorage/plugin-i18next
npx contentstorage-i18next export
```

**With react-intl:**
```bash
npm install @contentstorage/plugin-react-intl
npx contentstorage-react-intl export
```

**With Contentstorage SDK (for advanced features like variations and images):**
```bash
npm install @contentstorage/sdk
```

## CLI Commands

### `contentstorage pull`

Pull content from Contentstorage CDN

```bash
npx contentstorage pull [options]
```

**Options:**
- `--content-key <key>` - Content key (read-only access)
- `--api-key <key>` - API key (read + write access)
- `--project-id <id>` - Project ID (required with --api-key)
- `--content-dir <dir>` - Directory to save content files
- `--lang <code>` - Language code (e.g., EN, FR)
- `--pending-changes` - Fetch pending/draft content
- `--flatten` - Output flattened key-value pairs

**Examples:**
```bash
# Using content key (read-only)
npx contentstorage pull --content-key teamId/projectId

# Using API key (recommended for CI/CD)
npx contentstorage pull --api-key csk_xxx --project-id uuid

# Pull specific language with draft content
npx contentstorage pull --lang EN --pending-changes
```

### `contentstorage push`

Push local content changes to Contentstorage (requires API key)

```bash
npx contentstorage push [options]
```

**Options:**
- `--api-key <key>` - API key (required)
- `--project-id <id>` - Project ID (required)
- `--content-dir <dir>` - Directory with content files
- `--lang <code>` - Language code to push (e.g., EN)
- `--dry-run` - Preview changes without applying

**Examples:**
```bash
# Push all configured languages
npx contentstorage push --api-key csk_xxx --project-id uuid

# Push specific language
npx contentstorage push --api-key csk_xxx --project-id uuid --lang EN

# Preview changes without applying
npx contentstorage push --api-key csk_xxx --project-id uuid --dry-run
```

**Behavior:**
- Adds new keys that don't exist in Contentstorage
- Updates existing keys with different values
- Never removes keys (safe by design)
- If change tracking is enabled, creates pending changes for review

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

### `contentstorage stats`

Show translation completeness statistics across all configured languages

```bash
npx contentstorage stats [options]
```

**Options:**
- `--content-key <key>` - Content key (read-only access)
- `--api-key <key>` - API key (fetches stats directly from API)
- `--project-id <id>` - Project ID (required with --api-key)
- `--content-dir <dir>` - Directory with content files
- `--pending-changes` - Analyze pending/draft content

**Examples:**
```bash
# Using local files + content key
npx contentstorage stats
npx contentstorage stats --content-key teamId/projectId

# Using API key (fetches directly from server)
npx contentstorage stats --api-key csk_xxx --project-id uuid
```

**What it shows:**
- Total number of content items per language
- Number of translated vs untranslated items
- Completion percentage for each language
- Detailed list of untranslated item IDs grouped by language
- Overall translation completion across all languages

**What counts as "untranslated":**
- Empty strings (`""`)
- Keys that exist in the reference language but are missing in target languages

The stats command uses the first language in your `languageCodes` array as the reference/baseline for comparison.

### `contentstorage --help`

Show all available commands and options

```bash
npx contentstorage --help
npx contentstorage pull --help
npx contentstorage generate-types --help
npx contentstorage stats --help
```

## Configuration

### Configuration File (`contentstorage.config.js`)

```javascript
export default {
  // Authentication Option A: Content Key (read-only)
  // Format: teamId/projectId
  contentKey: 'your-team-id/your-project-id',

  // Authentication Option B: API Key (read + write)
  // Create in Project Settings → API Keys
  // apiKey: 'csk_xxxxxxxx_xxxxxxxxxxxxxxxxxxxxxxxx',
  // projectId: 'your-project-uuid',

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

### Authentication Methods

| Method | Access Level | Use Case |
|--------|-------------|----------|
| `contentKey` | Read-only | Pull content, view stats |
| `apiKey` + `projectId` | Read + Write | Pull, push, CI/CD pipelines |

**Getting your credentials:**
- **Content Key**: Found in Project Settings → General (format: `teamId/projectId`)
- **API Key**: Create in Project Settings → API Keys

### Supported Languages

The CLI supports 40+ languages including:
EN, FR, DE, ES, IT, PT, NL, PL, RU, TR, SV, NO, DA, FI, CS, SK, HU, RO, BG, HR, SL, SR, and more.

## Integration Options

### Option 1: Use with i18n Libraries (Recommended for most projects)

For standard i18n needs, use Contentstorage CLI with popular i18n libraries:

- **[@contentstorage/plugin-i18next](https://www.npmjs.com/package/@contentstorage/plugin-i18next)** - i18next integration
- **[@contentstorage/plugin-react-intl](https://www.npmjs.com/package/@contentstorage/plugin-react-intl)** - react-intl (FormatJS) integration
- **[@contentstorage/plugin-vue-i18n](https://www.npmjs.com/package/@contentstorage/plugin-vue-i18n)** - Vue i18n integration

### Option 2: Use with Contentstorage SDK (Advanced features)

If you need advanced features like variations (A/B testing) and image management:

```bash
npm install @contentstorage/sdk
```

See [@contentstorage/sdk](https://www.npmjs.com/package/@contentstorage/sdk) for documentation on:
- Content variations (A/B testing)
- Image management with CDN URLs
- Live editor integration
- Runtime content fetching

## TypeScript Support

After running `generate-types`, you get full TypeScript support:

```typescript
// Generated types augment the ContentStructure interface
import type { ContentStructure } from '@contentstorage/core';

// Use with your i18n library
import i18next from 'i18next';

// TypeScript knows all available content paths
i18next.t('HomePage.title'); // ✅ Autocomplete works
i18next.t('Invalid.path');   // ❌ TypeScript error
```

## Content Structure

Content is organized in a hierarchical key-value structure:

```json
{
  "HomePage": {
    "title": "Welcome to Our App",
    "greeting": "Hello {name}, you have {count} items",
    "description": "Get started with our platform"
  },
  "Navigation": {
    "home": "Home",
    "about": "About",
    "contact": "Contact"
  }
}
```

**Access with dot notation:**
- `HomePage.title` → "Welcome to Our App"
- `HomePage.greeting` → "Hello {name}, you have {count} items"
- `Navigation.home` → "Home"

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

## Workflow Example

1. **Pull latest content:**
   ```bash
   npx contentstorage pull
   ```

2. **Generate TypeScript types:**
   ```bash
   npx contentstorage generate-types
   ```

3. **Use in your app with i18next:**
   ```typescript
   import i18next from 'i18next';
   import enContent from './content/json/EN.json';

   i18next.init({
     lng: 'EN',
     resources: {
       EN: { translation: enContent }
     }
   });

   // Use translations
   const title = i18next.t('HomePage.title');
   ```

## SDK Extract

The `/sdk-extract` folder contains the Contentstorage SDK code ready to be moved to a separate repository. This SDK provides runtime features like:
- getText/getImage/getVariation functions
- Content variations (A/B testing)
- Image management
- Live editor integration

To use the SDK, it will be published as `@contentstorage/sdk` in a separate package.

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
