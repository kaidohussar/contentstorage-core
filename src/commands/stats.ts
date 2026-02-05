import axios from 'axios';
import chalk from 'chalk';
import { promises as fs } from 'fs';
import path from 'path';
import { loadConfig } from '../core/config-loader.js';
import { createApiClient, StatsResponse } from '../core/api-client.js';
import { AppConfig, LanguageCode } from '../types.js';
import { flattenJson } from '../utils/flatten-json.js';
import { CONTENTSTORAGE_CONFIG } from '../utils/constants.js';

interface LanguageStats {
  languageCode: LanguageCode;
  total: number;
  translated: number;
  untranslated: number;
  completionPercentage: number;
  untranslatedItems: Array<{ key: string; reason: 'empty' | 'missing' }>;
}

interface StatsResult {
  referenceLanguage: LanguageCode;
  totalItems: number;
  languageStats: LanguageStats[];
  overallCompletion: number;
}

/**
 * Check if a value is considered untranslated
 */
function isUntranslated(value: any): boolean {
  return value === '' || value === null || value === undefined;
}

/**
 * Load content for a specific language, trying local files first, then API
 */
async function loadLanguageContent(
  languageCode: LanguageCode,
  config: AppConfig
): Promise<Record<string, any>> {
  // Try local file first
  try {
    const filePath = path.join(config.contentDir, `${languageCode}.json`);
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Fallback to API
    console.log(
      chalk.dim(
        `Local file not found for ${languageCode}, fetching from API...`
      )
    );

    let fileUrl: string;
    const requestConfig: any = {
      timeout: 30000,
    };

    if (config.pendingChanges) {
      fileUrl = `${CONTENTSTORAGE_CONFIG.API_URL}/pending-changes/get-json?languageCode=${languageCode}`;
      requestConfig.headers = {
        'X-Content-Key': config.contentKey,
      };
    } else {
      fileUrl = `${CONTENTSTORAGE_CONFIG.BASE_URL}/${config.contentKey}/content/${languageCode}.json`;
    }

    try {
      const response = await axios.get(fileUrl, requestConfig);
      let jsonData = response.data;

      // Unwrap pending changes response
      if (
        config.pendingChanges &&
        jsonData &&
        typeof jsonData === 'object' &&
        'data' in jsonData
      ) {
        jsonData = jsonData.data;
      }

      return jsonData;
    } catch (apiError: any) {
      console.error(chalk.red(`Failed to load content for ${languageCode}:`));
      if (apiError.response) {
        console.error(chalk.red(`  Status: ${apiError.response.status}`));
      }
      throw apiError;
    }
  }
}

/**
 * Analyze a single language against a reference language
 */
function analyzeLanguage(
  languageCode: LanguageCode,
  content: Record<string, any>,
  referenceContent: Record<string, any>
): LanguageStats {
  const flatContent = flattenJson(content);
  const flatReference = flattenJson(referenceContent);

  const untranslatedItems: Array<{ key: string; reason: 'empty' | 'missing' }> =
    [];

  // Get all keys from reference
  const allKeys = Object.keys(flatReference);
  const totalItems = allKeys.length;

  // Check each key
  for (const key of allKeys) {
    // Check if key is missing in target language
    if (!(key in flatContent)) {
      untranslatedItems.push({ key, reason: 'missing' });
      continue;
    }

    // Check if value is empty
    if (isUntranslated(flatContent[key])) {
      untranslatedItems.push({ key, reason: 'empty' });
    }
  }

  const untranslatedCount = untranslatedItems.length;
  const translatedCount = totalItems - untranslatedCount;
  const completionPercentage =
    totalItems > 0 ? (translatedCount / totalItems) * 100 : 100;

  return {
    languageCode,
    total: totalItems,
    translated: translatedCount,
    untranslated: untranslatedCount,
    completionPercentage,
    untranslatedItems,
  };
}

/**
 * Display statistics in a formatted table
 */
