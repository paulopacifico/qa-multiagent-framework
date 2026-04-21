import fs from 'fs';
import path from 'path';
import { runQaSpecAgent } from '../src/agents/qa-spec';
import { runQaPlanAgent, PlanInput } from '../src/agents/qa-plan';
import { runQaCodeAgent, CodeInput } from '../src/agents/qa-code';
import { persistGateReport } from '../src/orchestrator/gate-persister';
import { GateReport } from '../src/types';

const GATES_DIR = path.join(__dirname, '../qa-gates');
const SPEC_DIR = path.join(__dirname, '../specs/001-senior-multiagent-architecture');

function loadFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

const PROJECT_ROOT = path.resolve(__dirname, '..');

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
  const icon = report.status === 'PASS' ? '✓' : report.status === 'WARN' ? '⚠' : '✗';
  console.log(`\n[${icon}] ${report.agent} — ${report.status}`);
  if (report.findings.length > 0) {
    report.findings.forEach((f) => console.log(`   ${f.severity}: ${f.type} — ${f.message}`));
  }
  console.log(`   ${report.recommendation}`);
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
    specRequirements: ['FR-001', 'FR-002', 'FR-003', 'FR-004', 'FR-005',
                       'FR-006', 'FR-007', 'FR-008', 'FR-009', 'FR-010'],
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

  console.log('\n' + '='.repeat(40));

  const allPassed = [specReport, planReport, codeReport].every((r) => r.status !== 'FAIL');
  if (allPassed) {
    console.log('All QA gates passed. Safe to proceed to CI gate.');
  } else {
    console.log('One or more gates FAILED. Resolve findings before merging.');
    process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
