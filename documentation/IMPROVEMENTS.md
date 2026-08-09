# Improvements Backlog

Post-deployment enhancements, roughly in priority order. Deployment-specific work
lives in DEPLOYMENT.md.

## Frontend

- [ ] Handle expired sessions gracefully. JWTs expire after 60 minutes but the
  frontend keeps the stale token — API calls start failing with 401 and the user is
  stuck on a broken page until they log out manually. Two parts:
  - Global 401 handling in `src/api/client.ts` — on a 401 response for an
    authenticated request, clear auth state and redirect to login with a
    "session expired" message
  - Optional session-timeout component — track token expiry from the JWT `exp`
    claim and warn the user shortly before it lapses, or log them out proactively
