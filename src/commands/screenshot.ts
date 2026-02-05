#!/usr/bin/env node

import { exec } from 'child_process';
import chalk from 'chalk';
import { loadConfig } from '../core/config-loader.js';
import { AppConfig } from '../types.js';

interface ScreenshotConfig {
  url: string;
  contentKey?: string;
}

export async function captureScreenshot(): Promise<void> {
  console.log(chalk.blue('Starting screenshot mode...'));

  // Parse CLI arguments
  const config = await parseArguments();

  // Validate configuration
  if (!validateConfig(config)) {
    process.exit(1);
  }

  // Build URL with live-editor params
  const liveEditorUrl = buildLiveEditorUrl(config.url, config.contentKey);

  console.log(chalk.blue(`Opening browser with live-editor mode...`));
  console.log(chalk.dim(`URL: ${liveEditorUrl}`));

  // Open in default browser
  openInBrowser(liveEditorUrl);

  console.log(chalk.green('\nBrowser opened successfully!'));
  console.log(chalk.dim('Use the Contentstorage UI to capture screenshots.'));
}

async function parseArguments(): Promise<ScreenshotConfig> {
  const args = process.argv.slice(2);
  const cliConfig: { [key: string]: any } = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.substring(2);
      const value = args[i + 1];

      if (value && !value.startsWith('--')) {
        if (key === 'url') {
          cliConfig.url = value;
        } else if (key === 'content-key') {
          cliConfig.contentKey = value;
        }
        i++;
      }
    }
  }

  // Load file config for contentKey fallback
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

  return {
    url: cliConfig.url || '',
    contentKey: cliConfig.contentKey || fileConfig.contentKey,
  };
}

function validateConfig(config: ScreenshotConfig): boolean {
  if (!config.url) {
    console.error(chalk.red('Error: --url argument is required.'));
    console.log(
      chalk.dim(
        'Usage: contentstorage screenshot --url http://localhost:3000'
      )
    );
    console.log(
      chalk.dim(
        '       contentstorage screenshot --url http://localhost:5173'
      )
    );
    return false;
  }

  try {
    new URL(config.url);
  } catch {
    console.error(chalk.red(`Error: Invalid URL format: ${config.url}`));
    return false;
  }

  if (!config.contentKey) {
    console.error(chalk.red('Error: content-key is required.'));
    console.log(
      chalk.dim(
        'Provide via --content-key or in contentstorage.config.js'
      )
    );
    return false;
  }

  return true;
}

function buildLiveEditorUrl(baseUrl: string, contentKey?: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('contentstorage_live_editor', 'true');
  url.searchParams.set('screenshot_mode', 'true');
  if (contentKey) {
    url.searchParams.set('contentstorage_key', contentKey);
  }
  return url.toString();
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
      console.log(chalk.yellow(`Please open this URL manually: ${url}`));
    }
  });
}
