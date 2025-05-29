import {
  AppConfig,
  ContentStructure,
  GetImageReturn,
  GetTextReturn,
  GetVariationReturn,
  VariationObject,
} from '../types.js';
import { populateTextWithVariables } from '../helpers/populateTextWithVariables.js';

export let activeContent: object | null = null;
export let appConfig: AppConfig | null = null;

/**
 * Loads and sets the content for a specific language.
 * It will internally ensure the application configuration (for contentDir) is loaded.
 * @param contentJson
 */
export function setContentLanguage(contentJson: object) {
  if (!contentJson || typeof contentJson !== 'object') {
    throw new Error(
      '[Contentstorage] Invalid contentKey might be provided which caused setContentLanguage to fail.'
    );
  }

  try {
    activeContent = contentJson; // Relies on augmentation
    console.log(`[Contentstorage] Content loaded.`);
  } catch (error) {
    activeContent = null; // Reset on failure
    console.error(
      `[Contentstorage] Failed to load content. Error: ${(error as Error).message}`
    );
  }
}

export function initContentStorage(config: AppConfig) {
  if (
    !config ||
    typeof config !== 'object' ||
    !config.contentKey ||
    !Array.isArray(config.languageCodes)
  ) {
    if (!config.contentKey) {
      throw new Error(
        '[Contentstorage] No contentKey provided in initContentStorage function.'
      );
    }

    if (!Array.isArray(config.languageCodes)) {
      throw new Error(
        '[Contentstorage] No languageCodes provided in initContentStorage function.'
      );
    }

    throw new Error('[Contentstorage] Invalid config.');
  }

  appConfig = config;
}

/**
 * Retrieves the text string from the loaded JSON content for the given path.
 * Autocompletion for pathString is enabled via module augmentation of CustomContentStructure.
 * `setContentLanguage()` must be called successfully before using this.
 *
 * @param contentKey A dot-notation path string (e.g., 'HomePage.Login'). Autocompletion is provided.
 * @param variables Variables help to render dynamic content inside text strings
 * If not provided, and path is not found/value not string, undefined is returned.
 * @returns The text string from the JSON, or the fallbackValue, or undefined.
 */
export function getText<Path extends keyof ContentStructure>(
  contentKey: Path,
  variables?: ContentStructure[Path] extends { variables: infer Vars }
    ? keyof Vars
    : Record<string, any>
): GetTextReturn {
  const defaultVal: GetTextReturn = {
    contentKey,
    text: '',
  };

  if (!activeContent) {
    const msg = `[Contentstorage] getText: Content not loaded (Key: "${String(contentKey)}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return defaultVal;
  }

  const keys = (contentKey as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getText: Path "${String(contentKey)}" not found in loaded content.`;
      console.warn(msg);
      return defaultVal;
    }
  }

  if (typeof current === 'string') {
    if (!variables || Object.keys(variables).length === 0) {
      return {
        contentKey,
        text: current,
      };
    }

    return {
      contentKey,
      text: populateTextWithVariables(current, variables, contentKey),
    };
  } else {
    const msg = `[Contentstorage] getText: Value at path "${String(contentKey)}" is not a string (actual type: ${typeof current}).`;
    console.warn(msg);
    return defaultVal;
  }
}

export function getImage(
  contentKey: keyof ContentStructure
): GetImageReturn | undefined {
  const defaultVal = {
    contentKey,
    data: { url: '', altText: '', contentstorage_type: 'image' },
  } as const;

  if (!activeContent) {
    const msg = `[Contentstorage] getImage: Content not loaded (Key: "${contentKey}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return {
      contentKey,
      data: { url: '', altText: '', contentstorage_type: 'image' },
    };
  }

  const keys = (contentKey as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getImage: Path "${contentKey}" not found in loaded content.`;
      console.warn(msg);
      return defaultVal;
    }
  }

  if (
    current &&
    typeof current === 'object' &&
    current.contentstorage_type === 'image' &&
    typeof current.url === 'string'
  ) {
    return {
      contentKey,
      data: current,
    };
  } else {
    const msg = `[Contentstorage] getImage: Value at path "${contentKey}" is not a valid image object (actual value: ${JSON.stringify(current)}).`;
    console.warn(msg);
    return defaultVal;
  }
}

export function getVariation<Path extends keyof ContentStructure>(
  contentKey: Path,
  variationKey?: ContentStructure[Path] extends { data: infer D }
    ? keyof D
    : string,
  variables?: Record<string, any>
): GetVariationReturn {
  const defaultVal: GetVariationReturn = {
    contentKey,
    text: '',
  };

  if (!activeContent) {
    const msg = `[Contentstorage] getVariation: Content not loaded (Key: "${contentKey}", Variation: "${variationKey?.toString()}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return defaultVal;
  }

  const keys = (contentKey as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getVariation: Path "${contentKey}" for variation object not found in loaded content.`;
      console.warn(msg);
      return defaultVal;
    }
  }

  if (
    current &&
    typeof current === 'object' &&
    current.contentstorage_type === 'variation' &&
    typeof current.data === 'object' &&
    current.data !== null
  ) {
    const variationObject = current as VariationObject;

    if (
      variationKey &&
      typeof variationKey === 'string' &&
      variationKey in variationObject.data
    ) {
      if (typeof variationObject.data[variationKey] === 'string') {
        const current = variationObject.data[variationKey];

        if (!variables || Object.keys(variables).length === 0) {
          return {
            contentKey,
            text: current,
          };
        }

        return {
          contentKey,
          text: populateTextWithVariables(current, variables, contentKey),
        };
      } else {
        const msg = `[Contentstorage] getVariation: Variation value for key "${variationKey}" at path "${contentKey}" is not a string (actual type: ${typeof variationObject.data[variationKey]}).`;
        console.warn(msg);
      }
    }

    // If specific variationKey is not found or not provided, try to return the 'default' variation
    if ('default' in variationObject.data && typeof variationKey === 'string') {
      if (typeof variationObject.data.default === 'string') {
        if (variationKey && variationKey !== 'default') {
          console.warn(
            `[Contentstorage] getVariation: Variation key "${variationKey}" not found at path "${contentKey}". Returning 'default' variation.`
          );
        }
        return {
          contentKey,
          text: variationObject.data.default,
        };
      } else {
        console.warn(
          `[Contentstorage] getVariation: 'default' variation value at path "${contentKey}" is not a string (actual type: ${typeof variationObject.data.default}).`
        );
      }
    }

    // If neither specific key nor 'default' is found or valid
    console.warn(
      `[Contentstorage] getVariation: Neither variation key "${variationKey?.toString()}" nor 'default' variation found or valid at path "${contentKey}".`
    );
    return defaultVal;
  } else {
    console.warn(
      `[Contentstorage] getVariation: Value at path "${contentKey}" is not a valid variation object (actual value: ${JSON.stringify(current)}).`
    );
    return defaultVal;
  }
}
