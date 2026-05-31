---
name: diagram-forge
description: >-
  Turn a client project's specs and/or codebase into software/system architecture diagram(s) —
  the components, services, data stores, and how they connect — and (when the source is a PDF spec)
  into a clean, faithful HTML render of that spec first. Use whenever someone wants to VISUALIZE,
  DIAGRAM, or DOCUMENT a system's architecture from a spec or code — e.g. "draw the architecture for
  this spec", "diagram this codebase", "turn this functional spec PDF into a system diagram",
  "convert this PDF spec to HTML and visualize it", "make an Excalidraw/Eraser/Mermaid diagram of how
  this app fits together", "I got a new client spec, visualize it". Trigger even if they only say
  "visualize the spec" or "architecture diagram" without naming a tool. Produces standalone HTML
  files: a faithful styled spec page (from PDF) plus one or more architecture diagram pages (Eraser by
  default; Mermaid and/or editable Excalidraw on request), cross-linked together. NOT for: bar/line/pie
  or other data/chart viz; landing pages, UI mockups, design polish, or accessibility/UX reviews;
  React/component refactors; business-process or workflow flowcharts that aren't system architecture;
  adding a single sequence/flow diagram to a README; summarizing or researching a doc's content;
  scaffolding/setting up a new app; or OCR, data extraction, or editing the source PDF.
metadata:
  version: "1.0.0"
  author: forged from the PROJECT_X workflow
---

# Diagram Forge

Turn client **specs** (PDF or HTML) and/or **codebases** into **system architecture diagram(s)**,
delivered as standalone HTML files. The job has up to three movements:

1. **Spec → faithful HTML** (only if the source is a PDF). Reproduce the spec's content cleanly so
   it's readable and linkable — *content unchanged, presentation improved*.
2. **Understand the system** — read the spec/HTML/code and build a mental model: actors, surfaces,
   services, data stores, external integrations, and the flows between them.
3. **Forge the diagram(s)** — generate one or more architecture diagrams as separate HTML files and
   cross-link them to the spec.

The guiding principle: **a diagram is only useful if it's faithful to the system and legible at a
glance.** Group by layer, show the real data flow, label edges, and don't cram every node — capture
the architecture, not every class.

---

## When you're invoked, first triage the input

| You were given… | Do this |
|-----------------|---------|
| A **PDF** spec | Convert to faithful HTML first (movement 1), read it, then diagram. |
| An **HTML / Markdown** spec | Read it directly, then diagram. |
| A **codebase** (repo path) | Map it (entry points, routes, services, DB schema, external SDKs, config/env) then diagram. |
| A spec **and** code | Read both; the code grounds what the spec claims; diagram the reality. |

Ask which **diagram tool(s)** they want only if they haven't said. Default to **Eraser** (best
auto-layout for system architecture). Offer Mermaid (renders fully in-browser, no account/watermark)
and editable Excalidraw as alternatives or additions. It's cheap to produce more than one.

Put outputs **next to the source** (same folder as the spec/repo), not in some scratch dir, so the
client artifacts live together. Name them predictably, e.g. `PROJECT-architecture.html`,
`PROJECT-architecture.png`, `PROJECT-spec.html`.

---

## Movement 1 — PDF spec → faithful, styled HTML

Goal: a clean HTML rendering a human enjoys reading, with the **wording unchanged**. Never edit the
source PDF; the PDF stays the system of record.

**Why not just auto-convert?** PyMuPDF's `page.get_text("html")` emits absolutely-positioned spans
that overlap and look broken. `find_tables()` over-detects design-heavy cover/TOC pages as giant
tables and swallows body text into empty cells. Heading glyphs come out letter-spaced
("F O R E W O R D"). So **auto-extraction alone produces a mess on designed PDFs.**

The reliable recipe:

1. **Read the real content.** Use the Read tool on the PDF (it gives clean text), and/or run
   `scripts/pdf_extract.py` to dump clean per-page text + detected tables to work from. Confirm it's
   text-based (not scanned); if scanned, you need OCR (out of scope — flag it).
2. **Hand-build clean semantic HTML** from that content: real `<h2>`/`<h3>` headings, `<table>` for
   tables, `<ul>`/`<ol>` for lists, `<pre>` for code/pseudocode/data-model blocks. Keep the spec's
   actual wording — you are reformatting, not rewriting or summarizing.
3. **Style it** with the self-contained stylesheet pattern in
   [`references/diagram-html-templates.md`](references/diagram-html-templates.md) (cover header, sticky
   auto-generated TOC, styled tables, success-criteria checklists, callouts, badges, code blocks).
4. **Note provenance** in a small line: "Faithful HTML rendering of the source PDF — content
   preserved, presentation reformatted. The PDF remains the system of record."

For very long specs, completeness matters — reproduce every section and table. Lean on
`pdf_extract.py` so you don't miss content, but assemble the HTML by hand for quality.

See [`references/pdf-to-html.md`](references/pdf-to-html.md) for the full playbook and pitfalls.

---

## Movement 2 — Understand the system

