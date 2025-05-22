import { AppConfig, LanguageCode, ContentStructure } from './types.js';

import {
  setContentLanguage,
  getText,
  getImage,
  getVariation,
} from './lib/contentManagement.js';

export { AppConfig, LanguageCode, ContentStructure };
export { setContentLanguage, getText, getImage, getVariation };

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

  // fetch script to handle iframe communication
});
