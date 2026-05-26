<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# Localization is required

Always localize user-facing text. Do not hardcode copy in page/component files when translation keys exist or should exist.

When adding or changing user-visible text:

- Update all active locale message files in `messages/` (`en.json`, `id.json`, and `id-x-gaul.json` at minimum).
- Keep translation keys consistent across locales.
- Use `t("...")`/i18n lookups in UI code instead of inline strings.

# Use stack-specific skills and rules

Before implementing changes, identify the active tech stack from project files and dependencies, then apply the matching skill/rule set first.

- Next.js/App Router work: follow local Next.js docs in `node_modules/next/dist/docs/` and project conventions.
- shadcn/ui work: use shadcn composition/CLI/docs workflow and prefer existing shadcn components.
- i18n work: preserve locale routing and update all locale message files for user-facing copy changes.
- Clerk auth work: use current Clerk APIs and avoid deprecated patterns.

If multiple stacks are involved, apply all relevant rules together (for example: Next.js + shadcn + i18n).

# State and data rules (Zustand + React Query)

This project uses both Zustand and TanStack React Query. Use each for its intended purpose:

- Use React Query (`@tanstack/react-query`) for server state:
  - API fetching, caching, retries, background refetch, invalidation, and mutation lifecycle.
  - Prefer query keys and invalidation over manual cache syncing.
- Use Zustand for client/UI state:
  - local interaction state, UI preferences, transient workflow state, cross-component client-only state.
  - Do not duplicate server-fetched entities in Zustand unless there is a clear, documented reason.
- Keep boundaries clear:
  - Server data lives in React Query cache.
  - UI/client state lives in Zustand stores.

# Folder conventions

- Use `services/` for Firebase service functions.
- Use `hooks/` for React Query custom hooks.
- Use `stores/` for Zustand stores.
<!-- END:nextjs-agent-rules -->
