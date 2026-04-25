# Data Model: QA Senior Multi-Agent Framework

## Entity Relationship

```
Orchestrator
    │ dispatches (1..*)
    ▼
QA Sub-Agent ──produces──► GateReport
                               │
                               │ contains (1..*)
                               ▼
                            Finding
```

## TypeScript Interfaces

### Phase
```typescript
type Phase = 'spec' | 'plan' | 'code' | 'ci';
```

### Finding
```typescript
interface Finding {
  type: string;           // AMBIGUOUS_REQUIREMENT | RAW_SELECTOR_IN_TEST | ...
  severity: 'FAIL' | 'WARN';
  location?: string;      // "src/tests/login.spec.ts:42"
  message: string;
  constitution_ref?: string; // "Principle IV: Page Object Model"
}
```

### GateReport
```typescript
interface GateReport {
  phase: Phase;
  agent: 'QA-Spec' | 'QA-Plan' | 'QA-Code' | 'QA-CI';
  status: 'PASS' | 'WARN' | 'FAIL';
  findings: Finding[];
  recommendation: string;
  timestamp: string; // ISO 8601
}
```

### OrchestratorRequest
```typescript
interface OrchestratorRequest {
  artifact_path: string;   // path to spec.md, plan.md, diff, or CI run JSON
  phase: Phase;
  feature_id: string;      // e.g. "001-senior-multiagent-architecture"
  accept_warn?: boolean;   // flag to allow WARN gates to proceed
}
```

### GateDecision
```typescript
interface GateDecision {
  allowed: boolean;
  gate_report: GateReport;
  acceptance_reason?: string; // required when status === WARN
}
```

## Finding Type Registry

| Finding Type                | Severity | Produced By |
|-----------------------------|----------|-------------|
| `AMBIGUOUS_REQUIREMENT`     | FAIL     | QA-Spec     |
| `MISSING_ACCEPTANCE_CRITERIA` | FAIL   | QA-Spec     |
| `MISSING_OUT_OF_SCOPE`      | WARN     | QA-Spec     |
| `INCOMPLETE_ARTIFACT`       | FAIL     | QA-Spec     |
| `DUPLICATE_FR`              | FAIL     | QA-Spec     |
| `UNCOVERED_REQUIREMENT`     | FAIL     | QA-Plan     |
| `POM_NOT_DECLARED`          | FAIL     | QA-Plan     |
| `TYPESCRIPT_STRICT_MISSING` | FAIL     | QA-Plan     |
| `ORPHANED_COMPONENT`        | WARN     | QA-Plan     |
| `ENTITY_MISMATCH`           | FAIL     | QA-Plan     |
| `RAW_SELECTOR_IN_TEST`      | FAIL     | QA-Code     |
| `UNMAPPED_TEST`             | WARN     | QA-Code     |
| `ANY_TYPE_VIOLATION`        | FAIL     | QA-Code     |
| `MISSING_ALLURE_ANNOTATION` | WARN     | QA-Code     |
| `POM_WRONG_LOCATION`        | FAIL     | QA-Code     |
| `TEST_FAILURES`             | FAIL     | QA-CI       |
| `MISSING_ALLURE_ARTIFACT`   | FAIL     | QA-CI       |
| `SUITE_TIMEOUT`             | WARN     | QA-CI       |
| `FLAKY_TEST_DETECTED`       | WARN     | QA-CI       |
| `AGENT_TIMEOUT`             | WARN     | Orchestrator |

## Sample Gate Report (FAIL)

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
      "message": "page.locator('button.submit') called directly in test file; must be encapsulated in CheckoutPage POM class",
      "constitution_ref": "Principle IV: Page Object Model — Non-Negotiable"
    }
  ],
  "recommendation": "Move selector to tests/pages/checkout.page.ts and call via CheckoutPage instance in test",
  "timestamp": "2026-04-20T15:30:00.000Z"
}
```
