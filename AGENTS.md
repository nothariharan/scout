# Scout Agent Instructions

These instructions apply to the whole repository.

## Required context

Before changing the frontend, read [`DESIGN.md`](./DESIGN.md). It is the canonical specification for Scout's product meaning, information architecture, visual tokens, voice UX, mobile behavior, copy, and verification checklist.

## Frontend contract

- Preserve the universal flow: `Outcome → Targets → Conversations → Results`.
- Do not present Scout as a real-estate-only product. Real estate is one example.
- Keep the site light, human, editorial, and materially opaque. The navigation must never be transparent.
- Voice experiences use transcripts and call state, not chat-message UI.
- Use existing components and tokens before introducing new patterns.
- Keep generated or original production art under `apps/web/public/media` and optimize web-delivered assets.
- Never copy proprietary art, layout source, or brand assets from reference sites.
- Do not claim calls or agreements that are not supported by product state.

## Verification

For frontend changes, run `pnpm --filter @scout/web build` and visually check the routes and viewport sizes listed in `DESIGN.md`.
