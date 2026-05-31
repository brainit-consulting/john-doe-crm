# Analysis playbook — code → system model

**Read-only.** Never checkout/stash/pull/commit/push or write into the repo. Analyze the current
working tree. Record provenance (`<repo>@<branch>#<sha>`) from `resolve_repo.py`.

## Layered survey (read load-bearing files, not everything)
1. **Manifests/config** — package.json + lockfile, pyproject/requirements, ORM schema
   (Drizzle/Prisma/SQL migrations), framework config (next.config, vite, etc.), `vercel.json`/
   `vercel.ts`, `.env.example`, Dockerfile, CI workflows. → stack, deployment, env vars.
2. **Entry points** — server/app roots, layouts, middleware/proxy.
3. **Routes / controllers / handlers** — the API + page surface. → routes[], features.
4. **Data model** — tables/entities + relations from schema + migrations. → dataModel.
5. **Modules / components** — major directories and their responsibility. → services[], module map.
6. **External integrations** — third-party SDKs + the env vars that gate them. → integrations[].
7. **Tests** — what's covered, how the app is exercised. → confirms behavior/flows.

Map first with ripgrep/glob (don't open everything); then read the representative + load-bearing
files per layer. **Exclude dependency/build dirs** — `node_modules/`, `.next/`, `dist/`, `build/`,
`.turbo/`, `coverage/`, `vendor/`. A naive glob like `**/package.json` is otherwise swamped and
truncated by thousands of dependency files, burying the repo's own manifests (which live at the root or
first level). ripgrep honors `.gitignore` by default; with a Glob tool, scope the `path` to the repo's
own dirs (`app/`, `lib/`, `src/`, …). **Next.js route groups** like `(staff)` / `(portal-auth)` have
literal parentheses in the folder name — match them by scoping the Glob `path` to that directory, not
by putting the parens in the pattern (they read as glob groups and match nothing).

## Scale strategy
For large repos/monorepos, fan out with subagents — one per subsystem (e.g. api, web, db, infra) —
each returning its slice of the model; then synthesize. Give each a **strict scope** and tell it to say
"out of scope" rather than guess about code it wasn't assigned — otherwise two agents emit contradictory
claims about the same file. Ask each to **tag claims verified-from-file vs inferred**, and keep them
**read-only** (no writes/git). When synthesizing, **ground-truth the route / entity / integration lists
against the filesystem** (a directory listing) before asserting them — fan-out agents tend to
over-enumerate and hedge. **Note which packages were deep-read vs summarized** in the spec (no silent
truncation).

## System model (the single intermediate artifact)
Produce a structured object that feeds both spec and diagrams:
```
{ overview, stack:[], actors:[], surfaces:[], services:[],
  dataModel:{ entities:[{name,fields,...}], relations:[{from,to,kind}] },
  routes:[{method,path,handler,purpose}], integrations:[{name,via,envVar}],
  envVars:[{name,purpose,required}], flows:[{name,steps:[]}], deployment }
```
Everything downstream is a projection of this model.
