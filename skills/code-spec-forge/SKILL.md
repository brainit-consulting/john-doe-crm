---
name: code-spec-forge
description: >-
  Reverse-engineer a codebase into a deep technical SPEC (HTML) plus cross-linked architecture
  diagrams, starting from a repo or GitHub URL. Use whenever someone wants to DOCUMENT, SPEC OUT,
  or REVERSE-ENGINEER an existing repo/codebase — e.g. "document this repo", "reverse-engineer
  github.com/acme/app into a spec", "write a technical spec for this codebase", "generate
  architecture docs from this code", "a client gave me their repo, document it". The defining
  output is a WRITTEN spec derived FROM code (the inverse of diagram-forge, which goes spec → diagram).
  Triggers on a repo path or GitHub URL even without the word "spec". NOT for: diagramming an
  existing/written spec (use diagram-forge); generating data charts; building or scaffolding an app;
  fixing/refactoring code; or summarizing a single file.
metadata:
  version: "1.0.0"
  author: forged alongside diagram-forge
---

# code-spec-forge

Reverse-engineer a **repo** into a **deep technical spec (HTML)** + **cross-linked diagrams**. The
inverse of `diagram-forge` (spec → diagram); this is **code → spec → diagram**.

Primary use case: a client invites you to their repo; you clone it locally and document it — and the
same clone is a real working copy the team does PRs/merges in. So acquisition makes a **full
collaborator clone**, and **analysis is strictly read-only** (never checkout/stash/pull/commit/push).

## Movements

### 1. Acquire the repo — `scripts/resolve_repo.py`
Run it with the GitHub URL: `python scripts/resolve_repo.py <github-url>` (run from this skill dir, or
pass the script's absolute path; the interpreter may be `python`, `python3`, `py`, or a full path like
`C:\Python313\python.exe` on Windows — it's stdlib-only, so any Python 3 works). Pass a bare URL with
no trailing punctuation. It prefers an existing
matching clone at `H:\<repo>`, else clones a full collaborator clone there (`gh repo clone` when `gh`
is available — handles private invite-only repos — else `git clone`), never clobbering an unrelated
dir, and prints `path=`, `action=`, `provenance=<repo>@<branch>#<sha>`. **Do not** modify the clone.

### 2. Analyze → system model
Follow `references/analysis-playbook.md`: a layered survey (manifests/config → entry points → routes
→ data model → modules → external integrations + env → tests), mapping with ripgrep/glob and reading
load-bearing files. For large repos, fan out with subagents per subsystem. Produce the structured
**system model** (overview, stack, actors, surfaces, services, dataModel, routes, integrations,
envVars, flows, deployment) — it feeds both the spec and the diagrams. Record provenance.

### 3. Synthesize the spec → `<repo>-spec.html`
Build a deep-reference spec per `references/spec-template.md`, styled with diagram-forge's spec-page
stylesheet (`~/.claude/skills/diagram-forge/references/diagram-html-templates.md` §1): purpose, stack,
features, architecture, data model, **API/route catalog**, **per-module breakdown**, **env/config
inventory**, key flows, deployment. Ground claims in real files/paths; mark it reverse-engineered with
the provenance line.

### 4. Generate diagrams (reuse diagram-forge's render)
Author DSL and render with `~/.claude/skills/diagram-forge/scripts/render_eraser.py` (free anonymous
endpoint; see `~/.claude/skills/diagram-forge/references/eraser-dsl.md`). Always: **architecture**
(`cloud-architecture-diagram`). When a DB schema exists: **ERD** (`entity-relationship-diagram`).
For key flows: **sequence** (`sequence-diagram`). Plus a **module-dependency** map. Build each as a
standalone HTML page with diagram-forge's diagram-page template (embed PNG + Open-in-Eraser + DSL).

### 5. Outputs + cross-linking
Write everything to the app's local-docs folder `H:\AppTracker Docs\<slug>\` (or
`H:\AppTracker Docs\<repo>\` if no app slug was given) — **create that folder first if it doesn't
exist** (`mkdir -p` / `New-Item -ItemType Directory -Force`). Then write `<repo>-spec.html` + the
diagram pages + PNGs + DSL. Cross-link spec ⇄ every diagram. Re-running overwrites the same files (idempotent), refreshing
the provenance line — so the docs track the repo as collaboration proceeds.

## Rules
- **Read-only on the repo.** Outputs go only to the local-docs folder, never into the analyzed repo.
- **Faithful + grounded.** Describe what the code actually does; cite paths. No invented features.
- **Confidentiality.** Client repos are often private/NDA — keep outputs in the client's folder; the
  only outbound call is the Eraser render, which sends only the DSL, never the source.
- **Scale honestly.** On big repos, note which packages were deep-read vs summarized (no silent gaps).

## Quickstart
1. `python scripts/resolve_repo.py <url>` → get the local path + provenance.
2. Analyze per `references/analysis-playbook.md` → system model.
3. Write `<repo>-spec.html` per `references/spec-template.md` (diagram-forge spec stylesheet).
4. Author DSL → render via diagram-forge's `render_eraser.py` → build diagram pages.
5. Cross-link, write to `H:\AppTracker Docs\<slug>\`, report file paths + provenance.
