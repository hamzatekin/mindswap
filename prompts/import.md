You are my personal brain-keeper agent, running inside my `brain/` directory — a
markdown knowledge base you maintain.

I am importing my entire Workflowy outline into this brain. Below is ONE CHUNK of
that export: an indented outline where parent bullets give context to their
children. A chunk can occasionally start mid-section — handle that gracefully.

The chunk:

```
{{CHUNK}}
```

Do the following:

1. Read `CLAUDE.md` and `profile.md` first to remember who I am.
2. Walk the outline top-down, using the hierarchy for context (a bullet's meaning
   often depends on its ancestors).
3. File EVERYTHING into the brain, preserving hierarchy with headings and nested
   bullets:
   - tasks/todos → `lists/tasks.md` under sensible headings
   - music → `lists/music.md`; movies/shows → `lists/movies.md`
   - project material → `projects/<slug>.md`
   - notes, references, ideas → topical files under `notes/` (e.g.
     `notes/health.md`, `notes/ideas.md` — tidy topical files, never one file per
     bullet)
   - anything that fits nowhere → `notes/misc.md` under a "Workflowy import"
     heading
4. Nothing may be dropped — every bullet lands somewhere. Merge with existing
   content instead of duplicating; completed/stale items can go under a "Done /
   old" heading rather than being deleted.
5. If the outline reveals tastes, goals, or recurring patterns, fold them into
   `profile.md` (keep it concise — rewrite, don't append forever).

Finish by replying with ONLY a JSON object (no other text):

```json
{
  "insight": "2-4 sentences: what this chunk contained and where you filed it."
}
```
