# Consolidated Execution Plan

Single source of truth for all remaining work, produced from a full audit of the codebase on 2026-08-09. It replaces `DEPLOYMENT.md`, `IMPROVEMENTS.md`, `PORTFOLIO_TODO.md`, and `Frontend_Improvement_Plan.md`, whose open items are carried forward below. `CS499_Enhancement_Plan.md` stays as the original course enhancement plan; this file tracks what is still open against it.

## Where things stand

Verified implemented in the code as of commit `22876e8`, re-audited 2026-08-11:

- Full-stack monorepo: FastAPI backend, React frontend, Postgres with Alembic migrations 0001 through 0004
- Auth complete: signup, login, JWT, bcrypt, default viewer role, account-active checks on both login and every authenticated request
- Normalized schema with four lookup tables, rescue profile tables, and pg_trgm trigram indexing on breed names
- Rescue-profile matching endpoint with weighted breed/age/sex/availability scoring, ranking, and pagination
- Animal search by name, breed, and animal ID with type filter and pagination, plus breed-summary endpoint, admin seed script, and idempotent CSV importer
- Admin user management (list, change role, toggle active, delete with self-delete guard) behind `require_role("admin")`
- Backend animal management: create, partial update, archive/unarchive with lookup validation, staff/admin gating, and audit logging on every mutation
- Animal management UI: add form, edit page with archive/unarchive confirmation, manage page with typeahead, detail page, role-gated nav and routes, dashboard row actions opening the detail page for everyone and the edit page for staff/admin, all tested
- MUI migration essentially done: theme with light/dark schemes, AppBar shell with logo and active-route styling, auth cards with password toggle and loading states, dashboard DataGrid with server pagination and page-size selector, outcome chips, match-score progress bars with component-score tooltips, admin panel with Snackbar feedback, self-edit lockout in the UI, and skeleton loading states
- Global 401 handling: expired tokens clear auth state and redirect to login with a session-expired message; the JWT `exp` claim also triggers a proactive sign-out the moment the token expires
- SPA rewrite in `vercel.json`, so deep links work
- Deployment live: Vercel (frontend + backend), Neon Postgres, migrations applied, admin seeded, 10000 animals imported, site verified end to end
- AWS Lambda migration runner built, deployed to us-east-2, and test-invoked
- Test suites: 10 backend modules and 27 frontend files, including axe accessibility audits
- Portfolio site: code review page, all three enhancement pages with reflections, profile photo wired up

## Gap analysis

| Source plan | Item | Status |
|---|---|---|
| Enhancement plan | Add / update / archive animal endpoints | Done 2026-08-10, POST, PATCH, and archive/unarchive routes with lookup validation |
| Enhancement plan | Staff role gating animal management | Done 2026-08-10, write routes require staff or admin via `require_role` |
| Enhancement plan | Archive instead of hard delete | Done 2026-08-10, `archived_at` column via migration 0005, archived records excluded from search and matches but retrievable by id |
| Enhancement plan | Audit logging of admin and animal changes | Done 2026-08-10, `audit_log` table via migration 0006 with log calls on all admin and animal mutations |
| Enhancement plan | Admin can remove accounts | Done 2026-08-10, `DELETE /admin/users/{id}` with a self-delete guard, audit rows survive actor deletion |
| Enhancement plan | Staff/admin animal management UI flows | Done 2026-08-11, add/edit/manage pages with lookup selects, archive with confirmation, role-gated nav and routes, all with tests |
| Pseudocode flows | Animal detail view from search results | Done 2026-08-12, every dashboard row carries a view action navigating to the detail page |
| Pseudocode flows | Update path via management page with typeahead | Done 2026-08-11, manage page typeahead loads the selected record into the edit form |
| Pseudocode flows | Optional filters in match mode | Missing, matches endpoint accepts only pagination |
| Enhancement plan | Google SSO, staff domain recognition | Deferred stretch, never started |
| Improvements backlog | Session-expired message on login page | Done 2026-08-11, RequireAuth carries a session-expired reason in its redirect state and LoginPage renders it as a `role="status"` Alert |
| Improvements backlog | Session-timeout warning from JWT `exp` | Done 2026-08-11, the decoded `exp` claim schedules a proactive sign-out that shows the same message |
| Frontend plan phase 2 | NavBar user Avatar + Menu | Partial, inline Chip + button instead |
| Frontend plan phase 4 | Breed-summary endpoint accepts a profile | Done 2026-08-12, `profile_id` query param scopes the summary to the profile's candidate pool |
| Frontend plan phase 4 | Map scope in match mode | Done 2026-08-12, both visuals carry scope captions, chart full pool and map current page |
| Frontend plan phase 5 | Role/status Chip badges in admin table | Partial, only a "You" chip |
| Frontend plan phase 6 | Explicit `aria-live` on alerts and snackbar | Done 2026-08-12, explicit `role="alert"`/`role="status"` on alerts and the admin Snackbar |
| Backend (found in audit) | Self-demotion guard server-side | Done 2026-08-11, role and status changes on the acting admin's own account return 400 |
| Deployment plan | Vercel deploy webhook triggers Lambda migration | Open stretch |
| Deployment plan | Terraform port of `deploy_lambda.ps1` | Open stretch |
| Portfolio TODO | Six self-assessment prose sections | Missing, page is scaffolded with bracketed prompts |
| Portfolio TODO | Everything else (reflections, photo) | Done |

