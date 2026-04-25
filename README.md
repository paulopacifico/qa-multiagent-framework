# QA Multi-Agent Framework

A multi-agent quality gate system built with TypeScript. It validates every phase of a software project before work advances. Each phase is reviewed by a dedicated QA agent that produces a structured gate report. A central Orchestrator enforces the gate decision, blocking progression on failure.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Allure](https://img.shields.io/badge/Allure-FF6347?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgMjJoMjBMMTIgMnoiLz48L3N2Zz4=&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

[![CI](https://github.com/paulopacifico/qa-multiagent-framework/actions/workflows/qa-gates.yml/badge.svg)](https://github.com/paulopacifico/qa-multiagent-framework/actions/workflows/qa-gates.yml)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)
![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square)

---

## Overview

Traditional QA happens after the code is written. This framework moves quality checks to every transition point in the development lifecycle, from the moment a requirement is written to the final CI run.

Each agent operates independently, applies a deterministic checklist, and returns a typed `GateReport`. The Orchestrator reads the report and either allows the phase to proceed or throws a `GateBlockedError` that halts the pipeline.

```
Orchestrator
    │
    ├── spec  ──► QA-Spec Agent  ──► spec-gate.json
    ├── plan  ──► QA-Plan Agent  ──► plan-gate.json
    ├── code  ──► QA-Code Agent  ──► code-gate.json
    └── ci    ──► QA-CI Agent    ──► ci-gate.json
```

---

## Gate Rules

| Status | Behavior |
|--------|----------|
| `PASS` | Phase advances |
| `WARN` | Blocked unless `accept_warn: true` and a written `acceptance_reason` are provided |
| `FAIL` | Unconditionally blocked, no override |

All gate reports are persisted as JSON files for audit traceability.

---

## Agents

### QA-Spec
Validates the feature specification before any technical planning begins.

| Finding | Severity |
|---------|----------|
| `AMBIGUOUS_REQUIREMENT` | FAIL |
| `INCOMPLETE_ARTIFACT` | FAIL |
| `DUPLICATE_FR` | FAIL |
| `MISSING_OUT_OF_SCOPE` | WARN |

### QA-Plan
Validates the implementation plan against the specification requirements.

| Finding | Severity |
|---------|----------|
| `UNCOVERED_REQUIREMENT` | FAIL |
| `POM_NOT_DECLARED` | FAIL |
| `TYPESCRIPT_STRICT_MISSING` | FAIL |
| `ENTITY_MISMATCH` | FAIL |
| `ORPHANED_COMPONENT` | WARN |

### QA-Code
Validates pull request files for Page Object Model compliance and TypeScript standards.

| Finding | Severity |
|---------|----------|
| `RAW_SELECTOR_IN_TEST` | FAIL |
| `ANY_TYPE_VIOLATION` | FAIL |
| `POM_WRONG_LOCATION` | FAIL |
| `UNMAPPED_TEST` | WARN |

### QA-CI
Validates the GitHub Actions run result after the test suite executes.

| Finding | Severity |
|---------|----------|
| `TEST_FAILURES` | FAIL |
| `MISSING_ALLURE_ARTIFACT` | FAIL |
| `SUITE_TIMEOUT` | WARN |
| `FLAKY_TEST_DETECTED` | WARN |

---

## Gate Report Schema

Every agent produces a report with the following shape:

```typescript
interface GateReport {
  phase: 'spec' | 'plan' | 'code' | 'ci';
  agent: 'QA-Spec' | 'QA-Plan' | 'QA-Code' | 'QA-CI';
  status: 'PASS' | 'WARN' | 'FAIL';
  findings: Finding[];
  recommendation: string;
  timestamp: string; // ISO 8601
}

interface Finding {
  type: string;
  severity: 'FAIL' | 'WARN';
  message: string;
  location?: string;
  constitution_ref?: string;
}
```

Example output:

```json
{
  "phase": "code",
  "agent": "QA-Code",
  "status": "FAIL",
  "findings": [
    {
      "type": "RAW_SELECTOR_IN_TEST",
      "severity": "FAIL",
      "location": "tests/specs/checkout.spec.ts:17",
      "message": "page.locator('button.submit') called directly in test file. Move to a POM class in tests/pages/.",
      "constitution_ref": "Principle IV: Page Object Model"
    }
  ],
  "recommendation": "Move selector to tests/pages/checkout.page.ts and call via CheckoutPage instance.",
  "timestamp": "2026-04-20T15:30:00.000Z"
}
```

---

## Project Structure

```
src/
├── agents/
│   ├── qa-spec/          # Validates spec.md against constitution rules
│   ├── qa-plan/          # Validates plan.md for requirement coverage and architecture
│   ├── qa-code/          # Validates PR files for POM compliance and TypeScript standards
│   └── qa-ci/            # Validates GitHub Actions run results
├── orchestrator/
│   ├── index.ts          # Entry point: routes, runs agent, persists report, enforces gate
│   ├── router.ts         # Maps Phase to agent function
│   ├── gate-enforcer.ts  # PASS/WARN/FAIL decision logic
│   └── gate-persister.ts # Writes gate report JSON to disk
└── types/
    └── gate-report.ts    # Shared TypeScript interfaces

tests/
├── unit/                 # 63 unit tests (Jest + ts-jest)
├── pages/                # Page Object Model classes
└── specs/                # Playwright E2E tests

scripts/
└── run-gates.ts          # Run the full QA gate pipeline locally

specs/
└── <feature-id>/
    └── qa-gates/         # Persisted gate reports by feature
        ├── spec-gate.json
        ├── plan-gate.json
        ├── code-gate.json
        └── ci-gate.json

.github/
└── workflows/
    └── qa-gates.yml      # CI pipeline: lint, tests, QA gates, Allure upload
```

---

## Getting Started

**Requirements:** Node.js >= 20

```bash
git clone https://github.com/paulopacifico/qa-multiagent-framework.git
cd qa-multiagent-framework
npm install
```

Install Playwright browsers:

```bash
npx playwright install chromium
```

---

## Usage

| Command | Description |
|---------|-------------|
| `npm test` | Run all 63 unit tests |
| `npm run test:e2e` | Run Playwright E2E suite |
| `npm run gates` | Run the full QA gate pipeline locally |
| `npm run typecheck` | TypeScript strict check |
| `npm run lint` | ESLint check |
| `npm run format` | Prettier format |
| `npm run build` | Compile to `dist/` |
| `npm run ci` | Full CI check: typecheck + lint + tests + gates |

---

## License

MIT
