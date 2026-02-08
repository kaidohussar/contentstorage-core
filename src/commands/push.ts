#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { loadConfig } from '../core/config-loader.js';
import { createApiClient } from '../core/api-client.js';
import { AppConfig } from '../types.js';

export async function pushContent() {
  console.log(chalk.blue('Starting content push...'));

  // Parse CLI arguments
  const args = process.argv.slice(2);
  const cliConfig: { [key: string]: any } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];

      if (key === 'dry-run') {
        cliConfig.dryRun = true;
      } else if (value && !value.startsWith('--')) {
        if (key === 'lang') {
          cliConfig.languageCodes = [value.toUpperCase()];
        } else if (key === 'api-key') {
          cliConfig.apiKey = value;
        } else if (key === 'project-id') {
          cliConfig.projectId = value;
        } else if (key === 'content-dir') {
          cliConfig.contentDir = value;
        } else if (key === 'api-url') {
          cliConfig.apiUrl = value;
        }
        i++; // Skip the value in next iteration
      }
    }
  }

  // Load config from file
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

  const config = { ...fileConfig, ...cliConfig } as Partial<AppConfig> & {
    dryRun?: boolean;
  };

  // Validate required fields
  if (!config.apiKey) {
    console.error(
      chalk.red(
        '\n❌ Error: API key is required for push.\n' +
          '   Provide it via config file (apiKey) or --api-key argument.\n' +
          '   You can create an API key in Project Settings → API Keys.'
      )
    );
    process.exit(1);
  }

  if (!config.projectId) {
    console.error(
      chalk.red(
        '\n❌ Error: Project ID is required for push.\n' +
          '   Provide it via config file (projectId) or --project-id argument.'
      )
    );
    process.exit(1);
  }

  if (!config.contentDir) {
    console.error(
      chalk.red(
        '\n❌ Error: Content directory is required.\n' +
          '   Provide it via config file (contentDir) or --content-dir argument.'
      )
    );
    process.exit(1);
  }

  if (!config.languageCodes || config.languageCodes.length === 0) {
    console.error(
      chalk.red(
        '\n❌ Error: At least one language code is required.\n' +
          '   Provide it via config file (languageCodes) or --lang argument.'
      )
    );
    process.exit(1);
  }

  // Create API client
  const apiClient = createApiClient({
    apiKey: config.apiKey,
    projectId: config.projectId,
    apiUrl: config.apiUrl,
  });

  if (!apiClient) {
    console.error(chalk.red('Failed to create API client'));
    process.exit(1);
  }

  console.log(chalk.blue(`Project ID: ${config.projectId}`));
  console.log(chalk.blue(`Content directory: ${config.contentDir}`));
  console.log(
    chalk.blue(`Languages to push: ${config.languageCodes.join(', ')}`)
  );

  if (config.dryRun) {
    console.log(chalk.yellow('\n🔍 Dry run mode - no changes will be made\n'));
  }

  try {
    let totalAdded = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;

    for (const languageCode of config.languageCodes) {
      const filePath = path.join(config.contentDir, `${languageCode}.json`);

      console.log(chalk.blue(`\nProcessing ${languageCode}...`));
      console.log(chalk.dim(`  Reading from: ${filePath}`));

      // Read the local content file
      let content: Record<string, any>;
      try {
        const fileContent = await fs.readFile(filePath, 'utf-8');
        content = JSON.parse(fileContent);
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          console.error(chalk.red(`  ❌ File not found: ${filePath}`));
          continue;
        }
        console.error(chalk.red(`  ❌ Error reading file: ${error.message}`));
        continue;
      }

      // Push to API
      try {
        const response = await apiClient.pushContent(languageCode, content, {
          dryRun: config.dryRun,
        });

        const { result } = response;

        if (config.dryRun) {
          console.log(chalk.cyan(`  📊 Dry run results for ${languageCode}:`));
          console.log(chalk.green(`     Keys to add: ${result.keysAdded}`));
          console.log(chalk.yellow(`     Keys to update: ${result.keysUpdated}`));
          console.log(chalk.dim(`     Keys unchanged: ${result.keysSkipped}`));
        } else {
          console.log(chalk.green(`  ✅ Successfully pushed ${languageCode}`));
          console.log(chalk.green(`     Keys added: ${result.keysAdded}`));
          console.log(chalk.yellow(`     Keys updated: ${result.keysUpdated}`));
          console.log(chalk.dim(`     Keys skipped: ${result.keysSkipped}`));

          if (result.pendingChangesCreated) {
            console.log(
              chalk.cyan(
                '     📝 Changes added to pending (publish required)'
              )
            );
          }
        }

        totalAdded += result.keysAdded;
        totalUpdated += result.keysUpdated;
        totalSkipped += result.keysSkipped;
      } catch (error: any) {
        console.error(
          chalk.red(`  ❌ Failed to push ${languageCode}: ${error.message}`)
        );
        throw error;
      }
    }

    // Summary
    console.log(chalk.bold('\n📊 Summary:'));
    console.log(chalk.dim('─'.repeat(40)));

    if (config.dryRun) {
      console.log(chalk.cyan('  Dry run completed'));
      console.log(chalk.green(`  Total keys to add: ${totalAdded}`));
      console.log(chalk.yellow(`  Total keys to update: ${totalUpdated}`));
      console.log(chalk.dim(`  Total keys unchanged: ${totalSkipped}`));
      console.log(
        chalk.dim('\n  Run without --dry-run to apply changes.')
      );
    } else {
      console.log(chalk.green(`  ✅ Push completed successfully`));
      console.log(chalk.green(`  Total keys added: ${totalAdded}`));
      console.log(chalk.yellow(`  Total keys updated: ${totalUpdated}`));
      console.log(chalk.dim(`  Total keys skipped: ${totalSkipped}`));
    }
  } catch {
    console.error(chalk.red('\n❌ Push failed. See errors above.'));
    process.exit(1);
  }
}
