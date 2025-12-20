#!/usr/bin/env node

import { chromium, Browser, Page } from 'playwright-core';
import axios from 'axios';
import chalk from 'chalk';
import { loadConfig } from '../core/config-loader.js';
import { CONTENTSTORAGE_CONFIG } from '../utils/constants.js';
import { findChrome, getChromeNotFoundMessage } from '../utils/browser.js';
import { AppConfig } from '../types.js';

interface ScreenshotConfig {
  url: string;
  contentKey?: string;
  viewport: { width: number; height: number };
}

export async function captureScreenshot(): Promise<void> {
  console.log(chalk.blue('Starting screenshot capture...'));

  // Step 1: Parse CLI arguments
  const config = await parseArguments();

  // Step 2: Validate configuration
  if (!validateConfig(config)) {
    process.exit(1);
  }

  // Step 3: Find Chrome installation
  const chromePath = findChrome();
  if (!chromePath) {
    console.error(chalk.red('\nError: Chrome browser not found.'));
    console.error(chalk.yellow(getChromeNotFoundMessage()));
    process.exit(1);
  }

  console.log(chalk.dim(`Using Chrome at: ${chromePath}`));

  let browser: Browser | null = null;

  try {
    // Step 4: Launch browser
    console.log(chalk.blue('Launching browser...'));
    browser = await chromium.launch({
      executablePath: chromePath,
      headless: true,
    });

    const context = await browser.newContext({
      viewport: config.viewport,
    });
    const page = await context.newPage();

    // Step 5: Navigate to URL with live-editor mode enabled
    // Add query param to enable live-editor mode in the i18next plugin
    const urlWithLiveEditor = addLiveEditorParam(config.url);
    console.log(chalk.blue(`Navigating to ${urlWithLiveEditor}...`));
    try {
      await page.goto(urlWithLiveEditor, {
        waitUntil: 'networkidle',
        timeout: 30000,
      });
    } catch (error: any) {
      if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
        throw new Error(
          `Cannot connect to ${config.url}. Is your dev server running?`
        );
      }
      throw error;
    }
    console.log(chalk.green('Page loaded successfully'));

    // Step 6: Inject live-editor script
    console.log(chalk.blue('Injecting live-editor script...'));
    await injectLiveEditor(page);
    console.log(chalk.green('Live-editor script injected'));

    // Step 7: Wait for live-editor to initialize
    console.log(chalk.blue('Waiting for live-editor to initialize...'));
    await waitForLiveEditor(page);
    console.log(chalk.green('Live-editor initialized'));

    // Step 8: Wait for memory map to be populated
    console.log(chalk.blue('Waiting for translation tracking (memoryMap)...'));
    await waitForMemoryMap(page);

    // Step 9: Capture screenshot
    console.log(chalk.blue('Capturing screenshot...'));
    const screenshotData = await captureScreenshotFromPage(page);
    console.log(chalk.green('Screenshot captured successfully'));

    // Step 9: Upload to backend
    console.log(chalk.blue('Uploading screenshot to backend...'));
    await uploadScreenshot(screenshotData, config.contentKey);

    console.log(chalk.green('\nScreenshot capture completed successfully!'));
  } catch (error: any) {
    handleError(error);
    process.exit(1);
  } finally {
    // Step 10: Cleanup
    if (browser) {
      console.log(chalk.dim('Closing browser...'));
      await browser.close();
    }
  }
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
        } else if (key === 'viewport') {
          // Parse viewport as WxH (e.g., "1920x1080")
          const parts = value.split('x');
          if (parts.length === 2) {
            const width = parseInt(parts[0], 10);
            const height = parseInt(parts[1], 10);
            if (!isNaN(width) && !isNaN(height)) {
              cliConfig.viewport = { width, height };
            }
          }
        }
        i++; // Skip the value in next iteration
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
    viewport: cliConfig.viewport || { width: 1920, height: 1080 },
  };
}

function validateConfig(config: ScreenshotConfig): boolean {
  if (!config.url) {
    console.error(chalk.red('Error: --url argument is required.'));
    console.log(
      chalk.dim('Usage: contentstorage screenshot --url http://localhost:3000')
    );
    return false;
  }

  // Validate URL format
  try {
    new URL(config.url);
  } catch {
    console.error(chalk.red(`Error: Invalid URL format: ${config.url}`));
    return false;
  }

  return true;
}

/**
 * Add live-editor query parameter to enable tracking in the i18next plugin
 */
function addLiveEditorParam(urlString: string): string {
  const url = new URL(urlString);
  url.searchParams.set('contentstorage_live_editor', 'true');
  return url.toString();
}