## Rubric compliance for the final submission

Checked against the CS 499 Final Project Guidelines and Rubric on 2026-08-09. The five course outcomes are graded pass/fail at 20 points each across the whole ePortfolio.

| Rubric requirement | Status |
|---|---|
| Code review video present in the ePortfolio, covering existing functionality, code analysis, and planned enhancements | Met, embedded on the code review page with a summary of all three areas |
| Enhanced artifact accessible | Met, live app plus repo and per-enhancement branch links on every narrative page |
| Original artifact accessible, "the work before you began your enhancements" | Gap, `grazioso_animal_shelter_dashboard` exists in the repo but no page links to it, a grader would have to hunt |
| Narrative per artifact: describe, justify, reflect | Met, all three pages follow that structure with trade-offs and outcome alignment |
| Narrative states when the artifact was created | Gap, pages say "originally built in CS 340" with no term or year |
| Self-assessment as the first thing presented | Gap, the homepage card was commented out on 2026-08-09 until the prose is written, so it must be restored when workstream 1 lands |
| Self-assessment addresses the five required topics with examples beyond the artifacts | Gap, this is the workstream 1 prose |
| Self-assessment summarizes how the artifacts fit together | Met, that section is already written on the page |
| GitHub Pages organized and navigable, not raw file listings | Met, resume theme with card navigation to every component |
| Claims in narratives match the code | Met as of 2026-08-10, the archive behavior claimed by enhancement one and enhancement three now exists in the code |

Course outcome evidence map: outcome 3 (algorithms and trade-offs) is strongly covered by enhancement two, outcome 4 (tools and value) by enhancements one and three plus tests and deployment, outcome 5 (security) by the implemented auth/RBAC/validation, but outcomes 1 (collaboration) and 2 (communication) are claimed by no enhancement page and rest almost entirely on the code review video plus the unwritten self-assessment sections. Finishing the self-assessment is what closes outcomes 1 and 2.

## Workstream 1: Portfolio completion (course-critical, do first)

- [ ] Write the six self-assessment sections in `docs/self-assessment.md`, replacing the bracketed prompts for background, team collaboration, stakeholder communication, data structures and algorithms, software engineering and databases, and security
- [ ] Remove the structural-draft TODO comment at the top of that file
- [ ] Restore the self-assessment card on the homepage, commented out in `docs/_config.yml` on 2026-08-09 until the prose is written
- [x] Commit the staged `docs/_config.yml` change that deep-links the Projects card to `grazioso_animal_shelter`, landed 2026-08-09 in the plan-consolidation commit
- [x] Confirm `docs/_site` is gitignored so stale local builds never publish, verified 2026-08-09 via `docs/.gitignore`
- [x] Resolve the archive claim: workstream 2 implemented 2026-08-10, so the security bullets on enhancement one and enhancement three now match the code
- [ ] Add an "Original artifact" link on the enhancement pages and the homepage Projects card pointing to `grazioso_animal_shelter_dashboard` so the pre-enhancement work is one click away
- [ ] Add when the artifact was created (course term and year) to the artifact description on each enhancement page
- [ ] Course submission logistics outside the repo: narratives saved as Word documents, all original and enhanced code files, the self-assessment, the video, and the GitHub Pages URL submitted in Brightspace

