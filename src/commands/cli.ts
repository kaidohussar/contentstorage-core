#!/usr/bin/env node

import chalk from 'chalk';
import { pullContent } from './pull.js';
import { generateTypes } from './generate-types.js';

const COMMANDS = {
  pull: {
    name: 'pull',
    description: 'Pull content from Contentstorage CDN',
    usage: 'contentstorage pull [options]',
    options: [
      '  --content-key <key>    Content key for your project',
      '  --content-dir <dir>    Directory to save content files',
      '  --lang <code>          Language code (e.g., EN, FR)',
      '  --pending-changes      Fetch pending/draft content',
    ],
  },
  'generate-types': {
    name: 'generate-types',
    description: 'Generate TypeScript type definitions from content',
    usage: 'contentstorage generate-types [options]',
    options: [
      '  --output <file>        Output file for generated types',
      '  --content-key <key>    Content key for your project',
      '  --lang <code>          Language code (e.g., EN, FR)',
      '  --pending-changes      Use pending/draft content',
    ],
  },
};

function showHelp() {
  console.log(chalk.bold('\nContentStorage CLI'));
  console.log(chalk.dim('Manage content and generate TypeScript types\n'));

  console.log(chalk.bold('Usage:'));
  console.log('  contentstorage <command> [options]\n');

  console.log(chalk.bold('Commands:'));
  Object.values(COMMANDS).forEach((cmd) => {
    console.log(`  ${chalk.cyan(cmd.name.padEnd(20))} ${cmd.description}`);
  });

  console.log(chalk.bold('\nOptions:'));
  console.log('  --help                 Show help for a command\n');

  console.log(chalk.dim('Examples:'));
  console.log(chalk.dim('  contentstorage pull --content-key abc123'));
  console.log(chalk.dim('  contentstorage generate-types --output types.ts'));
  console.log(
    chalk.dim('  contentstorage pull --help    # Show help for pull command\n')
  );
}

function showCommandHelp(commandName: string) {
  const cmd = COMMANDS[commandName as keyof typeof COMMANDS];
  if (!cmd) {
    console.error(chalk.red(`Unknown command: ${commandName}`));
    process.exit(1);
  }

  console.log(chalk.bold(`\n${cmd.name}`));
  console.log(chalk.dim(cmd.description + '\n'));

  console.log(chalk.bold('Usage:'));
  console.log(`  ${cmd.usage}\n`);

  if (cmd.options.length > 0) {
    console.log(chalk.bold('Options:'));
    cmd.options.forEach((opt) => console.log(opt));
    console.log('');
  }
}

async function main() {
  const args = process.argv.slice(2);

  // No arguments - show help
  if (args.length === 0) {
    showHelp();
    process.exit(0);
  }

  const command = args[0];

  // Global --help flag
  if (command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  // Command-specific --help
  if (args.includes('--help') || args.includes('-h')) {
    showCommandHelp(command);
    process.exit(0);
  }

  // Route to commands
  switch (command) {
    case 'pull':
      await pullContent();
      break;

    case 'generate-types':
      await generateTypes();
      break;

    default:
      console.error(chalk.red(`Unknown command: ${command}\n`));
      console.log(chalk.dim('Run "contentstorage --help" for usage'));
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('Unexpected error:'), error);
  process.exit(1);
});
