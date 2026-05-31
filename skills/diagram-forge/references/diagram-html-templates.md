# HTML templates (proven patterns)

Self-contained scaffolds for the three outputs. Adapt freely — these are starting points that are
known to work, not rigid forms. Keep pages standalone (one CDN dependency at most) so clients can open
them by double-clicking.

---

## 1. Spec page (faithful styled HTML from a PDF)

Key ingredients: dark cover header, **sticky auto-generated TOC**, styled/zebra tables, checklist
boxes, callouts, badges, dark code blocks, print rules. Stylesheet skeleton:

```css
:root{--ink:#1f2125;--muted:#6b7079;--line:#e6e4df;--bg:#f4f2ee;--card:#fff;
  --brand:#1b4965;--brand2:#2a6f97;--good:#1f7a45;--good-soft:#e9f5ee;
  --bind:#a4161a;--bind-soft:#fbe9e9;--accent:#c9892f;--code:#161b26;--codeink:#e7ebf3;}
*{box-sizing:border-box} html{scroll-behavior:smooth}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.62 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif}
.cover{background:linear-gradient(135deg,#10212e,#081019);color:#fff;padding:56px 8vw 46px}
.cover .cls{display:inline-block;background:#7a1f1f;color:#ffdede;font-size:11px;font-weight:700;letter-spacing:.12em;padding:4px 11px;border-radius:5px}
.cover h1{font-size:42px;line-height:1.06;margin:18px 0 6px;font-weight:800}
.shell{display:grid;grid-template-columns:266px 1fr;max-width:1240px;margin:0 auto}
nav.toc{position:sticky;top:0;align-self:start;max-height:100vh;overflow:auto;padding:24px 14px;font-size:13px;border-right:1px solid var(--line)}
nav.toc a{display:block;color:var(--muted);text-decoration:none;padding:3px 8px;border-radius:6px}
nav.toc a.h3{padding-left:20px;font-size:12px} nav.toc a:hover{background:#eceae5;color:var(--ink)}
main{padding:30px 44px 90px;min-width:0;max-width:900px}
h2{font-size:25px;margin:50px 0 6px;padding:8px 0;border-bottom:3px solid var(--accent);color:var(--brand);font-weight:800}
h3{font-size:17.5px;margin:28px 0 8px;color:var(--brand2);font-weight:700}
table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;background:var(--card);border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid var(--line);vertical-align:top}
thead th{background:#eef0f2;font-size:11.5px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
tbody tr:nth-child(even){background:#faf9f7}
.sc{background:var(--good-soft);border:1px solid #cfe7d8;border-left:4px solid var(--good);border-radius:11px;padding:13px 16px;margin:14px 0}
.sc ul{list-style:none;padding:0;margin:0} .sc li{position:relative;padding-left:24px;margin:6px 0}
.sc li::before{content:"\2713";position:absolute;left:0;color:var(--good);font-weight:800}
.badge{display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:.06em;padding:2px 7px;border-radius:5px}
.b-mvp{background:#e7eff6;color:#1b4965}.b-post{background:#eceae5;color:#5b5b66}.b-bind{background:var(--bind-soft);color:var(--bind)}
.callout{border-radius:11px;padding:13px 16px;margin:16px 0;border:1px solid}
.callout.bind{background:var(--bind-soft);border-color:#ecc6c6;border-left:4px solid var(--bind)}
pre{background:var(--code);color:var(--codeink);border-radius:11px;padding:14px 16px;overflow-x:auto;font-size:12.5px;line-height:1.5;font-family:ui-monospace,Menlo,Consolas,monospace}
@media(max-width:980px){.shell{grid-template-columns:1fr}nav.toc{display:none}main{max-width:none}}
@media print{.cover{-webkit-print-color-adjust:exact;print-color-adjust:exact}nav.toc{display:none}.shell{display:block}}
```

Auto-TOC script (drop before `</body>`; builds the sidebar from headings):

```html
<script>(function(){var m=document.querySelector('main'),t=document.querySelector('nav.toc');
m.querySelectorAll('h2,h3').forEach(function(h,i){h.id='s'+i;var a=document.createElement('a');
a.href='#s'+i;a.textContent=h.textContent.replace(/\s+/g,' ').trim();
if(h.tagName==='H3')a.className='h3';t.appendChild(a);});})();</script>
```

Structure: `<header class="cover">…</header><div class="shell"><nav class="toc"></nav><main>…sections…</main></div><footer>…</footer>`.

---

## 2. Eraser diagram page (embed the rendered PNG)

After `render_eraser.py` gives you `imageUrl` (download to a local PNG) and `editorUrl`:

```html
<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>PROJECT — System Architecture</title>
<style>
 body{margin:0;font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;background:#f7f7f5;color:#1c1c1e}
 .wrap{max-width:1040px;margin:0 auto;padding:30px 22px 70px}
 header{background:linear-gradient(135deg,#0f2a3f,#0a1c2b);color:#fff;border-radius:14px;padding:30px}
 .figure{background:#0e1726;border-radius:14px;padding:14px;margin-top:22px}
 .figure img{display:block;width:100%;height:auto;border-radius:8px}
 .btn{display:inline-block;background:#2f6f4f;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:8px 14px;border-radius:9px}
 h2{border-bottom:2px solid #e4e4e0;padding-bottom:8px;margin-top:38px}
 table{width:100%;border-collapse:collapse;font-size:14px;background:#fff;border:1px solid #e4e4e0;border-radius:10px;overflow:hidden}
 th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #e4e4e0;vertical-align:top}
 pre{background:#1e1e24;color:#e7e7ea;border-radius:11px;padding:14px 16px;overflow-x:auto;font-size:12.5px}
</style></head><body><div class="wrap">
 <header><h1>PROJECT — System Architecture</h1><p>Generated with diagram-forge. <a style="color:#9ec9b4" href="PROJECT-spec.html">Full spec →</a></p></header>
 <div class="figure"><img src="PROJECT-architecture.png" alt="…"/>
   <p><a class="btn" href="EDITOR_URL" target="_blank" rel="noopener">Open / edit in Eraser →</a></p></div>
 <h2>How data flows</h2><ol>…walk the pipeline…</ol>
 <h2>Component legend</h2><table>…layer → components → spec §…</table>
 <h2>Diagram source (Eraser DSL)</h2><pre>…the DSL…</pre>
 <footer>… cross-link back to spec + Mermaid/Excalidraw variants …</footer>
</div></body></html>
```

