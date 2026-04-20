import { GateReport, Finding } from '../../types';

export interface FileEntry {
  path: string;
  content: string;
}

export interface CodeInput {
  files: FileEntry[];
}

const RAW_SELECTOR_PATTERN = /\bpage\.(locator|fill|click|getByText|getByRole)\s*\(/;
const ANY_TYPE_PATTERN = /:\s*any\b|<any\b|Promise<any>/;
const FR_REFERENCE_PATTERN = /FR-\d+/;
const ALLURE_PATTERN = /allure\.|test\.info\(\)\.annotations/;

function isSpecFile(path: string): boolean {
  return path.includes('tests/specs/') && path.endsWith('.spec.ts');
}

function isPageFile(path: string): boolean {
  return path.endsWith('.page.ts');
}

export async function runQaCodeAgent(input: CodeInput): Promise<GateReport> {
  const findings: Finding[] = [];

  for (const file of input.files) {
    if (isSpecFile(file.path)) {
      const lines = file.content.split('\n');
      lines.forEach((line, idx) => {
        if (RAW_SELECTOR_PATTERN.test(line)) {
          findings.push({
            type: 'RAW_SELECTOR_IN_TEST',
            severity: 'FAIL',
            location: `${file.path}:${idx + 1}`,
            message: `Raw Playwright selector call found in spec file. Move to a POM class in tests/pages/.`,
            constitution_ref: 'Principle IV: Page Object Model',
          });
        }
      });

      const hasMapping = FR_REFERENCE_PATTERN.test(file.content) || ALLURE_PATTERN.test(file.content);
      if (!hasMapping) {
        findings.push({
          type: 'UNMAPPED_TEST',
          severity: 'WARN',
          location: file.path,
          message: 'Test file has no FR reference or allure label linking it to a spec requirement.',
          constitution_ref: 'Principle I: Shift-Left Quality',
        });
      }
    }

    if (isPageFile(file.path) && !file.path.startsWith('tests/pages/')) {
      findings.push({
        type: 'POM_WRONG_LOCATION',
        severity: 'FAIL',
        location: file.path,
        message: `POM class must live under tests/pages/. Found at: ${file.path}`,
        constitution_ref: 'Principle IV: Page Object Model',
      });
    }

    if (ANY_TYPE_PATTERN.test(file.content)) {
      findings.push({
        type: 'ANY_TYPE_VIOLATION',
        severity: 'FAIL',
        location: file.path,
        message: `File uses "any" type, which is forbidden under TypeScript strict mode.`,
        constitution_ref: 'Principle I: Shift-Left Quality',
      });
    }
  }

  const status = deriveStatus(findings);

  return {
    phase: 'code',
    agent: 'QA-Code',
    status,
    findings,
    recommendation:
      status === 'PASS'
        ? 'Code meets all POM and TypeScript standards. Proceed to CI gate.'
        : 'Resolve all FAIL findings before merging.',
    timestamp: new Date().toISOString(),
  };
}

function deriveStatus(findings: Finding[]): 'PASS' | 'WARN' | 'FAIL' {
  if (findings.some((f) => f.severity === 'FAIL')) return 'FAIL';
  if (findings.some((f) => f.severity === 'WARN')) return 'WARN';
  return 'PASS';
}
