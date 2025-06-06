export type AppConfig = {
  languageCodes: LanguageCode[];
  contentKey: string;
  contentDir: string;
  typesOutputFile: string;
};

export type LanguageCode =
  | 'SQ'
  | 'BE'
  | 'BS'
  | 'BG'
  | 'HR'
  | 'CS'
  | 'DA'
  | 'NL'
  | 'EN'
  | 'ET'
  | 'FI'
  | 'FR'
  | 'DE'
  | 'EL'
  | 'HU'
  | 'GA'
  | 'IT'
  | 'LV'
  | 'LT'
  | 'MK'
  | 'NO'
  | 'PL'
  | 'PT'
  | 'RO'
  | 'RU'
  | 'SR'
  | 'SK'
  | 'SL'
  | 'ES'
  | 'SV'
  | 'TR'
  | 'UK';

/**
 * This interface is intended to be augmented by the consumer application.
 * By augmenting this interface with their specific RootContentItem type,
 * consumers enable type-safe autocompletion for localization path strings
 * used with functions like `getText`.
 *
 * @example
 * // In consumer's project (e.g., in a .d.ts file):
 * import 'your-library-name'; // Your library's package name
 * import type { RootContentItem as AppSpecificRootItem } from './generated_content_types';
 *
 * declare module 'your-library-name' {
 * export interface ContentStructure extends AppSpecificRootItem {}
 * }
 */

// eslint-disable-next-line
export interface ContentStructure {
  // Intentionally empty, or with only truly optional, non-conflicting base properties.
  // Avoid index signatures like [key: string]: any; if you want augmentation
  // to strictly define the keys for `keyof` purposes.
}

export type GetTextReturn = {
  contentKey: string;
  text: string;
};

export type GetImageReturn = {
  contentKey: string;
  data: ImageObject;
};

export type GetVariationReturn = {
  contentKey: string;
  text: string;
};

export interface ImageObject {
  contentstorage_type: 'image';
  url: string;
  altText: string;
}

// Define the structure for a variation object
export interface VariationData {
  [key: string]: string; // Allows for 'default' and other variation keys
}

export interface VariationObject {
  contentstorage_type: 'variation';
  data: VariationData;
}