Include: the image, the editor link, a "how data flows" walkthrough, a component legend mapped to
spec sections, and the DSL (so it's regenerable). Reference the PNG **relatively** so the page + image
travel together.

**HTML-escape the DSL before embedding it in `<pre>`.** Eraser's ERD operators use `<` (one-to-many)
and labels can contain `&`; pasted raw, the browser reads `<word` as a start tag and silently swallows
the rest of the page — the ERD page looks blank below that line. Replace `&`→`&amp;` first, then
`<`→`&lt;` (`>` is safe to leave). Architecture/sequence/flowchart DSLs usually have no `<`, but
escaping is always safe.

---

## 3. Mermaid page (renders in-browser, no watermark)

```html
<pre class="mermaid">
flowchart LR
  Users["Roles: Owner / Operator / Admin"]
  subgraph SG["Cloud Region"]
    subgraph SUR["Surfaces"]
      UI["Dashboard"]; Ingest["Ingest"]
    end
    subgraph APP["Application"]
      direction TB
      Match["Matching"]; Ledger["Accounting"]
    end
    subgraph DATA["Persistence"]
      DB[("Postgres")]; Audit[("Audit log — signed")]
    end
  end
  Users -->|HTTPS+MFA| SUR
  Ingest --> Match --> Ledger --> DB
  APP -->|every write| Audit
  classDef app fill:#16321f,stroke:#3f7a52,color:#dfeede;
  class Match,Ledger app;
</pre>
<script type="module">
  try{ const m=(await import('https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs')).default;
       m.initialize({startOnLoad:true,theme:'dark',securityLevel:'loose',flowchart:{useMaxWidth:true,htmlLabels:true}}); }
  catch(e){ document.getElementById('err').style.display='block'; console.error(e); }
</script>
```

Notes: `flowchart LR` with nested `subgraph`s = layered architecture. Edges may target a subgraph id
(e.g. `APP -->|every write| Audit`). `classDef` + `class` color the layers. Include a small hidden
`#err` div shown on catch (CDN needed on first load). Truly self-contained otherwise; no watermark;
the diagram text is editable.

---

## 4. Excalidraw page (editable, UMD build)

Use the **UMD** build (bundles its own CSS — the ESM build's separate CSS path is unreliable). React
UMD + ReactDOM UMD + `excalidraw.production.min.js` from unpkg; feed concise skeletons to
`convertToExcalidrawElements` (it fills defaults; you control the grid coordinates).

```html
<div id="app" style="height:100vh"></div>
<div id="fallback" style="display:none">… open the Mermaid/Eraser version, or paste mermaid at excalidraw.com …</div>
<script>window.EXCALIDRAW_ASSET_PATH="https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/";</script>
<script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
<script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
<script src="https://unpkg.com/@excalidraw/excalidraw@0.17.6/dist/excalidraw.production.min.js" crossorigin></script>
<script>(function(){try{
  var L=window.ExcalidrawLib, R=window.React;
  var box=function(id,x,y,w,h,t,bg){return{type:"rectangle",id:id,x:x,y:y,width:w,height:h,
     backgroundColor:bg,fillStyle:"solid",strokeColor:"#1e1e1e",roundness:{type:3},
     label:{text:t,fontSize:14,fontFamily:2}};};
  var arr=function(a,b,x,y,t){return{type:"arrow",x:x,y:y,strokeColor:"#495057",
     start:{id:a},end:{id:b},label:t?{text:t,fontSize:11}:undefined};};
  var skeleton=[ /* region container first, then boxes (cols by layer), then arrows */
    box("users",40,300,220,64,"Roles","#a5d8ff"),
    box("match",620,300,210,56,"Matching","#b2f2bb"),
    box("db",900,300,220,64,"Postgres","#ffd8a8"),
    arr("users","match",270,330,"MFA"), arr("match","db",835,330,"") ];
  var els=L.convertToExcalidrawElements(skeleton);
  var App=function(){return R.createElement(L.Excalidraw,{initialData:{elements:els,
     appState:{viewBackgroundColor:"#ffffff"},scrollToContent:true}});};
  window.ReactDOM.createRoot(document.getElementById("app")).render(R.createElement(App));
}catch(e){console.error(e);document.getElementById("app").style.display="none";
  document.getElementById("fallback").style.display="block";}})();</script>
```

Layout tips: lay boxes out in columns by layer (external x≈40, surfaces x≈330, app x≈620, data
x≈900, recipients x≈1190); a big light dashed rectangle placed first acts as the region container.
Always ship the fallback `<div>` since it depends on a CDN at view time. Once loaded, the user edits
on the canvas and exports via Excalidraw's menu (.excalidraw / PNG / SVG).
