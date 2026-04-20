# QA Multi-Agent Framework

A multi-agent quality gate system built with TypeScript that automatically reviews every phase of a software project before work advances. Each phase — spec, plan, code, and CI — is validated by a dedicated QA agent that produces a structured gate report. A central Orchestrator enforces the gate decision, blocking progression on any failure.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?style=for-the-badge&logo=playwright&logoColor=white)
![Allure](https://img.shields.io/badge/Allure-FF6347?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0id2hpdGUiIGQ9Ik0xMiAyTDIgMjJoMjBMMTIgMnoiLz48L3N2Zz4=&logoColor=white)
![GitHub Actions](https://img.shields.io/badge/GitHub_Actions-2088FF?style=for-the-badge&logo=githubactions&logoColor=white)

---

## How It Works

```
Orchestrator
    |
    |-- spec  --> QA-Spec Agent  --> spec-gate.json
    |-- plan  --> QA-Plan Agent  --> plan-gate.json
    |-- code  --> QA-Code Agent  --> code-gate.json
    |-- ci    --> QA-CI Agent    --> ci-gate.json
```

Every agent returns a `GateReport` with status `PASS`, `WARN`, or `FAIL`. The Orchestrator reads the report and either allows the phase to proceed or throws a `GateBlockedError` that stops the pipeline entirely.

---

## Agents

### QA-Spec
Validates the feature specification file before any technical planning begins.

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
  timestamp: string;
}

interface Finding {
  type: string;
  severity: 'FAIL' | 'WARN';
  message: string;
  location?: string;
  constitution_ref?: string;
}
```

Example FAIL report:

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

## Gate Rules

- `FAIL` blocks phase progression unconditionally, no override possible.
- `WARN` blocks by default. Allowed to proceed only with explicit `accept_warn: true` and a written `acceptance_reason`.
- All gate reports are persisted as JSON files for audit purposes.

---

## Project Structure

```
src/
├── agents/
│   ├── qa-spec/        # Spec validation agent
│   ├── qa-plan/        # Plan validation agent
│   ├── qa-code/        # Code review agent
│   └── qa-ci/          # CI result validation agent
├── orchestrator/
│   ├── index.ts        # Orchestrator entry point
│   ├── router.ts       # Phase-to-agent routing
│   └── gate-enforcer.ts # PASS/WARN/FAIL enforcement
└── types/
    └── gate-report.ts  # Shared TypeScript interfaces

tests/
├── unit/               # 46 unit tests (Jest + ts-jest)
└── specs/              # Playwright E2E tests
    └── pages/          # Page Object Model classes
```

---

## Getting Started

```bash
npm install
```

Run unit tests:

```bash
npm test
```

Run E2E tests:

```bash
npm run test:e2e
```

Type check:

```bash
npm run typecheck
```

Build:

```bash
npm run build
```
