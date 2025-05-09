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

type MaxPathDepth = [any, any, any, any, any, any]; // Example: Max depth of 6

/**
 * Generates a union of all possible dot-notation path strings for a given object type `T`,
 * with a limit on recursion depth to prevent TypeScript errors.
 * Defaults to using the `CustomContentStructure` interface, which consumers augment.
 *
 * @template T The object type to generate paths from.
 * @template Prefix Internal accumulator for the current path prefix.
 * @template CurrentDepth Internal tuple to track recursion depth.
 */
export type DotNotationPaths<
  T = ContentStructure,
  Prefix extends string = '',
  CurrentDepth extends any[] = [], // Tracks current recursion depth
> = T extends object // Only proceed if T is an object
  ? {
      // Iterate over keys of T that are strings or numbers
      [K in keyof T &
        (
          | string
          | number
        )]-?: CurrentDepth['length'] extends MaxPathDepth['length'] // Check if current depth has reached the maximum
        ? `${Prefix}${K}` // At max depth: form the path to this key and stop recursing for T[K]
        : T[K] extends object // If NOT at max depth AND the property T[K] is an object
          ? // Path to the current key (e.g., "HomePage")
            // AND recurse into T[K] for deeper paths (e.g., "HomePage.Title")
            | `${Prefix}${K}`
              | DotNotationPaths<T[K], `${Prefix}${K}.`, [...CurrentDepth, any]>
          : // Not at max depth, and T[K] is NOT an object (it's a leaf value for this path segment)
            `${Prefix}${K}`;
    }[keyof T & (string | number)] // Ensure we only operate on valid key types for path segments
  : never; // T is not an object, so no paths can be generated from this branch (or depth limit effectively stops it)
