import { AppConfig, LanguageCode, ContentStructure } from './types.js';

import {
  setContentLanguage,
  getText,
  getImage,
  getVariation,
  initContentStorage,
} from './lib/contentManagement.js';

import { fetchContent } from './lib/functions/fetchContent.js';

export { AppConfig, LanguageCode, ContentStructure };
export {
  initContentStorage,
  fetchContent,
  setContentLanguage,
  getText,
  getImage,
  getVariation,
};
