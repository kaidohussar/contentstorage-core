#!/usr/bin/env node
// ^ Shebang ensures the script is executed with Node.js

import fs from 'fs/promises';
import path from 'path';
import jsonToTS from 'json-to-ts'; // Import the library
import chalk from 'chalk'; // Optional: for colored output
import { loadConfig } from '../lib/configLoader.js';

export async function generateTypes() {
  console.log(chalk.blue('Starting type generation...'));

  const config = await loadConfig(); // Ensure loadConfig provides languageCodes

  console.log(
    chalk.gray(`Content will be read from directory: ${config.contentDir}`)
  );
  console.log(
    chalk.gray(`Saving TypeScript types to: ${config.typesOutputFile}`)
  );

  try {
    // Validate languageCodes from config
    if (
      !config.languageCodes ||
      !Array.isArray(config.languageCodes) ||
      config.languageCodes.length === 0
    ) {
      throw new Error(
        'config.languageCodes is missing, not an array, or empty. Cannot determine which JSON file to use for type generation.'
      );
    }

    const firstLanguageCode = config.languageCodes[0];
    const targetFilename = `${firstLanguageCode}.json`;
    const jsonFilePath = path.join(config.contentDir, targetFilename);

    console.log(
      chalk.gray(
        `Attempting to generate types using the JSON file for the first configured language code ('${firstLanguageCode}').`
      )
    );
    console.log(chalk.gray(`Target file: ${jsonFilePath}`));

    // Read the specific JSON file
    let jsonContent;
    try {
      jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `Target JSON file not found: ${jsonFilePath}. Ensure content for language code '${firstLanguageCode}' has been pulled and exists at this location.`
        );
      }
      // Re-throw other fs.readFile errors (e.g., permission issues)
      throw new Error(`Failed to read file ${jsonFilePath}: ${err.message}`);
    }

    // Parse the JSON content
    let jsonObject;
    try {
      jsonObject = JSON.parse(jsonContent);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse JSON from file ${targetFilename}: ${parseError.message}`
      );
    }

    // Generate TypeScript interfaces using json-to-ts
    // The root type name for the generated interface. You might want to make this configurable.
    const rootTypeName = 'RootContentItem';
    const typeDeclarations: string[] = jsonToTS.default(jsonObject, {
      rootName: rootTypeName,
    });
    // If your previous code `jsonToTS.default(...)` was correct for your setup,
    // please revert the line above to:
    // const typeDeclarations: string[] = jsonToTS.default(jsonObject, {
    //   rootName: rootTypeName,
    // });

    if (!typeDeclarations || typeDeclarations.length === 0) {
      throw new Error(
        `Could not generate types from ${targetFilename}. The file might be empty, malformed, or not produce any types.`
      );
    }

    const outputContent = typeDeclarations.join('\n\n'); // Add extra newline between interfaces for readability

    // Ensure the output directory exists
    const outputDir = path.dirname(config.typesOutputFile);
    await fs.mkdir(outputDir, { recursive: true });

    // Write the generated types to the output file
    await fs.writeFile(config.typesOutputFile, outputContent, 'utf-8');

    console.log(
      chalk.green(
        `TypeScript types generated successfully at ${config.typesOutputFile}`
      )
    );
  } catch (error: any) {
    console.error(chalk.red.bold('\nError generating TypeScript types:'));
    console.error(chalk.red(error.message));
    // It's good practice to log the stack for unexpected errors if not already done by a higher-level handler
    // if (error.stack) {
    //   console.error(chalk.gray(error.stack));
    // }
    process.exit(1); // Exit with error code
  }
}

generateTypes();
