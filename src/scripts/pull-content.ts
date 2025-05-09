#!/usr/bin/env node

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../lib/configLoader.js';

export async function pullContent() {
  console.log(chalk.blue('Starting content pull...'));

  const config = await loadConfig();

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

    // Check if jsonData is a single, non-null object (and not an array)
    if (typeof jsonData !== 'object' || Array.isArray(jsonData)) {
      console.log(
        chalk.red(
          `Expected a single JSON object from ${config.contentUrl}, but received type ${
            Array.isArray(jsonData) ? 'array' : typeof jsonData
          }. Cannot save the file.`
        )
      );
      return;
    }

    console.log(
      chalk.green(`Received JSON. Saving it to ${config.contentDir}`)
    );

    // Determine filename for the single object.
    // Use 'id' or 'slug' from the object if available, otherwise use 'data' as a fallback base name.
    const objectData = jsonData as any; // Use type assertion to access potential properties
    const baseFilename = objectData.id || objectData.slug || 'data';
    const filename = `${baseFilename}.json`;
    const outputPath = path.join(config.contentDir, filename);

    console.log(
      chalk.gray(
        `Received a single JSON object. Attempting to save as ${filename}...`
      )
    );

    try {
      // Ensure the output directory exists
      await fs.mkdir(config.contentDir, { recursive: true });

      // Write the single JSON object to the file
      await fs.writeFile(outputPath, JSON.stringify(jsonData, null, 2));
      console.log(
        chalk.green(`Successfully saved the object to ${outputPath}`)
      );
    } catch (error: any) {
      console.error(chalk.red('Error fetching or saving content:'));
      if (axios.isAxiosError(error)) {
        console.error(chalk.red(`Status: ${error.response?.status}`));
        console.error(
          chalk.red(`Data: ${JSON.stringify(error.response?.data)}`)
        );
      } else {
        console.error(chalk.red(error.message));
      }
      process.exit(1); // Exit with error code
    }
  } catch (error: any) {
    console.error(chalk.red(error.message));
    process.exit(1); // Exit with error code
  }
}

pullContent();
