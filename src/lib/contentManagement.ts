import { ContentStructure } from '../types.js';

let activeContent: object | null = null;

/**
 * Loads and sets the content for a specific language.
 * It will internally ensure the application configuration (for contentDir) is loaded.
 * @param languageCode The language code (e.g., 'EN', 'FR') for the JSON file to load.
 */
export function setContentLanguage(contentJson: object) {
  if (!contentJson || typeof contentJson !== 'object') {
    throw new Error(
      '[Contentstorage] Invalid contentUrl provided to setContentLanguage.'
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

/**
 * Retrieves the text string from the loaded JSON content for the given path.
 * Autocompletion for pathString is enabled via module augmentation of CustomContentStructure.
 * `setContentLanguage()` must be called successfully before using this.
 *
 * @param pathString A dot-notation path string (e.g., 'HomePage.Login'). Autocompletion is provided.
 * @param fallbackValue Optional string to return if the path is not found or the value is not a string.
 * If not provided, and path is not found/value not string, undefined is returned.
 * @returns The text string from the JSON, or the fallbackValue, or undefined.
 */
export function getText(
  // The pathString is now a direct key of your (flattened) content structure.
  // TypeScript will provide autocompletion for these keys.
  pathString: keyof ContentStructure,
  fallbackValue?: string
): string | undefined {
  if (!activeContent) {
    const msg = `[Contentstorage] getText: Content not loaded (Key: "${String(pathString)}"). Ensure setContentLanguage() was called and completed successfully.`;
    console.warn(msg);
    return fallbackValue;
  }

  const keys = (pathString as string).split('.');
  let current: any = activeContent;

  for (const key of keys) {
    if (current && typeof current === 'object' && key in current) {
      current = current[key];
    } else {
      const msg = `[Contentstorage] getText: Path "${String(pathString)}" not found in loaded content.`;
      console.warn(msg);
      return fallbackValue;
    }
  }

  if (typeof current === 'string') {
    return current;
  } else {
    const msg = `[Contentstorage] getText: Value at path "${String(pathString)}" is not a string (actual type: ${typeof current}).`;
    console.warn(msg);
    return fallbackValue;
  }
}

// Ensure getText and potentially ContentStructure are imported or available in the scope.
// For this example, let's assume they are, along with activeContent.
// import { getText, ContentStructure, activeContent } from './contentStorage'; // Adjust path as needed

// Placeholder for ContentStructure if not already globally available for the cast
// This would ideally be the same ContentStructure interface your getText function uses.


export class CsText extends HTMLElement {
  private _id: string | null = null;
  private _keyForGetText: keyof ContentStructure | undefined;

  static get observedAttributes() {
    // Define which attributes to observe for changes.
    return ['data-contentstorage-id'];
  }

  constructor() {
    super();
    // You can attach a Shadow DOM here if you need style encapsulation:
    // this.attachShadow({ mode: 'open' });
    // For simplicity, this example will manipulate the light DOM (this.textContent).
  }

  connectedCallback() {
    // Called when the element is added to the document's DOM.
    this.upgradeProperties();
    this.updateText();
  }

  disconnectedCallback() {
    // Called when the element is removed from the document's DOM.
    // Perform any necessary cleanup here (e.g., remove event listeners if any were added).
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null) {
    // Called when one of the observed attributes changes.
    let shouldUpdate = false;
    if (name === 'data-contentstorage-id' && oldValue !== newValue) {
      this._id = newValue;
      // Important: The string from the attribute needs to be treated as keyof ContentStructure.
      // This cast assumes the provided ID string is a valid key.
      // Runtime validation against available keys in `activeContent` could be added for robustness.
      this._keyForGetText = newValue as keyof ContentStructure;
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      this.updateText();
    }
  }

  // Property getters/setters (optional, but good practice if you want to interact via JS properties)
  get idKey(): string | null {
    return this._id;
  }

  set idKey(value: string | null) {
    this._id = value;
    this._keyForGetText = value as keyof ContentStructure; // Cast here as well
    if (value === null) {
      this.removeAttribute('data-contentstorage-id');
    } else {
      this.setAttribute('data-contentstorage-id', value);
    }
    // Note: setAttribute will trigger attributeChangedCallback if observed.
  }

  /**
   * Handles cases where properties might be set on the element before it's upgraded.
   * Ensures initial attribute values are processed.
   */
  private upgradeProperties() {
    // Check if properties were set before upgrade by checking attributes.
    if (!this._id && this.hasAttribute('data-contentstorage-id')) {
      this._id = this.getAttribute('data-contentstorage-id');
      this._keyForGetText = this._id as keyof ContentStructure;
    }
  }

  private updateText(): void {
    if (!this.isConnected) {
      // Don't try to update if the element isn't in the DOM.
      return;
    }

    if (this._keyForGetText) {
      const textValue = getText(this._keyForGetText);
      this.textContent = textValue !== undefined ? textValue : '';
    } else {
      // No ID provided.
      this.textContent = '';
    }
  }
}

// Define the custom element for the browser to use.
// Ensure this is called only once.
if (typeof window !== 'undefined' && !customElements.get('cs-text')) {
  customElements.define('cs-text', CsText);
}
