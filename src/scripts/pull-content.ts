#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../lib/configLoader.js';
import { CONTENTSTORAGE_CONFIG } from '../contentstorage-config.js';

export async function pullContent() {
  console.log(chalk.blue('Starting content pull...'));

  // Load configuration (assuming this function is defined elsewhere and works)
  const config = await loadConfig();

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
      const fileUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/${config.contentKey}/content/${languageCode}.json`;
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
        const response = await axios.get(fileUrl);
        const jsonData = response.data;

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
            `Received and json for ${languageCode}. Saving to ${outputPath}`
          )
        );

        await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2));
        console.log(chalk.green(`Successfully saved ${outputPath}`));

        console.log(
          chalk.green(
            `Received JSON for ${languageCode}. Saving to ${outputPath}`
          )
        );

        // Write the JSON data to the file
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

pullContent();
