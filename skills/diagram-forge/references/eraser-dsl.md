# Eraser diagram-as-code — DSL cheatsheet + render API

Eraser renders professional diagrams from a small text DSL with automatic layout. The free
anonymous render endpoint needs no API key (free renders carry a small watermark; the editor link
always works). Use `scripts/render_eraser.py` to call it.

## Render API

```
POST https://app.eraser.io/api/render/elements
Headers:
  Content-Type: application/json
  X-Skill-Source: claude        # identify the agent; required
Body:
  { "elements": [{ "type":"diagram", "id":"d1",
                   "code":"<DSL>", "diagramType":"<type>" }],
    "scale": 2, "theme": "dark", "background": true }
Returns: { "imageUrl": "https://...png", "createEraserFileUrl": "https://app.eraser.io/new?..." }
```

`diagramType` ∈ `cloud-architecture-diagram` · `flowchart-diagram` · `sequence-diagram` ·
`entity-relationship-diagram` · `bpmn-diagram`. For **system architecture, default to
`cloud-architecture-diagram`.** Common errors: 400 "no code"/"no diagramType"/"Invalid diagramType";
ensure the DSL matches the declared type.

## cloud-architecture-diagram syntax

**Nodes** — unique name + optional properties:
```
compute [icon: aws-ec2]
DB [icon: postgresql, label: "Postgres — ledger"]
```
**Groups** — containers, can nest:
```
SG [icon: globe, label: "Singapore Region", color: blue] {
  App [icon: server, label: "Application"] {
    Match [icon: git-merge, label: "Four-way matching"]
  }
  DB [icon: postgresql, label: "Postgres"]
}
```
**Properties** (in `[ ]`, comma-separated): `icon`, `color` (name or `"#hex"`), `label` (quote if it
has spaces), `link`, `colorMode` (pastel|bold|outline), `styleMode` (shadow|plain|watercolor),
`typeface` (rough|clean|mono).

**Connections**:
```
A > B            # arrow L→R
A < B            # arrow R→L
A <> B           # bi-directional
A - B            # line
A --> B          # dotted arrow
A > B: label     # labelled
A > B, C, D      # one-to-many (can fail to render in cloud-architecture — prefer one edge/line)
```
A name used in a connection that isn't defined becomes a blank node. Wrap reserved characters in
quotes: `User > "https://host": GET`.

**Diagram-level**: `direction down|up|right|left` (default right); `colorMode bold`;
`styleMode shadow`; `typeface clean`.

## Authoring rules that actually matter

- **Single-line labels.** Never put a newline inside `[label: "..."]` — it breaks rendering.
- **One edge per line; connect leaf nodes, not groups.** The `A > B, C, D` fan-out, and edges drawn
  between two *group containers* rather than leaf nodes, can make `cloud-architecture-diagram`
  silently return an **empty `imageUrl`** (HTTP 200, no error message). Give each edge its own line
  and point at concrete nodes. `render_eraser.py` now treats an empty `imageUrl` as a hard error, so
  if you hit this you'll see it immediately — split the offending fan-out/group edge and re-render.
- **Group by layer.** external actors → user-facing surfaces → application/pipeline → data stores →
  external recipients. This is what makes architecture diagrams legible.
- **`direction right` for layered systems.** It reads as flow (left→right). `down` plus nested groups
  gets tall and cramped. If the first render is cramped, flatten one nesting level and re-render.
- **Don't over-pack.** Capture the subsystems that explain the system. For large systems, ship
  multiple focused diagrams (context → pipeline → data model) rather than one wall of boxes.
- **Icons degrade gracefully.** Unknown icon names just render without an icon — labels carry the
  meaning, so don't stress over exact icon names. Common useful ones: `users, key, shield, server,
  monitor, lock, upload, folder, database, postgresql, git-merge, book, file-text, globe, refresh-cw,
  check-circle, list, dollar-sign, message-square, mic, react, vercel, github, openai, google`.

## Worked example (layered cloud architecture)

```
direction right
colorMode bold
styleMode shadow
typeface clean

Users [icon: users, label: "Roles: Owner / Operator / Admin"]
IdP [icon: key, label: "Identity Provider — MFA"]
Feed [icon: dollar-sign, label: "Bank Aggregator — READ ONLY"]

Region [icon: globe, label: "Cloud Region", color: blue] {
  Surfaces [icon: monitor, label: "User-facing surfaces"] {
    UI [icon: grid, label: "Dashboard"]
    Ingest [icon: upload, label: "Ingest"]
  }
  App [icon: server, label: "Application", color: green] {
    Match [icon: git-merge, label: "Matching engine"]
    Ledger [icon: book, label: "Accounting engine"]
  }
  Data [icon: database, label: "Persistence", color: orange] {
    DB [icon: postgresql, label: "Postgres"]
    Audit [icon: list, label: "Audit log — signed"]
  }
}

Users > Surfaces: HTTPS + MFA
IdP > Surfaces: auth
Feed > Match: daily feed
Surfaces > App
Match > Ledger: matched only
Ledger > DB
App > Audit: every write
```

## Other diagram types (when more appropriate than architecture)

- `sequence-diagram` — request/response and message flows over time (columns = actors, arrows =
  messages). Good for "how does auth/checkout/X flow work step by step".
- `entity-relationship-diagram` — data model (entities, attributes, relationships). Good for a DB
  schema view.
- `flowchart-diagram` — process/decision flows.
- `bpmn-diagram` — swimlane business processes (roles/responsibilities).

The render call + script are identical; only `diagramType` and DSL change. If you need their exact
syntax, fetch Eraser's docs or the bundled `eraser-diagrams` skill references.
