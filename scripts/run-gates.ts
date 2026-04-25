import fs from 'fs';
import path from 'path';
import { runQaSpecAgent } from '../src/agents/qa-spec';
import { runQaPlanAgent, PlanInput } from '../src/agents/qa-plan';
import { runQaCodeAgent, CodeInput } from '../src/agents/qa-code';
import { runQaCiAgent, CiRunResult } from '../src/agents/qa-ci';
import { buildFeatureGatesDir, persistGateReport } from '../src/orchestrator/gate-persister';
import { GateReport } from '../src/types';

const FEATURE_ID = '001-senior-multiagent-architecture';
const PROJECT_ROOT = path.resolve(__dirname, '..');
const GATES_DIR = buildFeatureGatesDir(FEATURE_ID, PROJECT_ROOT);
const SPEC_DIR = path.join(PROJECT_ROOT, 'specs', FEATURE_ID);
const ALLURE_RESULTS_DIR = path.join(PROJECT_ROOT, 'allure-results');

function loadFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function loadCodeFiles(dir: string, ext: string, exclude: string[] = []): CodeInput['files'] {
  if (!fs.existsSync(dir)) return [];
  const results: CodeInput['files'] = [];
  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(PROJECT_ROOT, fullPath);
      if (entry.isDirectory()) {
        if (!exclude.some((ex) => relativePath.startsWith(ex))) walk(fullPath);
      } else if (entry.name.endsWith(ext)) {
        if (!exclude.some((ex) => relativePath.startsWith(ex))) {
          results.push({ path: relativePath, content: fs.readFileSync(fullPath, 'utf-8') });
        }
      }
    }
  }
  walk(dir);
  return results;
}

function printReport(report: GateReport): void {
  const icon = report.status === 'PASS' ? 'PASS' : report.status === 'WARN' ? 'WARN' : 'FAIL';
  console.log(`\n[${icon}] ${report.agent}: ${report.status}`);
  if (report.findings.length > 0) {
    report.findings.forEach((f) => console.log(`   ${f.severity}: ${f.type} - ${f.message}`));
  }
  console.log(`   ${report.recommendation}`);
}

interface AllureResult {
  status?: string;
  name?: string;
  fullName?: string;
  start?: number;
  stop?: number;
}

function loadAllureResults(resultsDir: string): AllureResult[] {
  if (!fs.existsSync(resultsDir)) return [];

  return fs
    .readdirSync(resultsDir)
    .filter((file) => file.endsWith('-result.json'))
    .map((file) => {
      const parsed = JSON.parse(loadFile(path.join(resultsDir, file))) as AllureResult;
      return parsed;
    });
}

function buildCiRunResult(resultsDir: string): CiRunResult {
  const results = loadAllureResults(resultsDir);
  const failedResults = results.filter(
    (result) => result.status === 'failed' || result.status === 'broken',
  );
  const skippedResults = results.filter((result) => result.status === 'skipped');
  const durations = results
    .filter((result) => typeof result.start === 'number' && typeof result.stop === 'number')
    .map((result) => Math.max(0, Number(result.stop) - Number(result.start)));

  return {
    total: results.length,
    passed: results.filter((result) => result.status === 'passed').length,
    failed: failedResults.length,
    skipped: skippedResults.length,
    durationMs: durations.reduce((total, duration) => total + duration, 0),
    allureArtifactUploaded: results.length > 0,
    failedTestIds: failedResults.map((result) => result.fullName ?? result.name ?? 'unknown test'),
    retriedTests: [],
  };
}

async function main(): Promise<void> {
  console.log('Running QA Gate Pipeline\n' + '='.repeat(40));

  // Gate 1: QA-Spec
  const specContent = loadFile(path.join(SPEC_DIR, 'spec.md'));
  const specReport = await runQaSpecAgent(specContent);
  persistGateReport(specReport, GATES_DIR);
  printReport(specReport);

  // Gate 2: QA-Plan
  const planContent = loadFile(path.join(SPEC_DIR, 'plan.md'));
  const dataModelContent = loadFile(path.join(SPEC_DIR, 'data-model.md'));
  const planInput: PlanInput = {
    planContent,
    dataModelContent,
    specRequirements: [
      'FR-001',
      'FR-002',
      'FR-003',
      'FR-004',
      'FR-005',
      'FR-006',
      'FR-007',
      'FR-008',
      'FR-009',
      'FR-010',
    ],
    specEntities: ['Gate Report', 'Orchestrator', 'QA Sub-Agent', 'Phase'],
  };
  const planReport = await runQaPlanAgent(planInput);
  persistGateReport(planReport, GATES_DIR);
  printReport(planReport);

  // Gate 3: QA-Code — scan only Playwright E2E files (pages + specs), not framework source
  const testFiles = loadCodeFiles(path.join(PROJECT_ROOT, 'tests'), '.ts', ['tests/unit']);
  const codeInput: CodeInput = { files: testFiles };
  const codeReport = await runQaCodeAgent(codeInput);
  persistGateReport(codeReport, GATES_DIR);
  printReport(codeReport);

  // Gate 4: QA-CI - summarize the current Allure result files if present
  const ciReport = await runQaCiAgent(buildCiRunResult(ALLURE_RESULTS_DIR));
  persistGateReport(ciReport, GATES_DIR);
  printReport(ciReport);

  console.log('\n' + '='.repeat(40));

  const allPassed = [specReport, planReport, codeReport, ciReport].every(
    (r) => r.status !== 'FAIL',
  );
  if (allPassed) {
    console.log('All QA gates passed. Safe to proceed to CI gate.');
  } else {
    console.log('One or more gates FAILED. Resolve findings before merging.');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
