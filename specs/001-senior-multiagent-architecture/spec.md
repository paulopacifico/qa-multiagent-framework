# Feature Specification: QA Senior Multi-Agent Framework

**Feature Branch**: `001-senior-multiagent-architecture`
**Created**: 2026-04-20
**Status**: Draft

## Overview

A multi-agent orchestration system where specialized QA Senior sub-agents review every phase of a software project (spec, plan, code, CI) before work advances. Built on top of the spec-kit workflow. The goal is to prevent bugs from reaching later stages by applying structured quality gates at each transition.

## User Scenarios & Testing

### User Story 1 - Orchestrator Dispatches QA Gate per Phase (Priority: P1)

An Engineering Lead (human or Orchestrator agent) submits an artifact (spec, plan, PR, CI result) to the QA Multi-Agent System. The system automatically routes it to the appropriate QA Senior sub-agent, receives a structured gate report, and either advances or blocks the work.

**Why this priority**: This is the core orchestration loop — nothing else functions without it.

**Independent Test**: Submitting a spec.md to the system produces a `spec-gate.json` with status PASS, WARN, or FAIL and at least one finding entry.

**Acceptance Scenarios**:

1. **Given** a completed `spec.md`, **When** the Orchestrator triggers the QA-Spec agent, **Then** a `specs/<feature-id>/qa-gates/spec-gate.json` report is produced within 60 seconds with valid status and findings.
2. **Given** a gate report with status FAIL, **When** the Orchestrator evaluates it, **Then** the next phase is blocked and the Engineering Lead is notified with the findings.
3. **Given** a gate report with status WARN, **When** the Orchestrator records written acceptance, **Then** the next phase may proceed with the WARN documented.

---

### User Story 2 - QA-Spec Agent Reviews Requirements (Priority: P1)

A QA Senior Spec agent receives a `spec.md` and validates it against the constitution: all stories are testable, no ambiguous requirements exist, acceptance criteria are measurable, out-of-scope is declared.

**Why this priority**: Catches requirement defects at the cheapest possible moment.

**Independent Test**: Providing a spec with one ambiguous FR produces a FAIL gate with `NEEDS_CLARIFICATION` finding.

**Acceptance Scenarios**:

1. **Given** a spec with all FRs clear and acceptance criteria testable, **When** QA-Spec agent runs, **Then** gate status is PASS.
2. **Given** a spec with an unresolved clarification marker, **When** QA-Spec agent runs, **Then** gate status is FAIL with finding type `AMBIGUOUS_REQUIREMENT`.
3. **Given** a spec with no out-of-scope section, **When** QA-Spec agent runs, **Then** gate status is WARN with finding `MISSING_OUT_OF_SCOPE`.

---

### User Story 3 - QA-Plan Agent Reviews Technical Plan (Priority: P1)

A QA Senior Plan agent receives `plan.md` and `data-model.md` and validates: all spec requirements are covered by plan components, no orphaned components, POM is respected in E2E layer, TypeScript strict is declared.

**Why this priority**: Prevents architecture drift before any code is written.

**Independent Test**: A plan missing coverage for one FR produces a FAIL with `UNCOVERED_REQUIREMENT` finding.

**Acceptance Scenarios**:

1. **Given** a plan covering all FRs with POM declared, **When** QA-Plan agent runs, **Then** gate status is PASS.
2. **Given** a plan missing architecture for FR-003, **When** QA-Plan agent runs, **Then** gate status is FAIL with `UNCOVERED_REQUIREMENT: FR-003`.
3. **Given** a plan not mentioning POM pattern, **When** QA-Plan agent runs, **Then** gate status is FAIL with `POM_NOT_DECLARED`.

---

### User Story 4 - QA-Code Agent Reviews Pull Requests (Priority: P2)

A QA Senior Code agent receives a git diff or PR and validates: POM compliance, no raw selectors in test files, TypeScript strict compliance, tests map to spec acceptance criteria, Allure annotations present.

**Why this priority**: Catches implementation deviations from the plan and spec before merge.

**Independent Test**: A test file with a raw `page.locator('div.foo')` outside a POM class produces FAIL with `RAW_SELECTOR_IN_TEST`.

**Acceptance Scenarios**:

1. **Given** a PR where all selectors live in POM classes, **When** QA-Code agent runs, **Then** gate status is PASS.
2. **Given** a PR with raw selectors in a test file, **When** QA-Code agent runs, **Then** gate status is FAIL with `RAW_SELECTOR_IN_TEST`.
3. **Given** a PR where a test has no corresponding spec acceptance criterion, **When** QA-Code agent runs, **Then** gate status is WARN with `UNMAPPED_TEST`.