## Workstream 2: Backend animal management

The largest unimplemented piece of the enhancement plan. The staff role, the add/update/archive flows, and archive-not-delete behavior all depend on it.

All items completed 2026-08-10, full suite of 57 backend tests passing.

- [x] Migration 0005 adding an `archived_at` timestamp (null means active) to `animals`, applied to the local dev database
- [x] `POST /animals` to create a record, validating lookup values, restricted to staff and admin via `require_role`
- [x] `PATCH /animals/{id}` to update a record, same restriction, partial updates via `exclude_unset`
- [x] `POST /animals/{id}/archive` and `POST /animals/{id}/unarchive`, same restriction
- [x] Archived animals excluded from default search, breed summary, and match results; detail endpoint still returns them and search accepts `include_archived=true` for audit
- [x] Backend tests for create, update, archive, role gating, and archived-record exclusion in `tests/test_animal_management.py`, 17 cases

## Workstream 3: Backend hardening and audit logging

- [x] Server-side self-change guard added 2026-08-11: role and status changes targeting the acting admin's own account return 400 via `SelfChangeError`, matching the UI and covered by tests asserting no audit row is written
- [x] Audit logging for admin and animal mutations, done 2026-08-10 via migration 0006: `audit_log` records actor id and email snapshot, action, target, detail, and timestamp in the same transaction as each mutation, with shared actor dependencies (`CurrentUser`, `StaffUser`, `AdminUser`) in `deps.py` attributing every change
- [x] Account removal added 2026-08-10: `DELETE /admin/users/{id}` returns 204, rejects self-deletion with 400, logs the deletion, and the actor FK sets null on delete so audit history is preserved
- [x] Admin UI delete-account action added 2026-08-11: Actions column with a delete button per row, disabled on the acting admin's own row, confirming through the shared `ConfirmDialog` before calling `DELETE /admin/users/{id}`

## Workstream 4: Frontend session expiry

The 401 plumbing already exists in `client.ts` and `AuthContext.tsx`; this is the last mile.

Both items completed 2026-08-11.

- [x] Pass a session-expired reason through navigation state when the 401 handler signs the user out, and render it as an Alert on `LoginPage`, done 2026-08-11 via a `sessionExpired` context flag that `RequireAuth` folds into its redirect state, since a direct `navigate` call from the 401 handler loses the race against react-router's startTransition
- [x] Optional: decode the JWT `exp` claim and warn shortly before expiry or log out proactively, done 2026-08-11 with `getTokenExpiryMs` in `tokenUtils.ts` and a timer in `AuthContext` that signs out at the exp time with the same session-expired message

## Workstream 5: Frontend visual gaps (former phases 4 and 6)

- [x] Extend `GET /animals/breed-summary` to accept a rescue-profile parameter, done 2026-08-12, a `profile_id` query param resolves to the profile's animal type id server-side with 404 on unknown profiles, and `DashboardPage` now sends `profileId` instead of the `animal_type` workaround
- [x] Resolve the map scope inconsistency in match mode, done 2026-08-12 by labeling rather than refetching, both modes now caption the chart as covering the full set and the map as covering the current page
- [x] Add explicit `aria-live` roles, done 2026-08-12, error alerts on the login, signup, admin, and dashboard pages carry `role="alert"`, the dashboard ranking banner carries `role="status"`, and the admin Snackbar announces politely via `slotProps`, all asserted in tests
- [x] Keyboard walk of every page, done 2026-08-12 in Chrome against fresh containers, login and signup forms, dashboard selects, search, grid, pagination, and map markers, admin role change, delete dialog focus trap, and snackbars, add form, manage typeahead into the edit page, and the archive dialog all operate keyboard-only with visible focus and live announcements
- [x] Manual contrast check of muted text tokens, done 2026-08-12, all four muted tokens pass WCAG AA in both schemes, table below

### Contrast audit (2026-08-12)

WCAG 2.1 relative-luminance ratios computed for every muted text token over its scheme background. All pass AA for normal text (4.5:1), so no changes were needed.

