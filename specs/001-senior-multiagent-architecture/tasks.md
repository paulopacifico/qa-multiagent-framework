# Implementation Tasks: QA Senior Multi-Agent Framework

## Phase 1: Foundation

- [ ] 1.1 Initialize TypeScript project with strict mode
  - `npm init -y`, install `typescript`, `@types/node`
  - `tsconfig.json` with `strict: true`, `target: ES2022`, `module: CommonJS`
  - Create `src/` and `tests/` directory structure per plan
  - **Depends on**: None
  - **Requirement**: FR-001, FR-010

- [ ] 1.2 [P] Configure Playwright with Allure reporter
  - Install `@playwright/test`, `allure-playwright`
  - `playwright.config.ts`: 4 workers, 30s timeout, screenshot on failure, allure reporter
  - Create `tests/pages/` and `tests/specs/` directories
  - **Depends on**: 1.1
  - **Requirement**: FR-004 (QA-Code POM enforcement depends on this structure)

- [ ] 1.3 [P] Define Gate Report TypeScript interfaces
  - Create `src/types/gate-report.ts` with `GateReport`, `Finding`, `Phase` types
  - Export from `src/types/index.ts`
  - **Depends on**: 1.1
  - **Requirement**: FR-009

## Phase 2: QA Sub-Agents

- [ ] 2.1 Implement QA-Spec Agent
  - `src/agents/qa-spec/checklist.ts`: 5 constitution rules as typed checklist items
  - `src/agents/qa-spec/index.ts`: reads spec.md, runs checklist, returns GateReport
  - Unit tests: valid spec → PASS, ambiguous FR → FAIL, missing out-of-scope → WARN
  - **Depends on**: 1.3
  - **Requirement**: FR-002, FR-009

- [ ] 2.2 [P] Implement QA-Plan Agent
  - `src/agents/qa-plan/checklist.ts`: 5 constitution rules
  - `src/agents/qa-plan/index.ts`: reads plan.md + data-model.md, cross-references FR list
  - Unit tests: full coverage → PASS, missing FR → FAIL, no POM declaration → FAIL
  - **Depends on**: 1.3
  - **Requirement**: FR-003, FR-009

- [ ] 2.3 [P] Implement QA-Code Agent
  - `src/agents/qa-code/checklist.ts`: selector hygiene, POM location, Allure annotation, `any` type rules
  - `src/agents/qa-code/index.ts`: reads git diff / file list, applies checklist
  - Unit tests: clean POM PR → PASS, raw selector in test file → FAIL
  - **Depends on**: 1.3
  - **Requirement**: FR-004, FR-009

- [ ] 2.4 [P] Implement QA-CI Agent
  - `src/agents/qa-ci/checklist.ts`: pass/fail check, Allure artifact, runtime threshold, flakiness
  - `src/agents/qa-ci/index.ts`: parses GitHub Actions run result JSON
  - Unit tests: all-pass run → PASS, any failure → FAIL, retry detected → WARN
  - **Depends on**: 1.3
  - **Requirement**: FR-005, FR-009

## Phase 3: Orchestrator

- [ ] 3.1 Implement phase router
  - `src/orchestrator/router.ts`: maps `phase` string to sub-agent module
  - Validates phase is one of `spec | plan | code | ci`; throws on unknown
  - **Depends on**: 2.1, 2.2, 2.3, 2.4
  - **Requirement**: FR-001

- [ ] 3.2 Implement gate enforcer
  - `src/orchestrator/gate-enforcer.ts`: evaluates GateReport status
  - FAIL → throws `GateBlockedError` with full report
  - WARN → logs warning, requires `--accept-warn` flag or throws
  - PASS → returns `GateDecision { allowed: true }`
  - **Depends on**: 1.3
  - **Requirement**: FR-007, FR-008

- [ ] 3.3 Implement Orchestrator entry point
  - `src/orchestrator/index.ts`: parses CLI args `{ artifact_path, phase, feature_id }`
  - Calls router → sub-agent → gate enforcer → persists gate report JSON
  - Integration tests: full PASS flow, full FAIL flow, WARN with acceptance flag
  - **Depends on**: 3.1, 3.2
  - **Requirement**: FR-001, FR-006

## Phase 4: Gate Persistence

- [ ] 4.1 Implement gate report persistence
  - `src/orchestrator/gate-persister.ts`: writes gate report to `specs/<feature_id>/qa-gates/<phase>-gate.json`
  - Creates `qa-gates/` directory if absent
  - Validates output JSON matches `GateReport` schema before writing
  - **Depends on**: 3.3
  - **Requirement**: FR-006

## Phase 5: GitHub Actions Integration

- [ ] 5.1 Create QA Gates GitHub Actions workflow
  - `.github/workflows/qa-gates.yml`: CI pipeline runs lint, unit tests, E2E tests, and QA gates
  - Each job calls Orchestrator with correct `--phase` argument
  - Playwright job uploads Allure results as artifact
  - **Depends on**: 3.3
  - **Requirement**: FR-010

- [ ] 5.2 [P] Create sample POM and test to validate framework
  - `tests/pages/sample.page.ts`: sample POM class with one selector
  - `tests/specs/sample.spec.ts`: test using POM, Allure annotation, maps to FR-001
  - Confirms code gate PASSes on compliant test, FAILs on raw selector
  - **Depends on**: 1.2, 2.3
  - **Requirement**: FR-004

## Phase 6: End-to-End Validation

- [ ] 6.1 Run full QA gate pipeline locally
  - Execute Orchestrator for each phase against the spec/plan in this repo
  - All 4 gates must PASS; gate reports persisted to `specs/<feature_id>/qa-gates/`
  - **Depends on**: 4.1, 5.2
  - **Requirement**: SC-001, SC-002, SC-005

- [ ] 6.2 Run Playwright suite in CI mode locally
  - `npx playwright test` must complete under 10 min
  - Allure report generated in `allure-results/`
  - **Depends on**: 5.1, 6.1
  - **Requirement**: SC-004

## Notes

- `[P]` = can run in parallel with sibling tasks in same phase
- Every task that writes code must have corresponding tests before implementation (TDD)
- Gate report files committed to repo serve as permanent audit trail
- QA-CI agent requires `GITHUB_TOKEN` env var in CI (read-only scope sufficient)
