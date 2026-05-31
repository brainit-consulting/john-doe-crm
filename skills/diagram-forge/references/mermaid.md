# Mermaid notes (for the in-browser architecture page)

Mermaid renders client-side from text via one CDN module — so the page is self-contained, has no
watermark, and the diagram source stays editable. Best when the client wants a single portable file.
Full page scaffold is in `diagram-html-templates.md` (§3).

## Layered architecture = `flowchart LR` + nested `subgraph`

```
flowchart LR
  Actor["External actor"]
  subgraph REGION["Cloud Region"]
    subgraph SUR["Surfaces"]
      A["Dashboard"]
    end
    subgraph APP["Application"]
      direction TB
      B["Service"]
    end
    subgraph DATA["Persistence"]
      DB[("Database")]
    end
  end
  Actor -->|HTTPS| SUR
  A --> B --> DB
```

- Node shapes: `["box"]`, `(["rounded"])`, `[("cylinder/DB")]`, `{"decision"}`.
- Edges: `-->` arrow, `-->|label|` labelled, `-.->` dotted, `---` line.
- An edge endpoint can be a **subgraph id** (e.g. `APP -->|every write| Audit`) — handy for
  "everything writes to the audit log" style flows.
- Color layers with `classDef name fill:#..,stroke:#..,color:#..;` then `class NodeA,NodeB name;`.
- Set `direction TB` inside a subgraph to stack its children while the page flows `LR`.

## Initialize

```js
mermaid.initialize({ startOnLoad:true, theme:'dark', securityLevel:'loose',
                     flowchart:{ useMaxWidth:true, htmlLabels:true } });
```

## Gotchas

- Quote labels with punctuation/parentheses to avoid parse errors: `X["Vessel View (Ops)"]`.
- Keep ids alphanumeric; put the pretty text in the `["label"]`.
- Wrap the import in try/catch and show a small fallback message — the CDN is needed on first load.
- For request/response step flows, a Mermaid `sequenceDiagram` is often clearer than a flowchart.