| Token | Effective color | Ratio | AA 4.5:1 |
|---|---|---|---|
| MUI `text.secondary` light, rgba(0,0,0,0.6) on `#ffffff` | `#666666` | 5.74:1 | pass |
| MUI `text.secondary` dark, rgba(255,255,255,0.7) on `#16171d` | `#b9b9bb` | 9.13:1 | pass |
| `.breed-chart-total-label` / `.legend-value` light, `#2b2b33` at 0.7 opacity on `#ffffff` | `#6b6b70` | 5.30:1 | pass |
| `.breed-chart-total-label` / `.legend-value` dark, `#e5e5ea` at 0.7 opacity on `#16171d` | `#a7a7ac` | 7.46:1 | pass |

## Workstream 6: Animal management UI (after workstream 2)

Implements the Staff Animal Management flows from the pseudocode. Bulk of the work landed 2026-08-11 in the animal-management PR; the two dashboard entry points landed 2026-08-12, closing the workstream.

- [x] Add Animal entry in the navigation for staff and admin, opening a form with lookup-value selects and validation, done 2026-08-11 via `AddAnimalPage` and `AnimalForm`
- [x] Edit icon on dashboard search rows for staff and admin, done 2026-08-12 via an Actions column on both search and match grids whose edit action navigates to `EditAnimalPage`
- [x] Animal management page with typeahead search that loads the selected record into the same update form, done 2026-08-11 via `AnimalManagePage` Autocomplete navigating to the edit page
- [x] Animal detail view when any user selects a search result, done 2026-08-12 via a view action on every dashboard row navigating to `/animals/:id`, while row click still highlights the map marker
- [x] Archive action with a confirmation dialog, done 2026-08-11 on the edit page via `ConfirmDialog` with unarchive and an archived-state banner
- [x] Frontend tests for the new flows and role-based visibility, done 2026-08-11 covering the form, all four pages, the confirm dialog, nav visibility, and router role gating

## Workstream 7: Deployment stretch (optional)

- [ ] Vercel deploy webhook to a Lambda Function URL so migrations run on deploy
- [ ] Port `deploy_lambda.ps1` to Terraform, declaring the ECR repo, secret, IAM role, and function, keeping image build/push as a script step

## Deferred, revisit only if time allows

- Google SSO and staff-domain recognition (enhancement plan stretch goals)
- Optional filters in match mode, the flows call for them but the matches endpoint currently accepts only pagination
- NavBar user menu as Avatar + Menu instead of the current Chip and button
- Role/status Chip badges in the admin table
- Bar-list alternative when the "Other" slice dominates the breed donut
- Replacing the custom SVG chart with a chart library

## Deployment reference

Operational facts carried forward from the retired deployment plan. Real connection strings live as comments in the gitignored root `.env`; never paste them here.

- Vercel hosts both services from `grazioso_animal_shelter/vercel.json`, the Vite frontend at `/` and FastAPI behind `/api`; database is Neon free-tier Postgres
- Neon direct host `ep-gentle-snow-axjivv0v.c-4.us-east-2.aws.neon.tech`, pooler host `ep-gentle-snow-axjivv0v-pooler.c-4.us-east-2.aws.neon.tech`, database `neondb`, role `neondb_owner`, us-east-2
- asyncpg rejects Neon's default `?sslmode=require&channel_binding=require`, use `?ssl=require` instead
- The app connects through the pooler because serverless functions open many short-lived connections; migrations use the direct endpoint because Alembic holds session-level locks that pooling can interfere with
- Live admin login is `admin@grazioso-shelter.dev` with the `ADMIN_PASSWORD` from the root `.env`; login verifies against the seeded database hash, not the Vercel env var, so reseed or update the user row to change it
- Lambda migration runner: `lambda_migrate.py`, `Dockerfile.lambda`, and `deploy_lambda.ps1` in `grazioso_animal_shelter/backend/`; stack lives in account 363454423518, us-east-2; `DATABASE_URL` is read from Secrets Manager secret `grazioso/database-url` at cold start; cost is about $0.40/mo plus pennies per invocation
- Windows deploy gotchas baked into the script: a PowerShell 5.1 pipe corrupts the ECR login token so the login runs through cmd, and docker provenance/sbom attestations are disabled because Lambda rejects a manifest list
