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

async function isLiveEditorMode() {
  try {
    const inIframe = window.self !== window.top;
    const urlParams = new URLSearchParams(window.location.search);
    const iframeMarkerFromParent = urlParams.get('contentstorage_live_editor');
    return !!(inIframe && iframeMarkerFromParent);
  } catch (e) {
    // This catch block is for rare edge cases or highly sandboxed environments
    // where accessing window.top might throw an error.
    // If an error occurs, it's safer to assume it might be in an iframe.
    console.warn('Error accessing window.top, assuming iframe context:', e);
    return false;
  }
}

isLiveEditorMode().then(async (isLiveMode) => {
  if (!isLiveMode) {
    return;
  }

  const cdnScriptUrl = `https://your-cdn-domain.com/contentstorage-live-editor.js?contentstorage-live-editor=true`;

  return new Promise((resolve, reject) => {
    console.log(`Attempting to load script from: ${cdnScriptUrl}`);

    // 1. Create a new <script> element
    const scriptElement = document.createElement('script');
    scriptElement.type = 'text/javascript';

    // 2. Set the src attribute to your script's URL
    // The browser will fetch and execute it.
    scriptElement.src = cdnScriptUrl;

    // 3. Handle successful loading
    scriptElement.onload = () => {
      console.log(`Script loaded successfully from: ${cdnScriptUrl}`);
      // The script has been fetched and executed by the browser.
      // If it's an IIFE, it has already run.
      resolve(true); // Resolve the promise indicating success
    };

    // 4. Handle errors during loading (e.g., network error, 404)
    scriptElement.onerror = (error) => {
      console.error(`Failed to load script from: ${cdnScriptUrl}`, error);
      reject(new Error(`Failed to load script: ${cdnScriptUrl}`)); // Reject the promise
    };

    // 5. Append the script element to the document's head (or body)
    // This triggers the browser to start loading the script.
    document.head.appendChild(scriptElement);
    // Or: document.body.appendChild(scriptElement);
  });

  // fetch script to handle iframe communication
});
