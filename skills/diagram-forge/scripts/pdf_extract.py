#!/usr/bin/env python3
"""
Dump clean per-page text + detected tables from a PDF, to use as raw material when
HAND-BUILDING a faithful styled HTML version of a spec.

Requires PyMuPDF:  pip install pymupdf   (import name is `fitz`)

Usage:
  python pdf_extract.py "path/to/spec.pdf"            # text + tables (markdown) to stdout
  python pdf_extract.py "spec.pdf" --pages 1-3        # subset
  python pdf_extract.py "spec.pdf" --no-tables        # text only

Why this exists: do NOT ship `get_text("html")` output as the deliverable — it's
absolutely-positioned spans that overlap and read as broken on designed PDFs, and
find_tables() over-detects cover/TOC pages. Use this dump to get the clean wording
and table data, then assemble semantic HTML by hand (see references/pdf-to-html.md).
"""
import argparse, sys

def parse_pages(spec, n):
    if not spec: return range(n)
    out = set()
    for part in spec.split(","):
        if "-" in part:
            a, b = part.split("-"); out.update(range(int(a)-1, int(b)))
        else:
            out.add(int(part)-1)
    return sorted(p for p in out if 0 <= p < n)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--pages", help="e.g. 1-3 or 2,4,6 (1-based)")
    ap.add_argument("--no-tables", action="store_true")
    args = ap.parse_args()
    try:
        import fitz
    except ImportError:
        sys.exit("PyMuPDF not installed. Run:  pip install pymupdf")

    doc = fitz.open(args.pdf)
    pages = parse_pages(args.pages, doc.page_count)
    total = 0
    print(f"# PDF: {args.pdf}\n# pages={doc.page_count}  extracting={len(pages)}\n")
    for i in pages:
        page = doc[i]
        txt = page.get_text("text")
        total += len(txt)
        print(f"\n===== PAGE {i+1} =====\n")
        print(txt.rstrip())
        if not args.no_tables:
            try:
                tabs = list(page.find_tables())
            except Exception:
                tabs = []
            for ti, t in enumerate(tabs):
                rows = t.extract()
                if not rows: continue
                print(f"\n--- table p{i+1}#{ti+1} (verify; find_tables can over/under-detect) ---")
                for r in rows:
                    print("| " + " | ".join((c or "").strip().replace("\n", " ") for c in r) + " |")
    print(f"\n# total_text_chars={total}  avg_per_page={total//max(1,len(pages))}")
    if total < 300 * len(pages):
        print("# WARNING: very little text extracted — the PDF may be scanned (needs OCR).")

if __name__ == "__main__":
    main()
