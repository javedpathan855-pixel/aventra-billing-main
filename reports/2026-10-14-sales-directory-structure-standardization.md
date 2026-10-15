# Sales Category Directory Structure Standardization — Audit & Remediation Report

- **Date (UTC):** 2026-10-14
- **Working Tree:** `/Users/javed/Desktop/aventra-billing-main` (no git repository exists in this working tree; no commits, pushes, resets, or destructive operations performed or possible)
- **Scope:** directory architecture and responsibility placement for the six Sales features only — `src/features/estimates/`, `src/features/sales-orders/`, `src/features/sales-returns/`, `src/features/sales-pipeline/`, `src/features/delivery-challans/`, `src/features/sales-settings/`. No business-logic refactoring; no schema/migration changes.
- **Baseline:** prior Sales remediation (audit report `reports/2026-10-14-sales-category-architecture-rules-audit.md` §§A–J) fully preserved; this task touched test-file placement only.

---

## 1. Rules and sections consulted

Read in full before any change: `AGENTS.md` (authority/precedence, mandatory workflow, all non-negotiables) and `/rules/01-architecture.md` (canonical 4-layer shape, dependency direction, forbidden dependencies), `/rules/02-project-structure.md` (feature root, **empty-folder rule** lines 78–84, example taxonomy with singular `page/` line 108, `index.ts`-era barrel practice), `/rules/03-domain-taxonomy.md` (allowed list lines 9–19; `contracts/` as repository-interface ports lines 45–49; `services/` genuine-use-only lines 57–61; domain restrictions lines 69–84), `/rules/04-data-taxonomy.md` (allowed list; `repositories/` data-vs-infrastructure boundary lines 33–37; `validators/` trust-boundary lines 51–55), `/rules/05-infrastructure-taxonomy.md` (`repositories/` concrete adapters + no-duplication rule lines 33–37), `/rules/06-presentation-taxonomy.md` (allowed list with singular `page/` line 14; `forms/` lines 30–34; hooks rule lines 36–40; `validators/` presentation-feedback lines 54–58; restrictions lines 60–66), `/rules/07-shared-taxonomy.md` (stable dependency surface), `/rules/08-boundaries.md` (full forbidden/allowed lists), `/rules/20-definition-of-done.md`, `/rules/21-agent-procedure.md` (esp. line 20: do not invent folders; document architectural need).

Decisive rule facts established before editing:
- The authoritative spelling is singular **`page/`** (`02` line 108, `06` line 14). Plural `pages/` appears nowhere in the rules — no migration performed.
- `02` lines 78–84 (empty-folder rule): subdirectories exist only for real responsibilities; the §02/§06 taxonomies are explicitly "not a requirement to create all folders."
- `domain/repositories/` vs `03` allowed-list/`contracts/`: documented ambiguity, see §8 exception E1 (task §3 itself prescribes `repositories/`; codebase-wide convention).

## 2. Before-and-after recursive directory trees

### 2.1 estimates — BEFORE (relevant excerpt; full tree verified)

```text
estimates/
├── data/{context,dto,mutations,queries,validators}/
├── domain/
│   ├── entities/estimate.ts
│   ├── errors/estimate-errors.ts
│   ├── estimate-lifecycle.test.ts        # VIOLATION: layer-root file, owns to rules/
│   ├── estimate-rules.test.ts            # VIOLATION: layer-root file, owns to rules/
│   ├── repositories/estimate-repository.ts
│   └── rules/{estimate-lifecycle-rules.ts,estimate-rules.ts}
├── presentation/{components/* (10),page/* (3)}/
├── infrastructure/{mappers/prisma-estimate-mapper.ts,repositories/prisma-estimate-repository.ts}/
└── index.ts
```

### 2.1 estimates — AFTER

```text
estimates/
├── data/{context,dto,mutations,queries,validators}/
├── domain/
│   ├── entities/estimate.ts
│   ├── errors/estimate-errors.ts
│   ├── repositories/estimate-repository.ts
│   └── rules/{estimate-lifecycle-rules.ts,estimate-lifecycle.test.ts,
│               estimate-rules.ts,estimate-rules.test.ts}
├── presentation/{components/* (10),page/* (3)}/
├── infrastructure/{mappers/prisma-estimate-mapper.ts,repositories/prisma-estimate-repository.ts}/
└── index.ts
```

