#!/usr/bin/env node
// ^ Shebang ensures the script is executed with Node.js

import fs from 'fs/promises';
import path from 'path';
import jsonToTS from 'json-to-ts'; // Import the library
import chalk from 'chalk'; // Optional: for colored output
import { loadConfig } from '../lib/configLoader.js';

export async function generateTypes() {
  console.log(chalk.blue('Starting type generation...'));

  const config = loadConfig();

  console.log(chalk.gray(`Reading JSON files from: ${config.contentDir}`));
  console.log(
    chalk.gray(`Saving TypeScript types to: ${config.typesOutputFile}`)
  );

  try {
    // Read the content directory
    let files: string[];
    try {
      files = await fs.readdir(config.contentDir);
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        throw new Error(
          `Content directory not found: ${config.contentDir}. Run 'pull-content' first?`
        );
      }
      throw err; // Re-throw other errors
    }

    // Filter for JSON files and sort them (optional, but good for consistency)
    const jsonFiles = files
      .filter((file) => file.toLowerCase().endsWith('.json'))
      .sort();

    if (jsonFiles.length === 0) {
      throw new Error(`No JSON files found in ${config.contentDir}.`);
    }

    const firstJsonFile = jsonFiles[0];
    const jsonFilePath = path.join(config.contentDir, firstJsonFile);
    console.log(
      chalk.gray(`Using first JSON file for type generation: ${firstJsonFile}`)
    );

    // Read the first JSON file
    const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');

    // Parse the JSON content
    let jsonObject;
    try {
      jsonObject = JSON.parse(jsonContent);
    } catch (parseError: any) {
      throw new Error(
        `Failed to parse JSON file ${firstJsonFile}: ${parseError.message}`
      );
    }

    // Generate TypeScript interfaces using json-to-ts
    // jsonToTS returns an array of strings, each being a line of the interface/type
    // We need to give the root type a name.
    const rootTypeName = 'RootContentItem'; // Or derive from filename, or make configurable
    const typeDeclarations: string[] = jsonToTS.default(jsonObject, {
      rootName: rootTypeName,
    });

    if (!typeDeclarations || typeDeclarations.length === 0) {
      throw new Error(
        `Could not generate types from ${firstJsonFile}. Is the file empty or malformed?`
      );
    }

    const outputContent = typeDeclarations.join('\n\n'); // Add extra newline between interfaces

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
    console.error(chalk.red('Error generating TypeScript types:'));
    console.error(chalk.red(error.message));
    process.exit(1); // Exit with error code
  }
}

generateTypes();
