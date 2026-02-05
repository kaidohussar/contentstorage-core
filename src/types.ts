export type AppConfig = {
  languageCodes: LanguageCode[];
  contentKey: string;
  contentDir: string;
  typesOutputFile: string;
  pendingChanges?: boolean;
  flatten?: boolean;
  // New API key authentication (preferred over contentKey)
  apiKey?: string;
  projectId?: string;
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
 */

// eslint-disable-next-line
export interface ContentStructure {
  // Intentionally empty, or with only truly optional, non-conflicting base properties.
  // Avoid index signatures like [key: string]: any; if you want augmentation
  // to strictly define the keys for `keyof` purposes.
}
