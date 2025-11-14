# Task: Frontend API Integration

**Task ID:** `005-frontend-integration`  
**Status:** `pending`  
**Created:** 2025-11-11  
**Assigned:** Development Team

---

## Objective

Replace local SQLite database calls with API calls in frontend, creating API client and updating stores.

---

## Context

The frontend currently uses local SQLite via `useEntriesStore` and `useWheelDatabase`. This task creates an API client layer and updates all data fetching to use the backend API instead. The frontend must handle loading states, errors, and maintain the same user experience while fetching from the cloud.

**Related Epic:** Cloud Migration  
**Depends on:** `004-api-endpoints`  
**Blocks:** Data migration tasks

---

## Constraints

- Must maintain existing component interfaces (no breaking changes)
- Must handle loading and error states gracefully
- Must preserve optimistic updates where possible
- Must support offline mode (future: queue writes)
- Must use existing Zustand stores (refactor, don't replace)
- Must maintain TypeScript types
- Must not break existing tests initially

---

## Acceptance Criteria

- [ ] API client created with auth token injection
- [ ] API client handles token refresh automatically
- [ ] `useEntriesStore` updated to use API instead of SQLite
- [ ] `useWheelDatabase` hook updated to use API
- [ ] TradeTab component uses API for trade entry
- [ ] ImportTab component uses API for CSV import
- [ ] Loading states displayed during API calls
- [ ] Error states displayed with user-friendly messages
- [ ] Optimistic updates work where applicable
- [ ] All existing E2E tests pass (or updated)
- [ ] TypeScript types maintained

---

## Related Files

### Code Files to Create

- `src/lib/api/client.ts` - API client with auth
- `src/lib/api/journal.api.ts` - Journal API methods
- `src/lib/api/trades.api.ts` - Trades API methods
- `src/lib/api/wheel.api.ts` - Wheel API methods
- `src/contexts/AuthContext.tsx` - Authentication context
- `src/hooks/useAuth.ts` - Auth hook

### Code Files to Modify

- `src/stores/useEntriesStore.ts` - Replace SQLite with API calls
- `src/hooks/useWheelDatabase.ts` - Replace SQLite with API calls
- `src/pages/wheel/components/drawers/TradeTab.tsx` - Use API
- `src/pages/wheel/components/drawers/ImportTab.tsx` - Use API
- `src/App.tsx` - Add AuthContext provider

### Documentation

- `docs/reference/api-spec.md` - API endpoint reference

---

## Implementation Notes

- Use `axios` or native `fetch` for HTTP client
- Store JWT in memory (not localStorage for security)
- Refresh token in httpOnly cookie
- Auto-refresh token on 401 response
- Use React Query or SWR for caching (optional, can use Zustand)
- Keep existing store structure, change data source only
- Feature flag: `VITE_ENABLE_CLOUD_SYNC` to toggle API vs local

---

## Next Actions (2-3 steps max)

1. **Create API client and auth context** - HTTP client with auth, React context for auth state
2. **Update useEntriesStore to use API** - Replace SQLite calls with API calls
3. **Update useWheelDatabase and TradeTab** - Replace remaining SQLite calls

---

## Testing Requirements

### Unit Tests

- [ ] API client injects auth token
- [ ] API client refreshes token on 401
- [ ] Store methods call correct API endpoints
- [ ] Error handling works correctly

### E2E Tests

- [ ] User can login and access data
- [ ] Journal page loads entries from API
- [ ] Wheel page loads positions from API
- [ ] Trade entry saves via API
- [ ] CSV import works via API

### Manual Testing

- [ ] Login flow works
- [ ] Data loads from API
- [ ] Loading states display
- [ ] Error messages are user-friendly
- [ ] Token refresh works automatically
- [ ] Logout clears data

---

## Notes

This is a critical task - the frontend must work seamlessly with the API. Test thoroughly.

---

## Completion

**Completed:** [Date]  
**Time Spent:** [Hours]  
**Commits:** [Commit hashes]  
**Lessons Learned:** [Optional]
