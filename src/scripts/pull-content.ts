#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../lib/configLoader.js';

export async function pullContent() {
  console.log(chalk.blue('Starting content pull...'));

  const config = loadConfig();

  console.log(chalk.gray(`Getting content from: ${config.contentUrl}`));
  console.log(chalk.gray(`Saving content to: ${config.contentDir}`));

  try {
    // Fetch data
    const response = await axios.get(config.contentUrl);
    const jsonData = response.data; // Assume axios parses JSON automatically

    if (!jsonData) {
      throw new Error('No data received from the URL.');
    }

    // Ensure the output directory exists
    await fs.mkdir(config.contentDir, { recursive: true });

    // --- How to save the data? ---
    // Option 1: Save the entire response as one file (e.g., content.json)
    // const outputPath = path.join(config.contentDir, 'content.json');
    // await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2));
    // console.log(chalk.green(`Content saved successfully to ${outputPath}`));

    // Option 2: Assume the response is an ARRAY of objects, save each as a separate file
    // This matches the requirement "use the first file from the directory" later
    if (!Array.isArray(jsonData)) {
      throw new Error(
        `Expected an array of objects from ${config.contentUrl}, but received type ${typeof jsonData}. Cannot save individual files.`
      );
    }

    if (jsonData.length === 0) {
      console.log(chalk.yellow('Received empty array. No files to save.'));
      return;
    }

    console.log(
      chalk.gray(`Received ${jsonData.length} items. Saving individually...`)
    );

    let filesSavedCount = 0;
    for (let i = 0; i < jsonData.length; i++) {
      const item = jsonData[i];
      // Determine filename: use 'id' or 'slug' if available, otherwise use index
      const filename = `${item.id || item.slug || i}.json`;
      const outputPath = path.join(config.contentDir, filename);

      try {
        await fs.writeFile(outputPath, JSON.stringify(item, null, 2));
        filesSavedCount++;
      } catch (writeError: any) {
        console.error(
          chalk.red(`Error saving file ${filename}:`),
          writeError.message
        );
        // Optionally decide whether to continue or stop on error
      }
    }
    console.log(
      chalk.green(
        `Successfully saved ${filesSavedCount} files to ${config.contentDir}`
      )
    );
  } catch (error: any) {
    console.error(chalk.red('Error fetching or saving content:'));
    if (axios.isAxiosError(error)) {
      console.error(chalk.red(`Status: ${error.response?.status}`));
      console.error(chalk.red(`Data: ${JSON.stringify(error.response?.data)}`));
    } else {
      console.error(chalk.red(error.message));
    }
    process.exit(1); // Exit with error code
  }
}

pullContent();
