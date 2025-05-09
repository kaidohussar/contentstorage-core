export type AppConfig = {
  languageCodes: LanguageCode[];
  contentUrl: string;
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
export interface ContentStructure {
  // This acts as a placeholder. For the library's own compilation,
  // it can be a very generic type like `[key: string]: any;` or empty.
  // The consumer's augmentation will provide the actual structure.
  [key: string]: any;
}

/**
 * Generates a union of all possible dot-notation path strings for a given object type `T`.
 * Defaults to using the `ContentStructure` interface, which consumers augment.
 *
 * @template T The object type to generate paths from. Defaults to `ContentStructure`.
 * @template Prefix Internal accumulator for the current path prefix during recursion.
 */
export type DotNotationPaths<
  T = ContentStructure,
  Prefix extends string = '',
> = T extends object
  ? {
      [K in keyof T]-?: K extends string | number // Ensure key can be part of a path
        ? T[K] extends object // If property is an object, recurse
          ? `${Prefix}${K}` | DotNotationPaths<T[K], `${Prefix}${K}.`>
          : `${Prefix}${K}` // If property is not an object, it's a leaf path
        : never; // Key is not string/number (e.g., symbol), ignore
    }[keyof T]
  : ''; // T is not an object
