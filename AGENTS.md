# Repository Guidelines

## Project Overview

KoSync UI is a self-hosted KOReader progress synchronization server with a web interface.
Preserve compatibility with the upstream KoSync API and existing Redis data. Store additional
document metadata without modifying the upstream data format.

Upstream references:

- https://github.com/koreader/koreader-sync-server
- https://github.com/koreader/koreader

## Language

Write all repository-authored text in English, including documentation, comments,
identifiers, UI copy, error messages, logs, test descriptions, and example text.
Apply this requirement to all files in the repository.

## Stack and Commands

Use SvelteKit, TypeScript, pnpm, adapter-node, node-redis (`redis`), plain CSS,
ESLint with ESLint Stylistic, Jest, Docker, and Docker Compose. Keep a single SvelteKit application.
Do not introduce a separate backend, monorepo, ORM, or UI framework unless requested.

Run commands from the repository root:

- `pnpm install` — install dependencies.
- `pnpm dev` — start the development server.
- `pnpm check` — run Svelte and TypeScript diagnostics.
- `pnpm lint` — check code and formatting.
- `pnpm format` — apply ESLint automatic fixes.
- `pnpm lint:fix` — apply ESLint automatic fixes.
- `pnpm test` — run Jest.
- `pnpm build` — create a production build.

Treat package.json as the source of truth. Run relevant checks after changes and report failures
or checks that could not run. Use pnpm for dependency changes; do not edit pnpm-lock.yaml manually.

## Project Structure

- `src/routes/` — pages, server load functions, form actions, and HTTP endpoints.
- `src/lib/components/` — reusable UI components.
- `src/lib/server/` — Redis access, authentication, sessions, and metadata.
- `src/lib/server/kosync/` — upstream protocol and storage operations.
- `scripts/` — standalone Node.js utilities using `.mjs`.
- `static/` — public assets.
- `docs/` — architecture decisions and compatibility details.

Keep route handlers small. Create modules when needed; avoid empty scaffolding and unnecessary layers.

## Modern Svelte and SvelteKit

Use modern stable APIs supported by the installed versions. Do not upgrade major versions or
adopt experimental APIs merely to obtain newer syntax.

For new Svelte 5 components:

- Use runes: `$state`, `$derived`, and `$props` where appropriate.
- Use `$effect` only for side effects, not to compute derived values.
- Use event attributes such as `onclick` and callback props rather than legacy event directives
  or createEventDispatcher.
- Use snippets and `{@render ...}` instead of legacy slots.
- Avoid introducing legacy `$:` statements or `export let` component props.
- Use `<script lang="ts">` and the framework's generated types where applicable.

Use current SvelteKit routing, server load functions, and form actions. Use `$app/state` instead
of deprecated `$app/stores` where supported. Keep secrets and Redis access in server-only modules.
Follow existing configuration conventions for the installed SvelteKit version rather than
copying configuration from a different major version.

## Svelte Documentation and MCP

Reference: https://svelte.dev/docs/ai/instructions

When Svelte MCP is connected, follow the official workflow:

- Begin Svelte/SvelteKit work with `list-sections`; inspect section descriptions and use cases.
- Retrieve every relevant section through `get-documentation` before implementation.
- Run `svelte-autofixer` on Svelte code before delivery; address its findings and repeat until clean.
- Use `playground-link` only after user confirmation and only for code not written into project files.

If these tools are unavailable, consult the official Svelte/SvelteKit documentation directly,
state the limitation, and continue. Do not claim to have used unavailable tools.

## Implementation Guidelines

Treat `eslint.config.js` as the source of truth for formatting and lint rules.
Read it before editing code. Use the repository scripts to apply fixes and check
the result. Inspect the resulting diff. Do not weaken rules, add suppressions,
or change configuration merely to make new code pass. Change lint policy only
when the task calls for it.

Use TypeScript and ESM for application code. Validate and narrow external data at
application boundaries. Prefer current Node.js and SvelteKit capabilities before
adding dependencies. Keep functions and dependencies straightforward, and avoid
combining unrelated operations merely to satisfy a formatting rule.

Prefer arrow functions for ordinary helpers when their semantics fit. Keep
regular functions where needed, including generators, overload declarations, and
functions relying on dynamic `this`.

Comments should explain non-obvious reasons, constraints, or compatibility
decisions. Avoid comments that repeat variable names, function names, types, or
obvious operations. Keep explanations to the user focused on meaningful changes.

Do not touch README.md nor create or edit any additional .md files in the projet's
root if not being asked to.

## Helper Scripts

Write standalone utilities in `scripts/*.mjs`, using ESM imports, the `node:` prefix for built-ins,
and top-level await where useful. Run them with `node scripts/<name>.mjs`.
Do not add a TypeScript runtime solely for helper scripts. Keep application code in TypeScript.

## Compatibility

Inspect upstream source before changing protocol behavior or Redis storage. Preserve methods,
paths, headers, payloads, authentication, responses, status codes, Redis key names, value types,
serialization, and progress update semantics, including repeated updates and earlier positions.

Existing data must work without a mandatory migration, and upstream-format writes must remain
usable by the original server. Keep additional metadata and sessions in separate keys that do not
interfere with upstream lookups or enumeration.

Verify metadata transmission support in KOReader source. Distinguish custom extensions from
standard behavior. Record inspected commit SHAs and known limitations in docs/compatibility.md.
Do not claim compatibility without verification.

## Jest and Compatibility

Use Jest for server-side tests. Prioritize black-box HTTP contract tests against
a pinned revision of the original `koreader-sync-server`. Run the same requests
against both implementations with isolated Redis instances and equivalent seeded
data. Compare status codes, relevant headers, and response bodies. Normalize only
documented nondeterministic fields.

Cover registration, authentication failures, progress reads and writes, repeated
updates, earlier reading positions, and user isolation. Verify that upstream Redis
fixtures work without migration and that upstream-format writes can be read by
the original server. Record the reference revision in `docs/compatibility.md`.
Use only disposable local services and synthetic credentials. Keep web-only
extensions separate from the upstream contract suite.

## Security and UI

Separate KoSync API authentication from server-side web sessions. Use HttpOnly cookies with an
explicit SameSite policy and Secure enabled for HTTPS. Enforce document ownership on the server.
Never expose credentials or tokens in client data, browser storage, logs, or committed files.
Keep .env.example limited to placeholders. Do not access live servers or modify existing user
data unless explicitly requested.

Use semantic HTML, labelled controls, keyboard access, and responsive layouts. Handle empty
results, missing metadata, and failures. Display document identifiers as fallbacks; never infer
book titles from hashes.

## Deployment and Scope

Use separate application and Redis services in Compose. Persist Redis data in a volume and keep
its port unpublished by default. Keep deployment files and README consistent with actual behavior.

Do not add book storage, covers, OPDS, reading analytics, social features, or a plugin system
unless requested. Keep changes focused and preserve unrelated user edits.

Maintain usage instructions in README.md, architectural decisions in docs/architecture.md, and
durable agent guidance here. Do not use this file as an implementation plan or progress log.
