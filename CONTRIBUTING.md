# Contributing

## Protect the integration surface

1. Make shared-data changes in `packages/contracts` first, with an example fixture in `packages/evals`.
2. Keep each application independently runnable; apps must not import source files from another app.
3. Keep vertical-specific values in `packages/vertical-config`, not inside prompts or business logic.
4. Emit a structured `CallOutcome` for every call: quote, callback, decline, or error. Never leave an unstructured verbal summary as the result.
5. Treat transcripts and recordings as evidence. Store references and consent metadata, never secrets or raw customer documents in Git.

## Branching and merge order

- Use one short-lived branch per workstream.
- Land contract changes before the dependent implementation.
- Rebase or merge `main` before a cross-app demo.
- One owner performs the final end-to-end demo run; component demos alone do not count as integration sign-off.

