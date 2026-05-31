# Build model — spec → structured model (M1)

Read the spec as the **source of truth**: the PDF (use the Read tool — it gives clean text and reads
PDFs) and the faithful spec HTML produced by diagram-forge. Read the architecture/ERD diagrams for
structure. If the spec HTML or any diagram is missing from `H:\AppTracker Docs\<slug>\`, run
`diagram-forge` first, then return here.

## The build model (single intermediate artifact)
Produce a structured object that every later movement projects from:
```
{ appName, slug,
  entities:    [{ name, fields:[{name,type,required}], relations:[{to,kind}] }],  // -> Drizzle schema
  actors:      [{ role, capabilities }],                                          // -> auth + permissions
  features:    [{ name, screens:[], actions:[] }],                                // -> routes + server actions
  integrations:[{ name, module?, envVars:[] }],                                   // -> modules + .env
  mvpCore:     [ entity/feature names that ARE built this run ],
  outOfScope:  [ deferred features, surfaced as labeled stubs ] }
```
This is `code-spec-forge`'s system model run **forward** (model → code, not code → model).

## Deriving each slice (ground every item in the spec)
- **entities/fields/relations** — from the spec's data descriptions + the ERD diagram. Map to Drizzle
  column types; where the spec is silent on a type, pick a sensible default and record the assumption.
- **actors/roles** — from the spec's user types; map to the trunk's role/permission model.
- **features/screens/actions** — from the spec's functional requirements; each becomes routes + server
  actions.
- **integrations** — from the spec's mentions of payments/email/SMS/storage/AI. **Check the trunk's
  actual `modules/` catalog** before assuming a feature maps to a module — most domain features (and
  often dictation) are **bespoke**, not modules. Map to `modules/<name>` only if it really exists; else
  build it (env + a thin wrapper) and record it.

## The MVP cut line (decide explicitly, surface it)
`mvpCore` = the **main entities' CRUD + auth + their primary list/detail screens** — the smallest set
that makes the app demonstrably do its core job. Everything else (reports, bulk import, secondary
workflows, polish) goes to `outOfScope` as labeled stubs. Bias to a working spine over breadth.
**State the cut line to the user before building** (movement 3) so expectations are set.

## Spec wins
If the spec contradicts a trunk default (naming, flow, a module's behavior), follow the spec and note
the deviation. Never silently inherit a trunk default that conflicts with the spec.
