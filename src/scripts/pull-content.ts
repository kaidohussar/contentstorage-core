#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../lib/configLoader.js';
import { CONTENTSTORAGE_CONFIG } from '../contentstorage-config.js';
import { AppConfig } from '../types.js';

export async function pullContent() {
  console.log(chalk.blue('Starting content pull...'));

  const args = process.argv.slice(2);
  const cliConfig: { [key: string]: any } = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];
      if (key === 'pending-changes') {
        cliConfig.pendingChanges = true;
      } else if (value && !value.startsWith('--')) {
        if (key === 'lang') {
          cliConfig.languageCodes = [value.toUpperCase()];
        } else if (key === 'content-key') {
          cliConfig.contentKey = value;
        } else if (key === 'content-dir') {
          cliConfig.contentDir = value;
        }
        // Skip the value in the next iteration
        i++;
      }
    }
  }

  let fileConfig = {};
  try {
    fileConfig = await loadConfig();
  } catch {
    console.log(
      chalk.yellow(
        'Could not load a configuration file. Proceeding with CLI arguments.'
      )
    );
  }
  const config = { ...fileConfig, ...cliConfig } as Partial<AppConfig>;

  // Validate required fields
  if (!config.contentKey) {
    console.error(
      chalk.red(
        'Error: Configuration is missing the required "contentKey" property.'
      )
    );
    process.exit(1);
  }

  if (!config.contentDir) {
    console.error(
      chalk.red(
        'Error: Configuration is missing the required "contentDir" property.'
      )
    );
    process.exit(1);
  }

  console.log(chalk.blue(`Content key: ${config.contentKey}`));
  console.log(chalk.blue(`Saving content to: ${config.contentDir}`));

  try {
    // Validate languageCodes array
    if (!Array.isArray(config.languageCodes)) {
      console.log(
        chalk.red(
          `Expected array from config.languageCodes, but received type ${typeof config.languageCodes}. Cannot pull files.`
        )
      );
      return; // Exit if languageCodes is not an array
    }

    if (config.languageCodes.length === 0) {
      console.log(
        chalk.yellow('config.languageCodes array is empty. No files to pull.')
      );
      return; // Exit if languageCodes array is empty
    }

    // Ensure the output directory exists (create it once before the loop)
    await fs.mkdir(config.contentDir, { recursive: true });

    // Process each language code
    for (const languageCode of config.languageCodes) {
      let fileUrl: string;
      const requestConfig: any = {};
      
      if (config.pendingChanges) {
        fileUrl = `${CONTENTSTORAGE_CONFIG.API_URL}/pending-changes/get-json?languageCode=${languageCode}`;
        requestConfig.headers = {
          'X-Content-Key': config.contentKey
        };
      } else {
        fileUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/${config.contentKey}/content/${languageCode}.json`;
      }

      const filename = `${languageCode}.json`;
      const outputPath = path.join(config.contentDir, filename);

      console.log(chalk.blue(`\nProcessing language: ${languageCode}`));
      console.log(
        chalk.blue(
          `Using following contentKey to fetch json: ${config.contentKey}`
        )
      );

      try {
        // Fetch data for the current language
        const response = await axios.get(fileUrl, requestConfig);
        let jsonData = response.data;

        // Handle API response structure - only for pending changes API
        if (config.pendingChanges && jsonData && typeof jsonData === 'object' && 'data' in jsonData) {
          jsonData = jsonData.data;
        }

        // Basic check for data existence, although axios usually throws for non-2xx responses
        if (jsonData === undefined || jsonData === null) {
          throw new Error(
            `No data received from ${fileUrl} for language ${languageCode}.`
          );
        }

        // Validate that jsonData is a single, non-null JSON object (not an array)
        // This check mirrors the original code's expectation for the content of a JSON file.
        if (
          typeof jsonData !== 'object' ||
          Array.isArray(jsonData) /* jsonData === null is already covered */
        ) {
          throw new Error(
            `Expected a single JSON object from ${fileUrl} for language ${languageCode}, but received type ${
              Array.isArray(jsonData) ? 'array' : typeof jsonData
            }. Cannot save the file.`
          );
        }

        console.log(
          chalk.green(
            `Received JSON for ${languageCode}. Saving to ${outputPath}`
          )
        );

        await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2));
        console.log(chalk.green(`Successfully saved ${outputPath}`));
      } catch (error: any) {
        // Catch errors related to fetching or saving a single language file
        console.error(
          chalk.red(
            `\nError processing language ${languageCode} from ${fileUrl}:`
          )
        );
        if (axios.isAxiosError(error)) {
          console.error(chalk.red(`  Status: ${error.response?.status}`));
          console.error(
            chalk.red(
              `Response Data: ${error.response?.data ? JSON.stringify(error.response.data) : 'N/A'}`
            )
          );
          console.error(chalk.red(`  Message: ${error.message}`)); // Axios error message
        } else {
          // For non-Axios errors (e.g., manually thrown errors, fs errors)
          console.error(chalk.red(`  Error: ${error.message}`));
        }
        // Re-throw the error to be caught by the outer try-catch block,
        // which will then call process.exit(1), maintaining original exit behavior on error.
        throw error;
      }
    }

    console.log(chalk.green('\nAll content successfully pulled and saved.'));
  } catch {
    // Outer catch for setup errors (like loadConfig) or re-thrown errors from the loop
    // The specific error details for a file operation would have been logged by the inner catch.
    // This block provides a general failure message and ensures the process exits with an error code.
    console.error(
      chalk.red('\n-----------------------------------------------------')
    );
    console.error(
      chalk.red('Content pull failed due to an error. See details above.')
    );
    // error.message from the re-thrown error will be implicitly part of the error object logged by some environments,
    // or if you add console.error(error) here.
    // The original code logged error.message at this level:
    // if (error.message) console.error(chalk.red(`Underlying error: ${error.message}`));
    console.error(
      chalk.red('-----------------------------------------------------')
    );
    process.exit(1); // Exit with error code
  }
}