Before drawing anything, extract the architecture into a short structured list. For a **spec**, look
for: user roles/actors, user-facing surfaces, the core processing pipeline, data stores, external
integrations, compliance/security boundaries, and what's explicitly out of scope. For a **codebase**:
framework + entry points, route handlers / controllers, server vs client boundary, DB schema +
ORM, queue/cron/background jobs, third-party SDKs and the env vars that gate them, and the deploy
target.

Write this model down (even just internally) as **nodes grouped into layers** + **edges with
labels**. That list *is* the diagram; the tool just renders it. Resist drawing every file — pick the
subsystems that explain how the thing works.

---

## Movement 3 — Forge the diagram(s)

### Default: Eraser (diagram-as-code, auto-layout, free)

Eraser is purpose-built for system/cloud architecture and lays out automatically from a text DSL — the
best fit for auto-generating from a spec. It renders via a **free anonymous endpoint** (no API key):

```
POST https://app.eraser.io/api/render/elements
Headers: Content-Type: application/json,  X-Skill-Source: claude
Body: { "elements":[{ "type":"diagram","id":"d1","code":"<DSL>",
        "diagramType":"cloud-architecture-diagram" }],
        "scale":2, "theme":"dark", "background":true }
```

It returns `{ imageUrl, createEraserFileUrl }`. Free renders carry a small watermark and the editor
link still works. **Use the bundled script** — it handles the POST and downloads the PNG with no
external dependencies:

```bash
python scripts/render_eraser.py --dsl path/to/diagram.eds \
  --type cloud-architecture-diagram --out PROJECT-architecture.png
# prints: imageUrl=...  editorUrl=...
```

Then build the diagram HTML page (embed the local PNG + an "Open in Eraser" editor link + the DSL +
a component legend mapped to spec sections), using the Eraser template in
[`references/diagram-html-templates.md`](references/diagram-html-templates.md).

DSL authoring rules that matter (full cheatsheet in
[`references/eraser-dsl.md`](references/eraser-dsl.md)):

- Group by layer with nested groups: external actors → surfaces → application/pipeline → data stores.
- **Labels must be single-line** — never put newlines inside a `[label: "..."]`.
- Prefer `direction right` for layered systems (left-to-right reads as flow); `down` gets tall/cramped
  once you nest groups. If the first render looks cramped, flatten one level of nesting and re-render.
- Quote labels with spaces/punctuation. Unknown icon names degrade gracefully (no icon) — fine.
- Keep it to the subsystems that explain the system; one clean diagram beats one exhaustive one. For
  big systems, consider multiple focused diagrams (context, then pipeline, then data model).

### On request: Mermaid (in-browser, no watermark, single file)

Best when the client wants a fully self-contained file they can reopen offline-ish (one CDN script)
with no watermark, and editable text. Use a `flowchart LR` with nested `subgraph`s. Template +
working pattern in [`references/diagram-html-templates.md`](references/diagram-html-templates.md) and
syntax notes in [`references/mermaid.md`](references/mermaid.md).

### On request: Excalidraw (editable, hand-drawn)

Best when they want to hand-edit the diagram. Use Excalidraw's **UMD** build from unpkg (React UMD +
ReactDOM UMD + `excalidraw.production.min.js`) — the UMD bundle ships its own CSS (the ESM build's
separate CSS path is unreliable). Feed concise skeleton boxes/arrows to `convertToExcalidrawElements`
(it fills defaults; you control the grid layout). Always include a fallback message + the
"paste mermaid into excalidraw.com" path, since it depends on a CDN at view time. Template in
[`references/diagram-html-templates.md`](references/diagram-html-templates.md).

### Tool recommendation cheat-sheet

| Want… | Use |
|-------|-----|
| Best auto-from-spec architecture, least effort | **Eraser** (default) |
| Self-contained, no watermark, editable text, renders in-browser | Mermaid |
| Hand-editable whiteboard the client will tweak | Excalidraw |
| Data charts (bar/line/pie), UI mockups | none of these — wrong skill |

---

## Cross-link everything

The spec HTML and each diagram HTML should link to each other (header + footer). The client should be
able to open any one file and reach the rest. This turns scattered files into a small browsable
artifact set.

## Operating rules (carry the project's good habits)

- **Faithful content.** Reformatting a spec is fine; rewording/summarizing its requirements is not.
- **No raw IDs in the diagram.** Resolve to human-readable labels.
- **Respect confidentiality.** Client specs are often NDA-restricted. Keep outputs in the client's
  folder; do not commit them to unrelated repos or send them to external services beyond the diagram
  render call (which sends only your DSL, not the spec). If the doc is marked confidential, put a
  small classification note in the generated HTML.
- **Verify what you can.** You usually can't headless-render these HTML files; sanity-check the Eraser
  PNG by viewing it, confirm CDN URLs resolve for Mermaid/Excalidraw, and tell the user to open the
  files in their browser to confirm.

## Quickstart checklist

1. Triage input (PDF / HTML / code / both).
2. If PDF → produce faithful styled spec HTML (Movement 1).
3. Build the layered node/edge model (Movement 2).
4. Author Eraser DSL → `render_eraser.py` → build the Eraser diagram HTML page.
5. If asked, also produce Mermaid and/or Excalidraw pages.
6. Cross-link spec ⇄ diagram(s). Report the file paths and what each is.
