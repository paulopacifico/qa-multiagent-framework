import fs from 'fs';
import path from 'path';
import { Phase, GateDecision, GateReport } from '../types';
import { resolveAgent } from './router';
import { enforceGate, GateBlockedError } from './gate-enforcer';
import { buildFeatureGatesDir, persistGateReport } from './gate-persister';
import { runQaSpecAgent } from '../agents/qa-spec';
import { runQaPlanAgent, PlanInput } from '../agents/qa-plan';
import { runQaCodeAgent, CodeInput } from '../agents/qa-code';
import { runQaCiAgent, CiRunResult } from '../agents/qa-ci';

export interface OrchestratorRequest {
  artifact_path: string;
  phase: Phase;
  feature_id: string;
  gates_dir?: string;
  accept_warn?: boolean;
  acceptance_reason?: string;
}

export { GateBlockedError };

export async function orchestrate(request: OrchestratorRequest): Promise<GateDecision> {
  const { phase, feature_id, gates_dir, accept_warn, acceptance_reason } = request;

  resolveAgent(phase);

  const report = await runPhaseAgent(request);
  const outputDir = gates_dir ?? buildFeatureGatesDir(feature_id);

  persistGateReport(report, outputDir);

  return enforceGate(report, accept_warn, acceptance_reason);
}

async function runPhaseAgent(request: OrchestratorRequest): Promise<GateReport> {
  switch (request.phase) {
    case 'spec':
      return runQaSpecAgent(readTextFile(request.artifact_path));
    case 'plan':
      return runQaPlanAgent(loadPlanInput(request.artifact_path));
    case 'code':
      return runQaCodeAgent(loadCodeInput(request.artifact_path));
    case 'ci':
      return runQaCiAgent(readJsonFile<CiRunResult>(request.artifact_path));
  }
}

function loadPlanInput(artifactPath: string): PlanInput {
  if (artifactPath.endsWith('.json')) {
    return readJsonFile<PlanInput>(artifactPath);
  }

  const featureDir = path.dirname(artifactPath);
  const specContent = readTextFile(path.join(featureDir, 'spec.md'));

  return {
    planContent: readTextFile(artifactPath),
    dataModelContent: readTextFile(path.join(featureDir, 'data-model.md')),
    specRequirements: extractSpecRequirements(specContent),
    specEntities: extractSpecEntities(specContent),
  };
}

function loadCodeInput(artifactPath: string): CodeInput {
  if (artifactPath.endsWith('.json')) {
    return readJsonFile<CodeInput>(artifactPath);
  }

  const stat = fs.statSync(artifactPath);
  if (stat.isDirectory()) {
    return { files: loadCodeFiles(artifactPath) };
  }

  return {
    files: [
      {
        path: path.relative(process.cwd(), artifactPath),
        content: readTextFile(artifactPath),
      },
    ],
  };
}

function loadCodeFiles(dir: string): CodeInput['files'] {
  const files: CodeInput['files'] = [];

  function walk(current: string): void {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      const relativePath = path.relative(process.cwd(), fullPath);

      if (entry.isDirectory()) {
        if (!shouldSkipCodeDirectory(relativePath)) walk(fullPath);
        continue;
      }

      if (entry.name.endsWith('.ts')) {
        files.push({ path: relativePath, content: readTextFile(fullPath) });
      }
    }
  }

  walk(dir);
  return files;
}

function shouldSkipCodeDirectory(relativePath: string): boolean {
  return ['node_modules', 'dist', 'coverage'].some((dir) => relativePath.startsWith(dir));
}

function extractSpecRequirements(specContent: string): string[] {
  const matches = specContent.match(/\*\*FR-\d+\*\*/g) ?? [];
  return [...new Set(matches.map((match) => match.replace(/\*\*/g, '')))];
}

function extractSpecEntities(specContent: string): string[] {
  const section =
    specContent.match(/###\s*Key Entities\s*\n([\s\S]*?)(?=\n##\s|\n###\s|$)/i)?.[1] ?? '';
  const entities = [...section.matchAll(/-\s+\*\*(.+?)\*\*/g)].map((match) => match[1].trim());
  return [...new Set(entities)];
}

function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf-8');
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(readTextFile(filePath)) as T;
}
