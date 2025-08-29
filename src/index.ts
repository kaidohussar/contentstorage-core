import { AppConfig, LanguageCode, ContentStructure } from './types.js';
import { CONTENTSTORAGE_CONFIG } from './contentstorage-config.js';

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
  liveEditorReady,
};

let liveEditorReadyPromise: Promise<boolean> | null = null;

async function isLiveEditorMode() {
  try {
    const inIframe = window.self !== window.top;
    const urlParams = new URLSearchParams(window.location.search);
    const iframeMarkerFromParent = urlParams.get('contentstorage_live_editor');
    return !!(inIframe && iframeMarkerFromParent);
  } catch (e) {
    console.warn('Error accessing window.top:', e);
    return false;
  }
}

function liveEditorReady(retries = 2, delay = 3000): Promise<boolean> {
  if (liveEditorReadyPromise) {
    return liveEditorReadyPromise;
  }

  liveEditorReadyPromise = new Promise(async (resolve) => {
    const isLiveMode = await isLiveEditorMode();
    if (!isLiveMode) {
      resolve(false);
      return;
    }

    const cdnScriptUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/live-editor.js?contentstorage-live-editor=true`;

    const loadScript = (attempt = 1) => {
      console.log(
        `Attempting to load Contentstorage live editor script (attempt ${attempt}/${retries})`
      );

      const scriptElement = document.createElement('script');
      scriptElement.type = 'text/javascript';
      scriptElement.src = cdnScriptUrl;

      scriptElement.onload = () => {
        console.log(`Script loaded successfully from: ${cdnScriptUrl}`);
        resolve(true);
      };

      scriptElement.onerror = (error) => {
        // Clean up the failed script element to avoid clutter
        scriptElement.remove();
        console.error(
          `Failed to load script (attempt ${attempt}/${retries})`,
          error
        );
        if (attempt < retries) {
          setTimeout(() => loadScript(attempt + 1), delay);
        } else {
          console.error(`All ${retries} attempts to load the script failed.`);
          resolve(false);
        }
      };

      document.head.appendChild(scriptElement);
    };

    loadScript();
  });

  return liveEditorReadyPromise;
}

if (typeof window !== 'undefined') {
  liveEditorReady().then((result) => {
    if (result === true) {
      console.log('Contentstorage live editor script loaded!');
    }
  });
}
