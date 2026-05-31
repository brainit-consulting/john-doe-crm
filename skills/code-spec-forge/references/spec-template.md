# Spec template — deep technical reference (reverse-engineered)

Style with diagram-forge's spec-page stylesheet + auto-TOC
(`~/.claude/skills/diagram-forge/references/diagram-html-templates.md` §1): dark cover, sticky TOC,
zebra tables, callouts, dark `<pre>` blocks. Add a provenance line:
*"Reverse-engineered from `<repo>@<branch>#<sha>` on <date> — derived from the code, not an
authored spec."* Carry a confidentiality banner when the repo is private.

## Sections (deep reference)
1. **Overview / purpose** — what the system is, who uses it (inferred).
2. **Tech stack** — languages, frameworks, key libs, package manager, runtime (from manifests).
3. **Features** — capabilities inferred from routes/UI/handlers, grouped sensibly.
4. **Architecture** — components/services, request path, deploy boundary (links the architecture diagram).
5. **Data model** — entity table (name, key fields, relations) from the schema (links the ERD).
6. **API / route catalog** — table of method · path · handler · purpose.
7. **Per-module breakdown** — one row/section per major dir/package: responsibility + key files.
8. **Env / config inventory** — table of env var · purpose · required? · what it gates (from `.env.example` + usage).
9. **Key flows** — narrative + (link) sequence diagrams for auth and the main request path(s).
10. **Deployment** — host/target, CI, build, runtime config (from vercel/CI/Docker).

**Client-side / no-backend repos.** Many repos have no server or database — a static SPA, a CLI, a
library, a game. Don't force a server-centric frame onto them. Say so explicitly ("no backend; runs
entirely in the browser") and model what's actually there: in-memory domain state, `localStorage`/
file persistence, web workers, the build/deploy pipeline. Then section 6 (API) describes the in-app
module/worker API instead of HTTP routes, and section 5 (data model) describes the in-memory and
persisted shapes instead of SQL tables. Drop sections that genuinely don't apply rather than
inventing content for them.

## Diagram DSL notes (render via diagram-forge's render_eraser.py)
- **Architecture** → `cloud-architecture-diagram` (layered groups; see diagram-forge eraser-dsl.md).
- **ERD** → `entity-relationship-diagram` from `dataModel` (entities + relations). Skip if no schema.
- **Sequence** → `sequence-diagram` per key flow (columns = actor/web/server/db/external).
- **Module-dependency** → a `cloud-architecture-diagram` of packages/dirs with dependency edges.
Each diagram becomes a standalone HTML page via diagram-forge's diagram-page template (embed PNG +
Open-in-Eraser link + DSL). Cross-link every page to `<repo>-spec.html`.
