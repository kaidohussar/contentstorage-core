import fs from 'fs';
import path from 'path';

/**
 * Common Chrome installation paths by platform
 */
const CHROME_PATHS: Record<string, string[]> = {
  darwin: [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
  ],
  win32: [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA
      ? path.join(
          process.env.LOCALAPPDATA,
          'Google\\Chrome\\Application\\chrome.exe'
        )
      : '',
  ].filter(Boolean),
  linux: [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ],
};

/**
 * Find Chrome executable on the system
 * @returns Path to Chrome executable or null if not found
 */
export function findChrome(): string | null {
  const platform = process.platform;
  const paths = CHROME_PATHS[platform] || [];

  for (const chromePath of paths) {
    if (chromePath && fs.existsSync(chromePath)) {
      return chromePath;
    }
  }

  return null;
}

/**
 * Get helpful error message when Chrome is not found
 */
export function getChromeNotFoundMessage(): string {
  const platform = process.platform;

  const installInstructions: Record<string, string> = {
    darwin: 'Download from https://www.google.com/chrome/ or install via: brew install --cask google-chrome',
    win32: 'Download from https://www.google.com/chrome/',
    linux:
      'Install via: sudo apt install google-chrome-stable (Debian/Ubuntu) or sudo dnf install google-chrome-stable (Fedora)',
  };

  return `Chrome not found on your system.

Searched locations:
${(CHROME_PATHS[platform] || []).map((p) => `  - ${p}`).join('\n')}

To install Chrome:
  ${installInstructions[platform] || 'Download from https://www.google.com/chrome/'}`;
}
