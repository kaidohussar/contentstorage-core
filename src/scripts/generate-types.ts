#!/usr/bin/env node
// ^ Shebang ensures the script is executed with Node.js

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import jsonToTS from 'json-to-ts'; // Import the library
import chalk from 'chalk'; // Optional: for colored output
import { loadConfig } from '../lib/configLoader.js';
import { flattenJson } from '../helpers/flattenJson.js';

export async function generateTypes() {
  console.log(chalk.blue('Starting type generation...'));

  const config = await loadConfig();

  if (!config.typesOutputFile) {
    console.error(
      chalk.red.bold("Configuration error: 'typesOutputFile' is missing.")
    );
    process.exit(1);
  }
  if (
    !config.languageCodes ||
    !Array.isArray(config.languageCodes) ||
    config.languageCodes.length === 0
  ) {
    console.error(
      chalk.red.bold(
        "Configuration error: 'languageCodes' must be a non-empty array."
      )
    );
    process.exit(1);
  }

  console.log(
    chalk.gray(`TypeScript types will be saved to: ${config.typesOutputFile}`)
  );

  let jsonObject: any; // To hold the JSON data from either local or remote source
  let dataSourceDescription: string = ''; // For clearer logging
  const firstLanguageCode = config.languageCodes[0];

  try {
    let attemptLocalLoad = false;
    if (config.contentDir) {
      try {
        await fs.stat(config.contentDir); // Check if directory exists
        attemptLocalLoad = true;
        console.log(
          chalk.gray(`Local content directory found: ${config.contentDir}`)
        );
      } catch (statError: any) {
        if (statError.code === 'ENOENT') {
          console.log(
            chalk.yellow(
              `Local content directory specified but not found: ${config.contentDir}. Will attempt to fetch from URL.`
            )
          );
          // attemptLocalLoad remains false
        } else {
          // Other errors accessing contentDir (e.g., permissions)
          throw new Error(
            `Error accessing content directory ${config.contentDir}: ${statError.message}`
          );
        }
      }
    } else {
      console.log(
        chalk.yellow(
          `Local content directory (config.contentDir) not specified. Attempting to fetch from URL.`
        )
      );
    }

    if (attemptLocalLoad && config.contentDir) {
      // --- Load from local file system ---
      const targetFilename = `${firstLanguageCode}.json`;
      const jsonFilePath = path.join(config.contentDir, targetFilename);
      dataSourceDescription = `local file (${jsonFilePath})`;

      console.log(chalk.gray(`Attempting to read JSON from: ${jsonFilePath}`));
      try {
        const jsonContentString = await fs.readFile(jsonFilePath, 'utf-8');
        console.log(chalk.gray('Parsing JSON'));
        const parsendJsonObject = JSON.parse(jsonContentString);

        console.log(chalk.gray('Flattening JSON for type generation'));
        jsonObject = flattenJson(parsendJsonObject);

        console.log(
          chalk.green(`Successfully read and parsed JSON from ${jsonFilePath}.`)
        );
      } catch (fileError: any) {
        if (fileError.code === 'ENOENT') {
          throw new Error(
            `Target JSON file not found at ${jsonFilePath}. ` +
              `Ensure content for language code '${firstLanguageCode}' has been pulled and exists locally, ` +
              `or ensure 'contentDir' is not set if you intend to fetch from URL.`
          );
        }
        throw new Error(
          `Failed to read or parse JSON from ${jsonFilePath}: ${fileError.message}`
        );
      }
    } else {
      // --- Fetch from URL ---
      if (!config.contentUrl) {
        throw new Error(
          "Cannot generate types: 'contentDir' is not accessible or not specified, and 'contentUrl' is also missing in configuration."
        );
      }
      const fileUrl = `${config.contentUrl}/${firstLanguageCode}.json`; // Adjust URL construction if necessary
      dataSourceDescription = `remote URL (${fileUrl})`;

      console.log(chalk.gray(`Attempting to fetch JSON from: ${fileUrl}`));
      try {
        const response = await axios.get(fileUrl, { responseType: 'json' });
        const jsonResponse = response.data;

        console.log(chalk.gray('Flattening JSON for type generation'));
        jsonObject = flattenJson(jsonResponse);

        if (typeof jsonObject !== 'object' || jsonObject === null) {
          throw new Error(
            `Workspaceed data from ${fileUrl} is not a valid JSON object. Received type: ${typeof jsonObject}`
          );
        }
        console.log(
          chalk.green(
            `Successfully fetched and parsed JSON from ${fileUrl}. This content will not be saved locally.`
          )
        );
      } catch (fetchError: any) {
        let errorDetail = fetchError.message;
        if (axios.isAxiosError(fetchError)) {
          errorDetail = `Status: ${fetchError.response?.status}, Response: ${JSON.stringify(fetchError.response?.data)}`;
        }
        throw new Error(`Failed to fetch JSON from ${fileUrl}: ${errorDetail}`);
      }
    }

    // Validate the obtained jsonObject (must be an object or array for json-to-ts)
    if (typeof jsonObject !== 'object' || jsonObject === null) {
      // jsonToTS can handle root arrays too, but if it's primitive it's an issue.
      // Allowing arrays here explicitly based on jsonToTS capability.
      if (!Array.isArray(jsonObject)) {
        throw new Error(
          `The content obtained from ${dataSourceDescription} is not a JSON object or array (type: ${typeof jsonObject}). Cannot generate types.`
        );
      }
    }

    // Generate TypeScript interfaces using json-to-ts
    const rootTypeName = 'ContentRoot'; // As per your previous update
    console.log(
      chalk.gray(
        `Generating TypeScript types with root name '${rootTypeName}'...`
      )
    );

    const typeDeclarations: string[] = jsonToTS.default(jsonObject, {
      rootName: rootTypeName,
    });

    if (!typeDeclarations || typeDeclarations.length === 0) {
      throw new Error(
        `Could not generate types from the content of ${dataSourceDescription}. 'json-to-ts' returned no declarations.`
      );
    }

    const outputContent = typeDeclarations.join('\n\n');

    // Ensure the output directory exists for the types file
    const outputDir = path.dirname(config.typesOutputFile);
    await fs.mkdir(outputDir, { recursive: true });

    // Write the generated types to the output file
    await fs.writeFile(config.typesOutputFile, outputContent, 'utf-8');

    console.log(
      chalk.green(
        `TypeScript types generated successfully at ${config.typesOutputFile} using data from ${dataSourceDescription}.`
      )
    );
  } catch (error: any) {
    console.error(chalk.red.bold('\nError generating TypeScript types:'));
    console.error(chalk.red(error.message));
    // Optionally log stack for more details during development
    // if (error.stack && process.env.NODE_ENV === 'development') {
    //   console.error(chalk.gray(error.stack));
    // }
    process.exit(1);
  }
}

generateTypes();
