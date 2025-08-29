#!/usr/bin/env node
// ^ Ensures the script is executed with Node.js

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import chalk from 'chalk'; // Optional: for colored output
import { loadConfig } from '../lib/configLoader.js';
import { flattenJson } from '../helpers/flattenJson.js';
import { CONTENTSTORAGE_CONFIG } from '../contentstorage-config.js';
import { jsonToTS } from '../type-generation/index.js';
import { AppConfig } from '../types.js';

export async function generateTypes() {
  console.log(chalk.blue('Starting type generation...'));

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
        } else if (key === 'output') {
          cliConfig.typesOutputFile = value;
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
    chalk.blue(`TypeScript types will be saved to: ${config.typesOutputFile}`)
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
          chalk.blue(`Local content directory found: ${config.contentDir}`)
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

      console.log(chalk.blue(`Attempting to read JSON from: ${jsonFilePath}`));
      try {
        const jsonContentString = await fs.readFile(jsonFilePath, 'utf-8');
        console.log(chalk.blue('Parsing JSON'));
        const parsendJsonObject = JSON.parse(jsonContentString);

        console.log(chalk.blue('Flattening JSON for type generation'));
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
      if (!config.contentKey) {
        throw new Error('Cannot generate types: contentKey is missing');
      }
      
      let fileUrl: string;
      let requestConfig: any = { responseType: 'json' };
      
      if (config.pendingChanges) {
        fileUrl = `${CONTENTSTORAGE_CONFIG.API_URL}/pending-changes/get-json?languageCode=${firstLanguageCode}`;
        requestConfig.headers = {
          'X-Content-Key': config.contentKey
        };
      } else {
        fileUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/${config.contentKey}/content/${firstLanguageCode}.json`;
      }
      
      dataSourceDescription = `remote URL (${fileUrl})`;

      console.log(chalk.blue(`Attempting to fetch JSON from: ${fileUrl}`));
      try {
        const response = await axios.get(fileUrl, requestConfig);
        const jsonResponse = response.data;

        console.log(chalk.blue('Flattening JSON for type generation'));
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
    const rootTypeName = 'ContentRoot';
    console.log(
      chalk.blue(
        `Generating TypeScript types with root name '${rootTypeName}'...`
      )
    );

    const typeDeclarations: string[] = jsonToTS(jsonObject, {
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
    process.exit(1);
  }
}

generateTypes();
