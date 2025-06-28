import { LanguageCode } from './types.js';

declare global {
  interface Window {
    memoryMap: Map<
      string,
      {
        ids: Set<string>;
        type: 'text' | 'image' | 'variation';
        variation?: string;
      }
    >;
    currentLanguageCode: LanguageCode | null;
  }
}

// This export is needed to make the file a module
export {};