### 2.2 sales-settings — BEFORE (relevant excerpt)

```text
sales-settings/
├── data/{context,dto,mutations/save-sales-settings.ts,queries/get-sales-settings.ts,
│          validators/sales-settings-schemas.ts}/
├── domain/
│   ├── entities/sales-settings.ts
│   ├── errors/sales-settings-errors.ts
│   ├── sales-settings-rules.test.ts          # VIOLATION: layer-root duplicate
│   │                                         # basename; 9 validator tests
│   ├── repositories/sales-settings-repository.ts
│   └── rules/{sales-settings-rules.ts,sales-settings-rules.test.ts}  # 5 formatter tests
├── presentation/page/SalesSettingsPage.tsx   # no components/ (single page)
├── infrastructure/{mappers/prisma-sales-settings-mapper.ts,
│                    repositories/prisma-sales-settings-repository.ts}/
└── index.ts
```

### 2.2 sales-settings — AFTER

```text
sales-settings/
├── data/           # unchanged
├── domain/
│   ├── entities/sales-settings.ts
│   ├── errors/sales-settings-errors.ts
│   ├── repositories/sales-settings-repository.ts
│   └── rules/{sales-settings-rules.ts,
│               sales-settings-rules.test.ts}  # merged: 5 formatter + 9 validator tests
├── presentation/page/SalesSettingsPage.tsx
├── infrastructure/ # unchanged
└── index.ts
```

### 2.3 Unchanged features (verified identical before/after)

- **sales-orders:** `data/{context,dto,mutations/{*.ts + 2 test files},queries/* (2),validators/*+test}` · `domain/{entities,errors,repositories,rules/* (2 rules + 2 tests)}` · `presentation/{components/* (10),page/* (3)}` · `infrastructure/{mappers,repositories}/*` · `index.ts`. Rule tests already inside `rules/` — no violation found.
- **sales-returns:** `data/{context,dto,mutations/* (3),queries/* (3),validators/*+test}` · `domain/{entities,errors,repositories,rules/*+test}` · `presentation/{components/* (8),page/* (4: Create+test, Detail, List)}` · `infrastructure/{mappers,repositories/*+test}` · `index.ts`. No violation found.
- **sales-pipeline:** `data/{context,dto,mutations/* (4 + test),queries/* (3),validators/*}` · `domain/{entities,errors,repositories,rules/*+test}` · `presentation/{components/* (7),page/* (2)}` · `infrastructure/{mappers,repositories}/*` · `index.ts`. No violation found.
- **delivery-challans:** `data/{context,dto,mutations/* (3),queries/* (3),validators/*}` · `domain/{entities,errors,repositories,rules/*+test}` · `presentation/{components/* (4),page/* (3)}` · `infrastructure/{mappers,repositories/*+test}` · `index.ts`. No violation found.

## 3. Layer-by-layer compliance matrix

| Layer / subdir | Rule | estimates | sales-orders | sales-returns | sales-pipeline | delivery-challans | sales-settings |
|---|---|---|---|---|---|---|---|
| Top-level 4 layers + `index.ts` | 01, 02 | PASS | PASS | PASS | PASS | PASS | PASS |
| `domain/entities/` | 03 | PASS | PASS | PASS | PASS | PASS | PASS |
| `domain/errors/` | 03 | PASS | PASS | PASS | PASS | PASS | PASS |
| `domain/repositories/` (contracts) | 03§contracts + task§3 | PASS* | PASS* | PASS* | PASS* | PASS* | PASS* |
| `domain/rules/` | 03 | **FIXED** (2 tests moved in) | PASS | PASS | PASS | PASS | **FIXED** (merged) |
| `domain/contracts/` | 03 | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ |
| `domain/value-objects/`, `services/` | 03 + task§3 | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ |
| `data/context|dto|mutations|queries|validators/` | 04 + task§4 | PASS | PASS | PASS | PASS | PASS | PASS |
| `data/mappers/`, `data/repositories/` | 04, 05 | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ |
| `presentation/components/`, `page/` | 02, 06 | PASS | PASS | PASS | PASS | PASS | PASS (no `components/`, justified §6) |
| `presentation/forms|hooks|view-models|animation|validators/` | 06 + task§5 | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ |
| `infrastructure/repositories|mappers/` | 05 + task§6 | PASS | PASS | PASS | PASS | PASS | PASS |
| `infrastructure/prisma|auth|adapters|services|config/` | 05 | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ | ABSENT✓ |
| Layer purity (no React/Prisma in domain; no Prisma in presentation; no data/infra→presentation) | 01, 08 | PASS | PASS | PASS | PASS | PASS | PASS |

