#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';
import { exec, execSync } from 'child_process';
import chalk from 'chalk';
import { loadConfig } from '../core/config-loader.js';
import { createApiClient, TranslateSessionData } from '../core/api-client.js';
import { flattenJson } from '../utils/flatten-json.js';
import { AppConfig } from '../types.js';

interface DiffResult {
  newKeys: Array<{ key: string; value: string }>;
  modifiedKeys: Array<{ key: string; value: string; oldValue: string }>;
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function getGitBranch(): string | null {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

function openInBrowser(url: string): void {
  const platform = process.platform;

  let command: string;
  if (platform === 'darwin') {
    command = `open "${url}"`;
  } else if (platform === 'win32') {
    command = `start "" "${url}"`;
  } else {
    command = `xdg-open "${url}"`;
  }

  exec(command, (error) => {
    if (error) {
      console.error(chalk.red(`Failed to open browser: ${error.message}`));
      console.log(chalk.yellow(`Please open this URL manually:\n  ${url}`));
    }
  });
}

export async function translateContent(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const cliConfig: { [key: string]: any } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '-y') {
      cliConfig.skipConfirm = true;
    } else if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];

      if (key === 'dry-run') {
        cliConfig.dryRun = true;
      } else if (value && !value.startsWith('--') && value !== '-y') {
        if (key === 'lang') {
          cliConfig.languageCodes = [value.toUpperCase()];
        } else if (key === 'api-key') {
          cliConfig.apiKey = value;
        } else if (key === 'project-id') {
          cliConfig.projectId = value;
        } else if (key === 'content-dir') {
          cliConfig.contentDir = value;
        }
        i++;
      }
    }
  }

  // Load config
  let fileConfig: Partial<AppConfig> = {};
  try {
    fileConfig = await loadConfig();
  } catch {
    console.log(
      chalk.yellow(
        'Could not load configuration file. Using CLI arguments only.'
      )
    );
  }

  const config = { ...fileConfig, ...cliConfig } as Partial<AppConfig> & {
    dryRun?: boolean;
    skipConfirm?: boolean;
  };

  // Validate required fields
  if (!config.apiKey) {
    console.error(
      chalk.red(
        '\n❌ Error: API key is required.\n' +
          '   Provide it via config file (apiKey) or --api-key argument.\n' +
          '   You can create an API key in Project Settings → API Keys.'
      )
    );
    process.exit(1);
  }

  if (!config.projectId) {
    console.error(
      chalk.red(
        '\n❌ Error: Project ID is required.\n' +
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

  const sourceLanguage = config.languageCodes[0];

  // Create API client
  const apiClient = createApiClient({
    apiKey: config.apiKey,
    projectId: config.projectId,
  });

  if (!apiClient) {
    console.error(chalk.red('Failed to create API client'));
    process.exit(1);
  }

  // Step 1: Read local source file
  const filePath = path.join(config.contentDir, `${sourceLanguage}.json`);

  let localContent: Record<string, any>;
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    localContent = JSON.parse(fileContent);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      console.error(
        chalk.red(
          `\n❌ Source file not found: ${filePath}\n` +
            `   Check your contentDir setting and ensure the file exists.`
        )
      );
    } else {
      console.error(chalk.red(`\n❌ Error reading source file: ${error.message}`));
    }
    process.exit(1);
  }

  const localFlat = flattenJson(localContent);

  // Step 2: Fetch server content
  console.log(chalk.blue('Comparing with server...'));

  let serverFlat: Record<string, string>;
  try {
    const serverResponse = await apiClient.getContent({
      languageCode: sourceLanguage,
      format: 'flat',
      draft: true,
    });

    serverFlat = (serverResponse.data[sourceLanguage] || {}) as Record<string, string>;
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Could not fetch server content: ${error.message}`));
    process.exit(1);
  }

  // Step 3: Compute diff
  const diff: DiffResult = { newKeys: [], modifiedKeys: [] };

  for (const [key, value] of Object.entries(localFlat)) {
    const serverValue = serverFlat[key];
    if (serverValue === undefined) {
      diff.newKeys.push({ key, value });
    } else if (serverValue !== value) {
      diff.modifiedKeys.push({ key, value, oldValue: serverValue });
    }
  }

  const totalChanges = diff.newKeys.length + diff.modifiedKeys.length;

  if (totalChanges === 0) {
    console.log(chalk.green('\n✓ All keys are up to date. Nothing to translate.'));
    process.exit(0);
  }

  // Step 4: Display diff
  const parts: string[] = [];
  if (diff.newKeys.length > 0) parts.push(`${diff.newKeys.length} new`);
  if (diff.modifiedKeys.length > 0) parts.push(`${diff.modifiedKeys.length} modified`);

  console.log(chalk.bold(`\nFound ${parts.join(', ')}:\n`));

  for (const { key, value } of diff.newKeys) {
    const displayValue = value.length > 50 ? value.substring(0, 47) + '...' : value;
    console.log(chalk.green(`  + ${key.padEnd(35)} ${chalk.dim(`"${displayValue}"`)}`));
  }

  for (const { key, value, oldValue } of diff.modifiedKeys) {
    const displayOld = oldValue.length > 25 ? oldValue.substring(0, 22) + '...' : oldValue;
    const displayNew = value.length > 25 ? value.substring(0, 22) + '...' : value;
    console.log(
      chalk.yellow(`  ~ ${key.padEnd(35)} ${chalk.dim(`"${displayOld}" → "${displayNew}"`)}`)
    );
  }

  // Dry run stops here
  if (config.dryRun) {
    console.log(chalk.dim('\n(dry run — nothing was pushed)'));
    process.exit(0);
  }

  // Step 5: Confirm
  if (!config.skipConfirm) {
    // Get project name for display
    let projectName = config.projectId;
    try {
      const projectInfo = await apiClient.getProject();
      projectName = projectInfo.project.name;
    } catch {
      // Use projectId as fallback
    }

    console.log(
      chalk.dim(`\nThese will be pushed to Contentstorage (project: ${projectName}).`)
    );
    const answer = await prompt('Proceed? (Y/n) ');
    if (answer.toLowerCase() === 'n') {
      console.log(chalk.dim('Cancelled.'));
      process.exit(0);
    }
  }

  // Step 6: Push with session
  const sessionKeys: TranslateSessionData['keys'] = [
    ...diff.newKeys.map(({ key, value }) => ({ key, value, status: 'new' as const })),
    ...diff.modifiedKeys.map(({ key, value }) => ({ key, value, status: 'modified' as const })),
  ];

  const gitBranch = getGitBranch();

  try {
    const response = await apiClient.pushContent(sourceLanguage, localContent, {
      session: {
        keys: sessionKeys,
        metadata: {
          ...(gitBranch ? { gitBranch } : {}),
          pushedAt: new Date().toISOString(),
        },
      },
    });

    const { result } = response;
    const pushed = result.keysAdded + result.keysUpdated;

    console.log(
      chalk.green(
        `\n✓ ${pushed} keys pushed (${result.keysAdded} new, ${result.keysUpdated} modified)`
      ) +
        (response.session ? chalk.dim(` [session: ${response.session.id}]`) : '')
    );

    // Step 7: Open browser
    if (response.session) {
      console.log(chalk.bold('\n→ Create task and add visual context:'));
      console.log(chalk.cyan(`  ${response.session.url}`));

      openInBrowser(response.session.url);
    }
  } catch (error: any) {
    console.error(chalk.red(`\n❌ Failed to push keys: ${error.message}`));
    process.exit(1);
  }
}