async function injectLiveEditor(page: Page): Promise<void> {
  const liveEditorUrl = CONTENTSTORAGE_CONFIG.LIVE_EDITOR_CDN_URL;

  await page.evaluate((scriptUrl: string) => {
    return new Promise<void>((resolve, reject) => {
      // Check if already loaded
      if ((window as any).__CONTENTSTORAGE_LIVE_EDITOR__) {
        resolve();
        return;
      }

      // Set screenshot mode before loading script
      (window as any).__CONTENTSTORAGE_MODE__ = 'screenshot';

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.onload = () => resolve();
      script.onerror = () =>
        reject(new Error('Failed to load live-editor script'));

      document.head.appendChild(script);
    });
  }, liveEditorUrl);
}

async function waitForLiveEditor(page: Page): Promise<void> {
  const maxAttempts = 30;
  const interval = 500; // ms

  for (let i = 0; i < maxAttempts; i++) {
    const isReady = await page.evaluate(() => {
      const liveEditor = (window as any).__CONTENTSTORAGE_LIVE_EDITOR__;
      return (
        liveEditor !== undefined &&
        typeof liveEditor.isReady === 'function' &&
        liveEditor.isReady()
      );
    });

    if (isReady) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // If live-editor doesn't initialize, warn but continue (will use fallback)
  console.log(
    chalk.yellow(
      'Live-editor did not fully initialize. Using fallback screenshot method.'
    )
  );
}

/**
 * Wait for the memory map to be populated with translations
 * The memory map is populated by the contentstorage plugin as translations render
 */
async function waitForMemoryMap(page: Page): Promise<void> {
  const maxAttempts = 20;
  const interval = 500; // ms

  for (let i = 0; i < maxAttempts; i++) {
    const memoryMapInfo = await page.evaluate(() => {
      const memoryMap = (window as any).memoryMap;
      if (memoryMap && memoryMap instanceof Map) {
        return { exists: true, size: memoryMap.size };
      }
      return { exists: false, size: 0 };
    });

    if (memoryMapInfo.exists && memoryMapInfo.size > 0) {
      console.log(
        chalk.green(`Memory map populated with ${memoryMapInfo.size} entries`)
      );
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  // Warn if memory map wasn't populated
  console.log(
    chalk.yellow(
      'Memory map not populated. Make sure your app uses the contentstorage plugin'
    )
  );
}

async function captureScreenshotFromPage(page: Page): Promise<string> {
  // Try to use live-editor's capture method first
  const liveEditorResult = await page.evaluate(async () => {
    const liveEditor = (window as any).__CONTENTSTORAGE_LIVE_EDITOR__;
    if (
      liveEditor &&
      typeof liveEditor.captureScreenshot === 'function'
    ) {
      try {
        const result = await liveEditor.captureScreenshot();
        return { success: true, data: result };
      } catch (e: any) {
        return { success: false, error: e.message };
      }
    }
    return { success: false, error: 'captureScreenshot method not available' };
  });

  if (liveEditorResult.success && liveEditorResult.data) {
    return liveEditorResult.data;
  }

  // Fallback: Use Playwright's native screenshot capability
  console.log(chalk.dim('Using Playwright fallback for screenshot...'));
  const buffer = await page.screenshot({
    type: 'png',
    fullPage: false,
  });

  return buffer.toString('base64');
}

async function uploadScreenshot(
  screenshotData: string,
  contentKey?: string
): Promise<void> {
  const uploadUrl = `${CONTENTSTORAGE_CONFIG.API_URL}/screenshots/upload`;

  const requestConfig: any = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (contentKey) {
    requestConfig.headers['X-Content-Key'] = contentKey;
  }

  try {
    const response = await axios.post(
      uploadUrl,
      {
        screenshot: screenshotData,
        timestamp: new Date().toISOString(),
      },
      requestConfig
    );

    if (response.data?.url) {
      console.log(chalk.green(`Screenshot URL: ${response.data.url}`));
    } else {
      console.log(chalk.green('Screenshot uploaded successfully'));
    }
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        console.log(
          chalk.yellow(
            'Backend endpoint not yet available. Screenshot captured but not uploaded.'
          )
        );
        console.log(
          chalk.dim(
            'The screenshot data is available but the upload endpoint needs to be implemented.'
          )
        );
        return;
      }
      throw new Error(
        `Upload failed: ${error.response?.status} - ${error.response?.data?.message || error.message}`
      );
    }
    throw error;
  }
}

function handleError(error: any): void {
  console.error(chalk.red('\n-----------------------------------------------'));
  console.error(chalk.red('Screenshot capture failed'));
  console.error(chalk.red('-----------------------------------------------'));

  if (error.message) {
    console.error(chalk.red(`Error: ${error.message}`));
  }

  // Provide helpful hints based on error type
  if (
    error.message?.includes('Cannot connect') ||
    error.message?.includes('ERR_CONNECTION_REFUSED')
  ) {
    console.log(chalk.yellow('\nTroubleshooting:'));
    console.log(chalk.dim('1. Make sure your dev server is running'));
    console.log(chalk.dim('2. Check the URL is correct'));
    console.log(chalk.dim('3. Verify the port number'));
  }

  console.error(chalk.red('-----------------------------------------------\n'));
}