PASS* = `repositories/` naming per §8 exception E1. ABSENT✓ = intentionally absent per §6 (never mere symmetry).

## 4. Directories created, removed, renamed

**None.** No directory was created, removed, or renamed. The two violations were misplaced *files* inside existing, rule-correct directories:
1. `estimates/domain/*.test.ts` (2 files) — violated `02` lines 80–84 ("Do NOT put arbitrary files directly into a layer when a defined subdirectory clearly owns that responsibility": `domain/rules/` owns business-invariant tests; `sales-orders` precedent keeps rule tests in `rules/`). Fixed by relocation (§5), not new folders.
2. `sales-settings/domain/sales-settings-rules.test.ts` — same violation plus duplicate basename with `domain/rules/sales-settings-rules.test.ts`. Fixed by merge (§5), leaving no empty or duplicate behind.

## 5. Files moved; imports/tests/mocks updated

1. `estimates/domain/estimate-rules.test.ts` → `estimates/domain/rules/estimate-rules.test.ts`; imports fixed: `./rules/estimate-rules` → `./estimate-rules`, `./entities/estimate` → `../entities/estimate`.
2. `estimates/domain/estimate-lifecycle.test.ts` → `estimates/domain/rules/estimate-lifecycle.test.ts`; imports fixed: `./rules/estimate-lifecycle-rules` → `./estimate-lifecycle-rules`, `./entities/estimate` → `../entities/estimate`.
3. `sales-settings/domain/sales-settings-rules.test.ts` — 9 validator `it` blocks merged as a new `describe("Number Validators")` inside `domain/rules/sales-settings-rules.test.ts` (imports unioned; all 14 assertions preserved verbatim); root file deleted. No production import possible (test files are never imported by `src`; vitest collects by path glob `src/**/*.test.ts`).
4. Stale-path search (`domain/estimate-rules.test`, `domain/estimate-lifecycle.test`, `domain/sales-settings-rules.test` across `src/`): **0 code references**. Only two lines in historical reports (`reports/sales-orders-implementation-report.md:244`, `reports/2026-10-14-sales-operations-implementation.md:264`) mention the old path — intentionally unedited as audit-trail records.

## 6. Intentionally absent folders (rule/responsibility basis)

- `domain/contracts/` — repository ports live in `domain/repositories/` per codebase-wide convention and task §3; no other standalone contracts exist. See E1.
- `domain/value-objects/` — no Money/EmailAddress-style concept currently extracted; extraction would be business-logic refactoring, out of scope; `02` empty-folder rule forbids symmetry-only creation.
- `domain/services/` — no cross-entity domain logic exists outside entities/rules (rule 03: genuine-use-only).
- `data/mappers/`, `data/repositories/` — mapping owned by `infrastructure/mappers/`; persistence owned by `infrastructure/repositories/`; rule 05 forbids duplicating between the two without documented boundary, so a single home is the compliant shape.
- `presentation/forms/` — form sections (`EstimateCustomerSection`, `SalesOrderItemsSection`, …) are reusable page-composed UI components fitting `components/` ("Feature-specific reusable UI components"); no standalone form-orchestrator responsibility exists in sales (contrast `customers/presentation/forms/CustomerForm.tsx`, a full form module — different responsibility, different feature, out of scope).
- `presentation/hooks|animation|view-models|validators/` — verified zero custom hooks, zero animation-library imports, no view-model modules, and validation correctly split (zod trust boundary in `data/validators/`, immediacy helpers from domain rules; rule 06 requires server-side authority, which a `presentation/validators/` copy would endanger, not improve).
- `presentation/components/` in sales-settings only — `SalesSettingsPage.tsx` is a single page composition with no reusable section components to extract; creating `components/` would violate the empty-folder rule.
- `infrastructure/prisma|auth|adapters|services|config/` — no external adapters, provider configs, or tech services exist in sales features; Prisma access is consolidated in `repositories/`+`mappers/`.

