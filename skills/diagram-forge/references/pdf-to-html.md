# PDF spec → faithful, styled HTML — playbook

Goal: a clean, readable HTML rendering of a client spec **with the wording unchanged**. You are
reformatting, not rewriting. Never modify the source PDF — it stays the system of record.

## Why auto-conversion alone fails on real specs

Designed PDFs (cover pages, multi-column TOCs, tracked heading type, tables) defeat naive extraction:

- `page.get_text("html")` → absolutely-positioned `<span>`s that overlap and read as broken.
- `page.find_tables()` → over-detects the cover/TOC as giant tables and swallows body text into empty
  `<td>`s; on plain prose it can also miss real tables.
- Heading glyphs come out **letter-spaced** ("F O R E W O R D") because the PDF tracks them.
- Ligatures/subscripts (e.g. `journal_entries`) can split oddly.

So: **extract the clean content, then assemble semantic HTML by hand.** Hand-assembly is what makes
it look good and stay faithful.

## Recipe

1. **Get clean content.** Read the PDF with the Read tool (it returns clean text per page) and/or run
   `scripts/pdf_extract.py "spec.pdf"` for per-page text + candidate tables. Confirm it's text-based;
   if `pdf_extract.py` warns of very little text, it's scanned → OCR needed (flag to the user; out of
   scope here).
2. **Rebuild semantically.** Map the content to real HTML:
   - section titles → `<h2>` (with a section-number span), sub-sections → `<h3>`
   - tables → `<table>` (header row in `<thead>`)
   - lists → `<ul>`/`<ol>`; "success criteria / ✓" lists → a styled checklist box
   - pseudocode, posting logic, data-model/entity blocks → `<pre>`
   - keep the spec's exact wording; fix only the extraction artifacts (letter-spacing, broken
     underscores, stray hyphenation)
3. **Style it** using the spec-page stylesheet in `diagram-html-templates.md`: a dark cover header
   (title, version, jurisdiction, status, classification), a **sticky auto-generated TOC** built from
   the headings via a tiny script, styled/zebra tables, success-criteria checklist boxes, callouts
   (e.g. for BINDING/legal blocks), `MVP / POST-MVP / BINDING`-style badges, and dark `<pre>` code
   blocks. Make it print-friendly (`@media print`).
4. **Mark provenance + confidentiality.** Add a small line: "Faithful HTML rendering of the source
   PDF — content preserved, presentation reformatted. The PDF remains the system of record." If the
   doc is classified/NDA, carry that banner into the HTML.
5. **Completeness check.** For long specs, verify every section and table from the source made it in.
   `pdf_extract.py`'s output is your checklist.

## Output location & naming

Write next to the source PDF (e.g. `PROJECT-spec.html`). Cross-link it to the diagram page(s). Do not
copy NDA specs into unrelated repos or send them anywhere except the (DSL-only) diagram render call.
