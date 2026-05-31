#!/usr/bin/env python3
"""
Render an Eraser diagram-as-code DSL to a PNG via the free anonymous endpoint.

No API key required and NO external dependencies (uses only the stdlib) so it works
regardless of node/npm/PATH state. The render call sends only your DSL — not the
source spec.

Usage:
  python render_eraser.py --dsl diagram.eds --type cloud-architecture-diagram --out arch.png
  echo "<dsl>" | python render_eraser.py --stdin --out arch.png
  python render_eraser.py --dsl diagram.eds            # just print imageUrl + editorUrl

diagramType is one of:
  cloud-architecture-diagram | flowchart-diagram | sequence-diagram |
  entity-relationship-diagram | bpmn-diagram

Prints two lines on success:
  imageUrl=<https://...png>
  editorUrl=<https://app.eraser.io/new?...>     (open to edit the diagram)
"""
import argparse, json, sys, urllib.request, urllib.error

ENDPOINT = "https://app.eraser.io/api/render/elements"

def main():
    ap = argparse.ArgumentParser()
    src = ap.add_mutually_exclusive_group(required=True)
    src.add_argument("--dsl", help="path to a file containing the Eraser DSL")
    src.add_argument("--stdin", action="store_true", help="read DSL from stdin")
    ap.add_argument("--type", default="cloud-architecture-diagram", help="diagramType")
    ap.add_argument("--theme", default="dark", choices=["dark", "light"])
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--out", help="if set, download the rendered PNG to this path")
    ap.add_argument("--agent", default="claude", help="X-Skill-Source header value")
    args = ap.parse_args()

    dsl = sys.stdin.read() if args.stdin else open(args.dsl, "r", encoding="utf-8").read()
    if not dsl.strip():
        sys.exit("error: empty DSL")

    payload = json.dumps({
        "elements": [{"type": "diagram", "id": "d1", "code": dsl, "diagramType": args.type}],
        "scale": args.scale, "theme": args.theme, "background": True,
    }).encode("utf-8")

    req = urllib.request.Request(ENDPOINT, data=payload, method="POST", headers={
        "Content-Type": "application/json",
        "X-Skill-Source": args.agent,
    })
    try:
        with urllib.request.urlopen(req, timeout=90) as r:
            data = json.loads(r.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        sys.exit(f"error: HTTP {e.code}\n{body}\n"
                 "(check DSL syntax + that diagramType matches the DSL)")
    except Exception as e:
        sys.exit(f"error: {e}")

    image_url = data.get("imageUrl", "")
    editor_url = data.get("createEraserFileUrl", "")
    print("imageUrl=" + image_url)
    print("editorUrl=" + editor_url)

    if not image_url:
        # Eraser can return HTTP 200 with an empty imageUrl when the DSL fails to
        # lay out — most often a connection that fans out to many comma-separated
        # targets, or a group->group edge. Treat as a hard error so callers notice.
        sys.exit("error: Eraser returned an empty imageUrl (DSL likely failed to render). "
                 "Use one edge per line and avoid group-to-group edges, then retry.")

    if args.out and image_url:
        try:
            with urllib.request.urlopen(image_url, timeout=60) as r, open(args.out, "wb") as f:
                f.write(r.read())
            print("saved=" + args.out)
        except Exception as e:
            sys.exit(f"error downloading PNG: {e}")

if __name__ == "__main__":
    main()