## 7. Verification results

| Check | Exact command | Exit | Result |
|---|---|---|---|
| TypeScript | `npx tsc --noEmit` | 0 | clean |
| ESLint (affected scopes) | `npx eslint src/features/estimates src/features/sales-settings` | 0 | clean |
| Vitest (affected scopes) | `npx vitest run src/features/estimates src/features/sales-settings` | 0 | 4 files passed, 1 skipped (DB-gated); **42 passed**, 6 skipped |
| Vitest full + isolated DB | `AVENTRA_TEST_DATABASE_URL=<isolated aventra_billing_test> npx vitest run` | 0 | **139 files passed; 952 passed, 0 skipped, 0 failed** (one fewer file than round 2's 140: the merged sales-settings tests; test total unchanged at 952) |
| Production build | `npm run build` | 0 | `✓ Compiled successfully`, static pages generated; **0** `Client Component Browser` / Prisma / `server-only` warnings |
| Prisma | `npx prisma validate` | 0 | schema valid (no schema/migration change; run as no-impact sanity check) |

Skipped tests are reported separately and never counted as passing. The isolated test database (`aventra_billing_test`, created round 2, 14/14 migrations applied) was reused; production/dev data untouched. Boundary re-greps after the moves: 0 domain-framework imports, 0 presentation-Prisma imports, 0 data/infra→presentation imports, 0 native form controls introduced, 0 new dependencies.

## 8. Remaining exceptions (with evidence and impact)

- **E1 — `domain/repositories/` vs `03` allowed-list/`contracts/` (all six features; no change made).** Evidence: rule 03's allowed list (lines 9–19) omits `repositories/`, but its `contracts/` section (lines 45–49) defines the responsibility as "repository interfaces or ports" — exactly what `domain/repositories/*-repository.ts` contains (interfaces only, zero implementations; implementations live solely in `infrastructure/repositories/`). The task's own §3 prescribes `repositories/` ("domain-level repository contracts/interfaces, not Prisma implementations"). The convention is codebase-wide (invoices, customers, products, billing-settings identical) and prior audit rows treat it compliant. Renaming six features' directories (plus import churn across mutations/tests/barrels) to satisfy a naming reading would diverge sales from the other twelve features and violate the smallest-change mandate. Per rule 21 line 20, this need is documented here instead of inventing a migration. Impact: none behavioral; naming-only divergence from one strict reading of rule 03. **This is the sole open structural exception — full directory compliance is not declared.**
- **E2 — Historical report path references (§5 item 4).** Two lines in superseded round-1/operations reports cite the old test path. Left intact as audit trail; impact: none (reports, not code).
- **E3 — No git repository in working tree.** DoD "Git diff reviewed" satisfied instead via full before/after `find` inventories (§2) and the explicit moved-file list (§5); no unrelated file was touched ( structural edits limited to the 4 test files above; all other sales files byte-identical to the preserved round-2 baseline).

## 9. Preservation confirmation

- Prior Sales remediation (audit §§A–J: org-scoping, duplicate guards, validation hardening, token work, transitions, barrels, 952-test suite) preserved: no production source file outside the 4 listed test files was modified; business behavior, authorization, organization isolation, lifecycle rules, numbering, persistence contracts, schema, and migrations unchanged.
- Unrelated uncommitted work: none observed outside the task scope; `find` inventories confirm all non-listed files untouched.
- No secrets, debug logs, dead code, mocks, or dependencies added. No commits, pushes, resets, or destructive operations (no git repository exists).
