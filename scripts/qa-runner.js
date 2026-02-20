#!/usr/bin/env node
/**
 * QA Test Runner & Reporting Script
 * Agent 7 - QA Testing Agent
 * 
 * Usage:
 *   node scripts/qa-runner.js [options]
 * 
 * Options:
 *   --unit          Run unit tests only
 *   --e2e           Run E2E tests only
 *   --coverage      Generate coverage report
 *   --report        Generate status report
 *   --all           Run all tests (default)
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function runCommand(command, description) {
    log(`\n📋 ${description}...`, 'cyan');
    try {
        const result = execSync(command, { 
            cwd: rootDir, 
            encoding: 'utf-8',
            stdio: 'pipe'
        });
        log(`✅ ${description} - PASSED`, 'green');
        return { success: true, output: result };
    } catch (error) {
        log(`❌ ${description} - FAILED`, 'red');
        return { success: false, output: error.stdout || error.message };
    }
}

function generateReport(results) {
    const timestamp = new Date().toISOString();
    const day = Math.floor(Date.now() / (1000 * 60 * 60 * 24));
    
    const report = {
        timestamp,
        day,
        summary: {
            total: results.length,
            passed: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        },
        results: results.map(r => ({
            name: r.name,
            status: r.success ? 'PASS' : 'FAIL',
            output: r.output
        }))
    };

    // Generate markdown report
    let markdown = `# QA STATUS - Day ${day}\n\n`;
    markdown += `**Generated:** ${timestamp}\n\n`;
    markdown += `## Summary\n\n`;
    markdown += `- **Total Tests:** ${report.summary.total}\n`;
    markdown += `- **Passed:** ${report.summary.passed} ✅\n`;
    markdown += `- **Failed:** ${report.summary.failed} ❌\n\n`;
    
    markdown += `## Tested Today\n\n`;
    results.forEach(r => {
        const icon = r.success ? '✅' : '❌';
        markdown += `- ${icon} **${r.name}**: ${r.success ? 'PASS' : 'FAIL'}\n`;
    });
    
    markdown += `\n## Details\n\n`;
    results.forEach(r => {
        markdown += `### ${r.name}\n\n`;
        markdown += `\`\`\`\n${r.output}\n\`\`\`\n\n`;
    });

    // Ensure reports directory exists
    const reportsDir = join(rootDir, 'tests', 'reports');
    if (!existsSync(reportsDir)) {
        mkdirSync(reportsDir, { recursive: true });
    }

    // Write report
    const reportPath = join(reportsDir, `qa-report-day-${day}.md`);
    writeFileSync(reportPath, markdown);
    log(`\n📄 Report saved to: ${reportPath}`, 'blue');

    // Also save JSON for programmatic access
    const jsonPath = join(reportsDir, `qa-report-day-${day}.json`);
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    return report;
}

async function main() {
    const args = process.argv.slice(2);
    const runUnit = args.includes('--unit') || args.includes('--all') || args.length === 0;
    const runE2E = args.includes('--e2e') || args.includes('--all') || args.length === 0;
    const runCoverage = args.includes('--coverage');
    const generateStatus = args.includes('--report');

    log('\n╔════════════════════════════════════════╗', 'cyan');
    log('║     AGENT 7: QA TESTING AGENT          ║', 'cyan');
    log('║     Running Test Suite...              ║', 'cyan');
    log('╚════════════════════════════════════════╝', 'cyan');

    const results = [];

    // Run Unit Tests
    if (runUnit) {
        const backendTest = runCommand(
            'npm run test:backend',
            'Backend Unit Tests (MCP Platform)'
        );
        results.push({ name: 'Backend Unit Tests', ...backendTest });

        const frontendTest = runCommand(
            runCoverage ? 'npx vitest run --coverage' : 'npm run test:frontend',
            'Frontend Unit Tests'
        );
        results.push({ name: 'Frontend Unit Tests', ...frontendTest });
    }

    // Run E2E Tests
    if (runE2E) {
        const e2eTest = runCommand(
            'npm run test:e2e',
            'E2E Tests (Playwright)'
        );
        results.push({ name: 'E2E Tests', ...e2eTest });
    }

    // Generate report
    if (generateStatus || results.length > 0) {
        const report = generateReport(results);
        
        log('\n╔════════════════════════════════════════╗', 'cyan');
        log('║     QA TEST SUMMARY                    ║', 'cyan');
        log('╚════════════════════════════════════════╝', 'cyan');
        log(`Total: ${report.summary.total}`, 'blue');
        log(`Passed: ${report.summary.passed} ✅`, 'green');
        log(`Failed: ${report.summary.failed} ❌`, report.summary.failed > 0 ? 'red' : 'green');

        // Exit with error code if any tests failed
        if (report.summary.failed > 0) {
            log('\n⚠️  Some tests failed. Review the report for details.', 'yellow');
            process.exit(1);
        } else {
            log('\n🎉 All tests passed!', 'green');
            process.exit(0);
        }
    }
}

main().catch(error => {
    log(`\n💥 Error: ${error.message}`, 'red');
    process.exit(1);
});