function displayStats(result: StatsResult): void {
  console.log(chalk.bold('\n📊 Translation Statistics'));
  console.log(chalk.dim('═'.repeat(70)));

  // Reference language info
  console.log(
    chalk.cyan(
      `\nReference Language: ${chalk.bold(result.referenceLanguage)} (baseline for comparison)`
    )
  );
  console.log(
    chalk.cyan(`Total unique content items: ${chalk.bold(result.totalItems)}`)
  );

  // Language statistics table header
  console.log(chalk.bold('\n📋 Language Statistics:'));
  console.log(chalk.dim('─'.repeat(70)));

  // Table header
  const headerFormat = (str: string, width: number) => str.padEnd(width, ' ');
  console.log(
    chalk.bold(
      headerFormat('Language', 12) +
        headerFormat('Total', 10) +
        headerFormat('Translated', 13) +
        headerFormat('Untranslated', 15) +
        'Complete'
    )
  );
  console.log(chalk.dim('─'.repeat(70)));

  // Language rows
  for (const stats of result.languageStats) {
    const percentageColor =
      stats.completionPercentage === 100
        ? chalk.green
        : stats.completionPercentage >= 80
          ? chalk.yellow
          : chalk.red;

    const percentage = percentageColor(
      stats.completionPercentage.toFixed(1) + '%'
    );

    console.log(
      chalk.white(headerFormat(stats.languageCode, 12)) +
        chalk.white(headerFormat(stats.total.toString(), 10)) +
        chalk.white(headerFormat(stats.translated.toString(), 13)) +
        (stats.untranslated > 0
          ? chalk.red(headerFormat(stats.untranslated.toString(), 15))
          : chalk.green(headerFormat(stats.untranslated.toString(), 15))) +
        percentage
    );
  }

  console.log(chalk.dim('─'.repeat(70)));

  // Untranslated items details
  const languagesWithIssues = result.languageStats.filter(
    (s) => s.untranslated > 0
  );

  if (languagesWithIssues.length > 0) {
    console.log(chalk.bold('\n⚠️  Untranslated Items by Language:'));
    console.log(chalk.dim('─'.repeat(70)));

    for (const stats of languagesWithIssues) {
      console.log(
        chalk.yellow(
          `\n${stats.languageCode} (${stats.untranslated} ${stats.untranslated === 1 ? 'item' : 'items'}):`
        )
      );

      // Group by reason
      const emptyItems = stats.untranslatedItems
        .filter((item) => item.reason === 'empty')
        .map((item) => item.key);
      const missingItems = stats.untranslatedItems
        .filter((item) => item.reason === 'missing')
        .map((item) => item.key);

      if (emptyItems.length > 0) {
        console.log(chalk.dim('  Empty values:'));
        emptyItems.forEach((key) => {
          console.log(chalk.red(`    • ${key}`));
        });
      }

      if (missingItems.length > 0) {
        console.log(chalk.dim('  Missing keys:'));
        missingItems.forEach((key) => {
          console.log(chalk.red(`    • ${key}`));
        });
      }
    }
  } else {
    console.log(chalk.green('\n✅ All languages are fully translated!'));
  }

  // Overall completion
  console.log(chalk.bold('\n📈 Overall Summary:'));
  console.log(chalk.dim('─'.repeat(70)));

  const overallColor =
    result.overallCompletion === 100
      ? chalk.green
      : result.overallCompletion >= 80
        ? chalk.yellow
        : chalk.red;

  console.log(
    overallColor(
      `Overall Completion: ${chalk.bold(result.overallCompletion.toFixed(1) + '%')}`
    )
  );
  console.log('');
}

/**
 * Display statistics from API response
 */
function displayApiStats(response: StatsResponse): void {
  const { stats } = response;

  console.log(chalk.bold('\n📊 Translation Statistics (from API)'));
  console.log(chalk.dim('═'.repeat(70)));

  console.log(
    chalk.cyan(`\nTotal unique content items: ${chalk.bold(stats.totalKeys)}`)
  );

  // Language statistics table header
  console.log(chalk.bold('\n📋 Language Statistics:'));
  console.log(chalk.dim('─'.repeat(70)));

  // Table header
  const headerFormat = (str: string, width: number) => str.padEnd(width, ' ');
  console.log(
    chalk.bold(
      headerFormat('Language', 12) +
        headerFormat('Completed', 12) +
        headerFormat('Total', 10) +
        'Complete'
    )
  );
  console.log(chalk.dim('─'.repeat(70)));

  // Calculate overall completion
  let totalCompleted = 0;
  let totalPossible = 0;

  // Language rows
  for (const lang of stats.languages) {
    const percentageColor =
      lang.percentage === 100
        ? chalk.green
        : lang.percentage >= 80
          ? chalk.yellow
          : chalk.red;

    const percentage = percentageColor(lang.percentage + '%');

    console.log(
      chalk.white(headerFormat(lang.code, 12)) +
        chalk.white(headerFormat(lang.completed.toString(), 12)) +
        chalk.white(headerFormat(stats.totalKeys.toString(), 10)) +
        percentage
    );

    totalCompleted += lang.completed;
    totalPossible += stats.totalKeys;
  }

  console.log(chalk.dim('─'.repeat(70)));

  // Pending changes info
  if (stats.pendingChanges.total > 0) {
    console.log(chalk.bold('\n📝 Pending Changes:'));
    console.log(chalk.dim('─'.repeat(70)));
    console.log(chalk.cyan(`  Total: ${stats.pendingChanges.total}`));
    if (stats.pendingChanges.added > 0) {
      console.log(chalk.green(`  Added: ${stats.pendingChanges.added}`));
    }
    if (stats.pendingChanges.edited > 0) {
      console.log(chalk.yellow(`  Edited: ${stats.pendingChanges.edited}`));
    }
    if (stats.pendingChanges.removed > 0) {
      console.log(chalk.red(`  Removed: ${stats.pendingChanges.removed}`));
    }
  }

  // Overall completion
  console.log(chalk.bold('\n📈 Overall Summary:'));
  console.log(chalk.dim('─'.repeat(70)));

  const overallCompletion =
    totalPossible > 0 ? (totalCompleted / totalPossible) * 100 : 100;
  const overallColor =
    overallCompletion === 100
      ? chalk.green
      : overallCompletion >= 80
        ? chalk.yellow
        : chalk.red;

  console.log(
    overallColor(
      `Overall Completion: ${chalk.bold(overallCompletion.toFixed(1) + '%')}`
    )
  );
  console.log('');
}

