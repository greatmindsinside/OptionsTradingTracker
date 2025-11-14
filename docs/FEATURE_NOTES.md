# Feature Notes

**Purpose:** Personal notes and observations about the application features, improvements, and ideas.

**Last Updated:** [Date]

---

## Quick Notes

<!-- Add quick notes, observations, or reminders here -->

---

## Feature Ideas

### [Feature Name]

- **Description:**
- **Priority:**
- **Status:**
- **Notes:**

---

## Observations

### [Date] - [Topic]

- Observation or finding
- Related files/components:
- Action items:

---

## Improvements

### [Area/Component]

- Current behavior:
- Suggested improvement:
- Implementation notes:

---

## Questions & Research

### [Question/Topic]

- Question:
- Findings:
- Resolution:

---

## Testing Notes

### [Test/Feature]

- Test scenario:
- Results:
- Issues found:
- Fixes applied:

---

## Performance Notes

### [Component/Feature]

- Performance observation:
- Metrics:
- Optimization ideas:

---

## UI/UX Notes

### [Page/Component]

- User experience observation:
- Design consideration:
- Accessibility note:

---

## Technical Notes

### [Technical Topic]

- Technical detail:
  - User identifiers (UIDs) continue to leverage email addresses as the canonical unique ID, fully integrated into both authentication middleware and all database models (see `auth/user.ts`). This ensures alignment with the current authentication flow and simplifies future user migrations, as described in the architecture docs.
  - To advance onboarding and monetization, the next priority is implementing a unified login/signup experience with tier selection:
    - The login and signup flow is now designed in `frontend/pages/Login.tsx`, replacing the former component path.
    - Pricing/plan selection has a draft UI in `frontend/components/PricingSelector.tsx`.
    - Infrastructure cost research is underway; results will inform the configuration of subscription plans (WIP: see `scripts/cost-analysis.js` for ongoing data gathering and margin calculations).
    - Subscription plans and pricing logic are being formalized in `shared/constants/plans.ts`.

  - UI iconography is managed exclusively using whitelisted open-source icon sets (current policy: only `react-icons` with Feather and Heroicons packs). Enforcement is implemented in project lint rules and visually centralized via `frontend/components/Icon.tsx`.
  - Quote and price data retrieval is still handled through a backend Node.js microservice that integrates with Python’s `yfinance` library. In-progress work extends this integration to earnings/calendar data alongside quotes, all surfaced via unified API endpoints.
  - Frontend consumers are required to adapt to the standardized quote/earnings response shape as specified in `backend/routes/quotes.ts` and refined in the OpenAPI contract (`docs/API_SPEC.yaml`).

- Implementation approach:
  - Email addresses are strictly validated and serve as the sole UID; all user lookup and association logic (backend and auth middleware) is based on this invariant (`auth/user.ts`, `middleware/auth.ts`).
  - All icon rendering is funneled through a wrapper component (`frontend/components/Icon.tsx`), and custom ESLint rules (`tools/eslint-rules/no-unapproved-icons.js`) prevent import of any icons outside the approved packs.
  - The backend Node.js server exposes `/api/quotes` and `/api/earnings` endpoints, serviced by logic in `backend/services/yfinance.ts`; the express handlers in `backend/routes/quotes.ts` orchestrate normalization and error handling.
  - New: The backend’s `services/yfinance.ts` module is being expanded to fetch, cache, and structure both live quotes and upcoming earnings, with Redis/SQLite caching under evaluation.
  - Frontend fetching and data normalization occurs via SWR hooks in `frontend/hooks/useQuotes.ts` and `frontend/hooks/useEarnings.ts`.
  - Future-proofing: Ongoing work is establishing type contracts across backend/frontend with shared DTOs in `shared/types/quotes.ts` and `shared/types/earnings.ts`.

- Related code/files:
  - `backend/services/yfinance.ts` — integration with yfinance, supporting both quote and earnings data, with normalization logic.
  - `backend/routes/quotes.ts` — Express route handlers for quote and earnings endpoints.
  - `frontend/components/Icon.tsx` — centralizes icon usage and enforces pack policy.
  - `frontend/hooks/useQuotes.ts`, `frontend/hooks/useEarnings.ts` — frontend data fetching/normalization.
  - `auth/user.ts`, `middleware/auth.ts` — user identity and authentication logic (UID-as-email).
  - `frontend/pages/Login.tsx`, `frontend/components/PricingSelector.tsx` — user entry point and plan selection UI.
  - `scripts/cost-analysis.js` — utility for calculating infrastructure and hosting costs.
  - `shared/constants/plans.ts`, `shared/types/quotes.ts`, `shared/types/earnings.ts` — subscription and API type contracts.
  - `docs/DEVELOPMENT.md`, `docs/DATA_ARCHITECTURE.md`, `docs/API_SPEC.yaml` — architectural, API, and contract documentation.

---

## Bug Tracking

### [Bug Description]

- **Date Found:**
- **Severity:**
- **Steps to Reproduce:**
- **Status:**
- **Fix:**

---

## Future Considerations

- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

---

## Reference Links

- [Link to related documentation]
- [Link to external resource]
