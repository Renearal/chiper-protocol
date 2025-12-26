#!/usr/bin/env node

/**
 * Postinstall script that only runs in local development
 * Skips execution in CI/production environments (Vercel, Netlify, GitHub Actions, etc.)
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if running in CI/production environment
const isCI = process.env.CI || 
             process.env.VERCEL || 
             process.env.NETLIFY ||
             process.env.GITHUB_ACTIONS ||
             process.env.GITLAB_CI ||
             process.env.CIRCLECI ||
             process.env.TRAVIS;

if (isCI) {
  console.log('⏭️  Skipping postinstall script in CI/production environment');
  process.exit(0);
}

// Run the hardhat deployment script only in local development
console.log('🚀 Running local development setup...');

const scriptPath = join(__dirname, 'deploy-hardhat-node.sh');

const child = spawn('bash', [scriptPath], {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('❌ Failed to run postinstall script:', error.message);
  // Don't fail the installation, just warn
  process.exit(0);
});

child.on('close', (code) => {
  if (code !== 0) {
    console.warn(`⚠️  Postinstall script exited with code ${code}`);
  }
  process.exit(0);
});

