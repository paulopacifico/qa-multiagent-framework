# QA Senior Multi-Agent Framework Constitution

## Core Principles

### I. Shift-Left Quality (NON-NEGOTIABLE)
Every artifact — spec, plan, code, deploy — must pass a QA Senior gate BEFORE advancing to the next phase. No exceptions. A failed gate is a full stop; work does not continue until the gate is resolved.

### II. Zero Assumption Policy
If a requirement, acceptance criterion, or user story is ambiguous, the responsible sub-agent raises a CLARIFICATION_NEEDED finding immediately. Implementation never begins on ambiguous requirements.

### III. Evidence-Based Gate Reports
Every QA gate produces a structured JSON report: `{ status, findings[], recommendation, timestamp }`. Status must be one of `PASS | WARN | FAIL`. FAIL blocks unconditionally. WARN requires Orchestrator written acceptance before proceeding.

### IV. Page Object Model — Non-Negotiable
All Playwright tests follow POM. No raw selectors in test files. Every page/component gets its own class in `pages/`. This is enforced by the QA-Code sub-agent at code review gate.

### V. Autonomy Within Lanes
Each sub-agent operates independently within its defined responsibility. Sub-agents do not cross into adjacent lanes. Escalation to Orchestrator is the correct path for out-of-lane decisions.

## Technical Standards

- **E2E Framework**: Playwright + TypeScript (strict mode, no `any` types)
- **Test Pattern**: Page Object Model mandatory
- **CI**: GitHub Actions; all gates execute in CI pipeline
- **Reporting**: Allure HTML reports + screenshots on failure
- **Performance**: Full suite under 10 min; individual test timeout 30s; default 4 parallel workers
- **TypeScript**: Strict mode; interfaces for all test data; no `any`

## Quality Gate Standards

- Each gate persisted in `.specify/specs/NNN/qa-gates/<phase>-gate.json`
- Gate fields: `phase`, `agent`, `status` (PASS|WARN|FAIL), `findings[]`, `recommendation`, `timestamp`
- FAIL gate: blocks phase progression, triggers root-cause analysis task
- WARN gate: Orchestrator documents acceptance reason before proceeding

## Governance

Constitution supersedes all other practices. Amendments require: written rationale, Orchestrator approval, and migration plan for existing specs. All sub-agent decisions must cite the relevant principle when issuing a FAIL.

**Version**: 1.0.0 | **Ratified**: 2026-04-20 | **Last Amended**: 2026-04-20
