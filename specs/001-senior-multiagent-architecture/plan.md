# Implementation Plan: QA Senior Multi-Agent Framework

**Branch**: `001-senior-multiagent-architecture` | **Date**: 2026-04-20 | **Spec**: `specs/001-senior-multiagent-architecture/spec.md`

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                         ORCHESTRATOR AGENT                        │
│  Accepts: { artifact_path, phase }                               │
│  Dispatches to → QA sub-agent for that phase                     │
│  Enforces gate decision (PASS/WARN/FAIL)                         │
│  Persists gate report to qa-gates/<phase>-gate.json              │
└────────────────────┬─────────────────────────────────────────────┘
                     │ dispatches via Agent tool
         ┌───────────┼────────────────────────────────┐
         ▼           ▼             ▼                  ▼
  ┌────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐
  │  QA-Spec   │ │ QA-Plan  │ │ QA-Code  │ │   QA-CI     │
  │  sub-agent │ │ sub-agent│ │ sub-agent│ │  sub-agent  │
  └────────────┘ └──────────┘ └──────────┘ └─────────────┘
  Input: spec.md  Input:       Input: PR   Input: CI run
                  plan.md +    diff/files  result JSON
                  data-model
  Output: ──────────────────────────────────────────────►
          spec-gate.json  plan-gate.json  code-gate.json  ci-gate.json
```

---

## Technology Stack

- **Orchestrator & Sub-Agents**: Claude Code agents (Claude SDK / Agent tool)
- **E2E Layer**: Playwright + TypeScript (strict mode)
- **Test Pattern**: Page Object Model (mandatory)
- **CI**: GitHub Actions
- **Reporting**: Allure HTML + screenshots on failure
- **Gate Persistence**: JSON files in `.specify/specs/NNN/qa-gates/`

---

## Component Design

### 1. Orchestrator Agent (`src/orchestrator/`)

**Responsibility**: Accept `{ artifact_path, phase }`, dispatch to correct QA sub-agent, evaluate gate report, enforce gate decision.

**Interfaces**:
- Input: `OrchestratorRequest { artifact_path: string, phase: Phase, feature_id: string }`
- Output: `GateDecision { allowed: boolean, gate_report: GateReport }`

**Logic**:
```
receive request
  → validate phase is one of spec|plan|code|ci
  → dispatch Agent(qa_<phase>_agent_prompt, artifact)
  → receive GateReport JSON
  → persist to qa-gates/<phase>-gate.json
  → if status === FAIL: block + notify
  → if status === WARN: require written acceptance before allowing
  → if status === PASS: allow
```

**Depends on**: All QA sub-agents

---

### 2. QA-Spec Sub-Agent (`src/agents/qa-spec/`)

**Responsibility**: Validate `spec.md` against constitution rules.

**Checklist** (produces FAIL on any violation):
- [ ] All user stories have measurable acceptance criteria (no "should", "might")
- [ ] No `[NEEDS CLARIFICATION]` markers remain
- [ ] Out-of-scope section is present
- [ ] All FRs use "MUST" or "MUST NOT" (RFC 2119)
- [ ] No duplicate FR numbers

**Gate**: `qa-gates/spec-gate.json`

**Finding types**: `AMBIGUOUS_REQUIREMENT`, `MISSING_ACCEPTANCE_CRITERIA`, `MISSING_OUT_OF_SCOPE`, `INCOMPLETE_ARTIFACT`, `DUPLICATE_FR`

---

### 3. QA-Plan Sub-Agent (`src/agents/qa-plan/`)

**Responsibility**: Validate `plan.md` and `data-model.md` for requirement coverage and architectural compliance.

**Checklist** (produces FAIL on any violation):
- [ ] Every FR from spec has a corresponding plan component
- [ ] POM pattern declared in E2E architecture section
- [ ] TypeScript strict mode declared
- [ ] No orphaned plan components (components with no FR mapping)
- [ ] Data model entities match spec Key Entities

**Gate**: `qa-gates/plan-gate.json`

**Finding types**: `UNCOVERED_REQUIREMENT`, `POM_NOT_DECLARED`, `TYPESCRIPT_STRICT_MISSING`, `ORPHANED_COMPONENT`, `ENTITY_MISMATCH`

---

### 4. QA-Code Sub-Agent (`src/agents/qa-code/`)

**Responsibility**: Validate PR diff for POM compliance, selector hygiene, TypeScript strictness, and spec traceability.

**Checklist** (produces FAIL on any violation):
- [ ] No `page.locator()`, `page.fill()`, `page.click()` directly in test files (must be in POM classes)
- [ ] Every test maps to a spec acceptance criterion via `@spec:FR-XXX` annotation or describe block
- [ ] No `any` types in TypeScript
- [ ] Allure `@allure.label` or `test.info().annotations` present per test
- [ ] POM classes live under `pages/` directory

**Gate**: `qa-gates/code-gate.json`

**Finding types**: `RAW_SELECTOR_IN_TEST`, `UNMAPPED_TEST`, `ANY_TYPE_VIOLATION`, `MISSING_ALLURE_ANNOTATION`, `POM_WRONG_LOCATION`

---

### 5. QA-CI Sub-Agent (`src/agents/qa-ci/`)

**Responsibility**: Validate GitHub Actions run result for pass/fail, Allure presence, runtime, and flakiness.

**Checklist** (produces FAIL on any violation):
- [ ] All tests passed (exit code 0, no failed test IDs)
- [ ] Allure report artifact uploaded in CI
- [ ] Suite runtime under 10 minutes
- [ ] No test retried more than once (flakiness signal)

**Gate**: `qa-gates/ci-gate.json`

**Finding types**: `TEST_FAILURES`, `MISSING_ALLURE_ARTIFACT`, `SUITE_TIMEOUT`, `FLAKY_TEST_DETECTED`

---

## Gate Report Schema

```typescript
interface GateReport {
  phase: 'spec' | 'plan' | 'code' | 'ci';
  agent: string;
  status: 'PASS' | 'WARN' | 'FAIL';
  findings: Finding[];
  recommendation: string;
  timestamp: string; // ISO 8601
}

