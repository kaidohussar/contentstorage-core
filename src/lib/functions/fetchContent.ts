import axios from 'axios';
import { CONTENTSTORAGE_CONFIG } from '../../contentstorage-config.js';
import { LanguageCode } from '../../types.js';
import { appConfig, setContentLanguage } from '../contentManagement.js';

export async function fetchContent(language?: LanguageCode) {
  const languageToFetch = language || appConfig?.languageCodes?.[0];

  console.log(`Starting content fetch for language ${language}...`);

  if (!languageToFetch) {
    throw Error(`No language found`);
  }

  if (!appConfig) {
    throw Error(`No app config found`);
  }

  const fileUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/${appConfig.contentKey}/content/${languageToFetch}.json`;

  try {
    // Fetch data for the current language
    const response = await axios.get(fileUrl);
    const jsonData = response.data;

    // Basic check for data existence, although axios usually throws for non-2xx responses
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

    setContentLanguage(jsonData);
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