/**
 * Main stats command function
 */
export async function showStats(): Promise<void> {
  try {
    console.log(chalk.blue('Loading configuration...'));

    // Parse CLI arguments
    const args = process.argv.slice(2);
    const cliConfig: { [key: string]: any } = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const key = arg.substring(2);

        if (key === 'pending-changes') {
          cliConfig.pendingChanges = true;
        } else {
          const value = args[i + 1];
          if (value && !value.startsWith('--')) {
            if (key === 'content-key') {
              cliConfig.contentKey = value;
            } else if (key === 'content-dir') {
              cliConfig.contentDir = value;
            } else if (key === 'api-key') {
              cliConfig.apiKey = value;
            } else if (key === 'project-id') {
              cliConfig.projectId = value;
            }
            i++; // Skip the value in next iteration
          }
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
          '⚠️  Could not load a configuration file, using CLI arguments only'
        )
      );
    }

    // Merge configurations (CLI args override file config)
    const config = { ...fileConfig, ...cliConfig } as Partial<AppConfig>;

    // Check if using new API key authentication
    const useApiClient = !!(config.apiKey && config.projectId);

    // Validate required fields based on auth method
    if (!useApiClient && !config.contentKey) {
      console.error(
        chalk.red(
          '\n❌ Error: Either "contentKey" or "apiKey" + "projectId" is required.\n' +
            '   Use --content-key for read-only access, or\n' +
            '   Use --api-key and --project-id for full API access.'
        )
      );
      process.exit(1);
    }

    // If using API client, fetch stats directly from API
    if (useApiClient) {
      const apiClient = createApiClient({
        apiKey: config.apiKey,
        projectId: config.projectId,
      });

      if (!apiClient) {
        console.error(chalk.red('Failed to create API client'));
        process.exit(1);
      }

      console.log(chalk.blue('Fetching statistics from API...\n'));

      const apiStats = await apiClient.getStats();
      displayApiStats(apiStats);
      return;
    }

    // contentKey path: local file analysis or fetch from CDN/API
    if (!config.languageCodes || config.languageCodes.length === 0) {
      console.error(
        chalk.red(
          '\n❌ Error: At least one language code is required in configuration.'
        )
      );
      process.exit(1);
    }

    // Set defaults
    if (!config.contentDir) {
      config.contentDir = 'src/content/json';
    }

    const fullConfig = config as AppConfig;

    console.log(
      chalk.blue(`Analyzing ${fullConfig.languageCodes.length} language(s)...`)
    );

    // Load content for all languages
    const languageContents: Record<
      LanguageCode,
      Record<string, any>
    > = {} as any;

    for (const languageCode of fullConfig.languageCodes) {
      try {
        languageContents[languageCode] = await loadLanguageContent(
          languageCode,
          fullConfig
        );
      } catch {
        console.error(
          chalk.red(`\n❌ Failed to load content for ${languageCode}`)
        );
        process.exit(1);
      }
    }

    console.log(chalk.green('✓ All content loaded successfully\n'));

    // Use first language as reference
    const referenceLanguage = fullConfig.languageCodes[0];
    const referenceContent = languageContents[referenceLanguage];

    // Analyze each language
    const languageStats: LanguageStats[] = [];

    for (const languageCode of fullConfig.languageCodes) {
      const stats = analyzeLanguage(
        languageCode,
        languageContents[languageCode],
        referenceContent
      );
      languageStats.push(stats);
    }

    // Calculate overall completion
    const totalTranslated = languageStats.reduce(
      (sum, s) => sum + s.translated,
      0
    );
    const totalPossible = languageStats.reduce((sum, s) => sum + s.total, 0);
    const overallCompletion =
      totalPossible > 0 ? (totalTranslated / totalPossible) * 100 : 100;

    const result: StatsResult = {
      referenceLanguage,
      totalItems: Object.keys(flattenJson(referenceContent)).length,
      languageStats,
      overallCompletion,
    };

    // Display results
    displayStats(result);
  } catch (error: any) {
    console.error(chalk.red('\n❌ An error occurred:'));
    console.error(chalk.red(error.message || error));
    process.exit(1);
  }
}