interface Finding {
  type: string;          // e.g. RAW_SELECTOR_IN_TEST
  severity: 'FAIL' | 'WARN';
  location?: string;     // file:line if applicable
  message: string;
  constitution_ref?: string; // principle cited
}
```

---

## Phase-to-Agent Routing

| Phase   | Trigger                        | Agent      | Input Artifact      | Output Gate        |
|---------|--------------------------------|------------|---------------------|--------------------|
| spec    | spec.md saved + PR opened      | QA-Spec    | spec.md             | spec-gate.json     |
| plan    | plan.md + data-model.md ready  | QA-Plan    | plan.md, data-model | plan-gate.json     |
| code    | PR opened / push to branch     | QA-Code    | git diff / PR files | code-gate.json     |
| ci      | GitHub Actions workflow run    | QA-CI      | GHA run result JSON | ci-gate.json       |

---

## GitHub Actions Integration

```yaml
# .github/workflows/qa-gates.yml
on: [pull_request]
jobs:
  qa-spec-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: QA-Spec Gate
        run: npx claude-code-agent qa-spec --artifact specs/.../spec.md

  qa-plan-gate:
    runs-on: ubuntu-latest
    needs: qa-spec-gate
    steps:
      - name: QA-Plan Gate
        run: npx claude-code-agent qa-plan --artifact specs/.../plan.md

  qa-code-gate:
    runs-on: ubuntu-latest
    needs: qa-plan-gate
    steps:
      - name: QA-Code Gate
        run: npx claude-code-agent qa-code --pr-diff ${{ github.event.pull_request.diff_url }}

  playwright-suite:
    runs-on: ubuntu-latest
    needs: qa-code-gate
    steps:
      - name: Run Playwright Tests
        run: npx playwright test --reporter=allure-playwright
      - name: Upload Allure Report
        uses: actions/upload-artifact@v4
        with:
          name: allure-report
          path: allure-results/

  qa-ci-gate:
    runs-on: ubuntu-latest
    needs: playwright-suite
    steps:
      - name: QA-CI Gate
        run: npx claude-code-agent qa-ci --run-id ${{ github.run_id }}
```

---

## Project Directory Structure

```
qa-multiagent-framework/
├── src/
│   ├── orchestrator/
│   │   ├── index.ts              # Orchestrator entry point
│   │   ├── router.ts             # Phase → agent routing
│   │   └── gate-enforcer.ts      # PASS/WARN/FAIL decision
│   └── agents/
│       ├── qa-spec/
│       │   ├── index.ts
│       │   └── checklist.ts
│       ├── qa-plan/
│       │   ├── index.ts
│       │   └── checklist.ts
│       ├── qa-code/
│       │   ├── index.ts
│       │   └── checklist.ts
│       └── qa-ci/
│           ├── index.ts
│           └── checklist.ts
├── tests/                        # Playwright E2E tests
│   ├── pages/                    # POM classes
│   │   └── *.page.ts
│   └── specs/                    # Test files
│       └── *.spec.ts
├── .github/
│   └── workflows/
│       └── qa-gates.yml
├── playwright.config.ts
├── tsconfig.json                 # strict: true
└── package.json
```

---

## Security Considerations

- Gate reports must not contain secrets or API keys from CI logs
- QA-CI agent accesses GitHub run results via `GITHUB_TOKEN` with read-only scope
- No write access to the repo from sub-agents; they only produce JSON gate reports

---

## Alignment Check

- [x] Plan covers all 10 FRs from spec
- [x] POM pattern declared in QA-Code component
- [x] TypeScript strict declared
- [x] Constitution principles I–V all addressed
- [x] Gate report schema satisfies FR-009
- [x] GitHub Actions integration satisfies FR-010
