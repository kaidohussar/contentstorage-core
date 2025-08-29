import axios from 'axios';
import { CONTENTSTORAGE_CONFIG } from '../../contentstorage-config.js';
import { LanguageCode } from '../../types.js';
import { appConfig, setContentLanguage } from '../contentManagement.js';

interface FetchContentOptions {
  withPendingChanges?: boolean;
  contentKey?: string;
}

export async function fetchContent(
  language?: LanguageCode,
  options: FetchContentOptions = {}
) {
  const { withPendingChanges, contentKey } = options;
  const languageToFetch = language || appConfig?.languageCodes?.[0];
  const usePendingChangesToFetch =
    withPendingChanges || appConfig?.pendingChanges;

  console.log(`Starting content fetch for language ${language}...`);

  if (!languageToFetch) {
    throw Error(`No language found`);
  }

  if (!appConfig) {
    throw Error(`No app config found`);
  }

  const effectiveContentKey = contentKey || appConfig.contentKey;

  let fileUrl: string;
  let requestConfig: any = {};

  if (usePendingChangesToFetch) {
    if (!effectiveContentKey) {
      throw Error(`No contentKey found`);
    }

    fileUrl = `${CONTENTSTORAGE_CONFIG.API_URL}/pending-changes/get-json?languageCode=${languageToFetch}`;
    requestConfig.headers = {
      'X-Content-Key': effectiveContentKey,
    };
  } else {
    fileUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/${effectiveContentKey}/content/${languageToFetch}.json`;
  }

  try {
    // Fetch data for the current language
    const response = await axios.get(fileUrl, requestConfig);
    let jsonData = response.data;

    // Handle API response structure - only for pending changes API
    if (usePendingChangesToFetch && jsonData && typeof jsonData === 'object' && 'data' in jsonData) {
      jsonData = jsonData.data;
    }

    if (jsonData === undefined || jsonData === null) {
      throw new Error(
        `No data received from ${fileUrl} for language ${languageToFetch}.`
      );
    }

    // Validate that jsonData is a single, non-null JSON object (not an array)
    // This check mirrors the original code's expectation for the content of a JSON file.
    if (typeof jsonData !== 'object') {
      throw new Error(
        `Expected a single JSON object from ${fileUrl} for language ${languageToFetch}, but received type ${typeof jsonData}. Cannot proceed.`
      );
    }

    console.log(`Received JSON for ${languageToFetch}`);

    setContentLanguage({
      languageCode: languageToFetch,
      contentJson: jsonData,
    });
  } catch (error: any) {
    // Catch errors related to fetching or saving a single language file
    console.error(
      `\nError processing language ${languageToFetch} from ${fileUrl}:`
    );
    if (axios.isAxiosError(error)) {
      console.error(`  Status: ${error.response?.status}`);
      console.error(
        `Response Data: ${error.response?.data ? JSON.stringify(error.response.data) : 'N/A'}`
      );
      console.error(`  Message: ${error.message}`); // Axios error message
    } else {
      // For non-Axios errors (e.g., manually thrown errors, fs errors)
      console.error(`  Error: ${error.message}`);
    }
  }
}