---

### User Story 5 - QA-CI Agent Reviews CI Pipeline Results (Priority: P2)

A QA Senior CI agent receives a GitHub Actions run result and validates: all tests passed, Allure report generated, no flaky test patterns detected, suite runtime within threshold.

**Why this priority**: Provides final gate before deployment; catches environment-specific failures.

**Independent Test**: A CI run with 2 failed tests produces FAIL with `TEST_FAILURES` finding listing the failed test IDs.

**Acceptance Scenarios**:

1. **Given** a CI run where all tests pass and suite runs in under 10 min, **When** QA-CI agent runs, **Then** gate status is PASS.
2. **Given** a CI run with any test failure, **When** QA-CI agent runs, **Then** gate status is FAIL with `TEST_FAILURES` and list of failed tests.
3. **Given** a CI run where the same test failed and retried, **When** QA-CI agent runs, **Then** gate status is WARN with `FLAKY_TEST_DETECTED`.

---

### Edge Cases

- What happens when the artifact submitted to the Orchestrator is missing required sections? QA-Spec agent returns FAIL with `INCOMPLETE_ARTIFACT`.
- What if a sub-agent times out (e.g., code diff too large)? Orchestrator marks as WARN with `AGENT_TIMEOUT` and requests manual review.
- What if two gates conflict (Spec PASS but Plan reveals uncovered requirements)? QA-Plan FAIL takes precedence; spec is re-opened for amendment.
- What if a WARN acceptance reason is not documented within 24h? Orchestrator escalates to FAIL automatically.

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide an Orchestrator that accepts an artifact + phase identifier and routes to the correct QA sub-agent.
- **FR-002**: System MUST include a QA-Spec sub-agent that validates spec.md against constitution rules.
- **FR-003**: System MUST include a QA-Plan sub-agent that validates plan.md and data-model.md for requirement coverage and POM declaration.
- **FR-004**: System MUST include a QA-Code sub-agent that validates PRs for POM compliance, selector hygiene, and spec traceability.
- **FR-005**: System MUST include a QA-CI sub-agent that validates GitHub Actions run results for pass/fail, Allure presence, and flakiness.
- **FR-006**: System MUST persist every gate report as a JSON file in `specs/NNN-feature-name/qa-gates/<phase>-gate.json`.
- **FR-007**: System MUST block phase progression when any gate status is FAIL.
- **FR-008**: System MUST require documented Orchestrator acceptance before a WARN gate allows progression.
- **FR-009**: Each gate report MUST include: `phase`, `agent`, `status`, `findings[]`, `recommendation`, `timestamp`.
- **FR-010**: System MUST support running in GitHub Actions CI as part of the standard PR pipeline.

### Key Entities

- **Gate Report**: Structured JSON artifact produced by each QA sub-agent; the atomic unit of quality evidence.
- **Orchestrator**: The coordinating agent/process that dispatches work to sub-agents and enforces gate decisions.
- **QA Sub-Agent**: A specialized role (Spec, Plan, Code, CI) with a defined input artifact, checklist, and output gate report.
- **Phase**: One of: `spec`, `plan`, `code`, `ci` — the stage of the development lifecycle being gated.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of FAIL gates block phase progression with zero manual override capability.
- **SC-002**: Gate reports are produced within 60 seconds of artifact submission for spec/plan phases.
- **SC-003**: QA-Code gate catches all raw-selector violations in a PR (zero false negatives on POM rule).
- **SC-004**: Full QA pipeline (all 4 agents) integrates into GitHub Actions and completes in under 5 minutes.
- **SC-005**: Zero bugs escape to CI that were already flagged as FAIL in a prior gate (regression rate = 0%).

## Out of Scope

- Cross-browser matrix testing (only Chromium in v1)
- Mobile device emulation
- Sub-agent code modification capabilities (agents are read-only)
- OAuth or SSO integration for the framework itself
- Deployment automation beyond CI gate validation

## Assumptions

- Target stack is Playwright + TypeScript with POM; the QA agents are calibrated to these conventions.
- GitHub Actions is the CI platform; QA-CI agent consumes GHA run artifacts.
- The Orchestrator is implemented as a Claude Code agent using the Agent tool for sub-agent dispatch.
- Sub-agents do not modify code; they only read artifacts and produce gate reports.
