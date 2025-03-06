#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Patterns to replace
const replacements = [
  [/jest\.mock/g, 'vi.mock'],
  [/jest\.spyOn/g, 'vi.spyOn'],
  [/jest\.fn/g, 'vi.fn'],
  [/jest\.resetAllMocks/g, 'vi.resetAllMocks'],
  [/jest\.useFakeTimers/g, 'vi.useFakeTimers'],
  [/jest\.requireActual/g, 'vi.importActual'],
  [/jest\.clearAllMocks/g, 'vi.clearAllMocks'],
  [/jest\.mock\(['"]fs['"]\)/g, "vi.mock('node:fs')"],
  [/import \* as fs from ['"]fs['"];/g, "import * as fs from 'node:fs';"],
  [/from ['"]fs['"];/g, "from 'node:fs';"],
];

// Find all test files
const findTestFiles = (dir) => {
  let results = [];
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory() && !filePath.includes('node_modules')) {
      results = results.concat(findTestFiles(filePath));
    } else if (file.endsWith('.test.ts') || file.endsWith('.test.js')) {
      results.push(filePath);
    }
  }

  return results;
};

// Process a single file
const processFile = (filePath) => {
  console.log(`Processing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  fs.writeFileSync(filePath, content);
};

// Main execution
console.log('Finding test files...');
const testFiles = findTestFiles('.');

console.log(`Found ${testFiles.length} test files. Processing...`);
testFiles.forEach(processFile);

console.log('Migration complete! Please review the changes and run tests to verify.');
