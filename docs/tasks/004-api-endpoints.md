# Task: Core API Endpoints

**Task ID:** `004-api-endpoints`  
**Status:** `pending`  
**Created:** 2025-11-11  
**Assigned:** Development Team

---

## Objective

Create RESTful API endpoints for journal entries, trades, and wheel data with authentication and user isolation.

---

## Context

The frontend needs API endpoints to replace direct database access. This task creates the core CRUD endpoints for journal entries, trade entry, and wheel position data. All endpoints must enforce user isolation (users can only access their own data) and include proper validation, error handling, and pagination.

**Related Epic:** Cloud Migration  
**Depends on:** `003-auth-system`  
**Blocks:** `005-frontend-integration`

---

## Constraints

- Must enforce user isolation (filter by user_id)
- Must use authentication middleware on all endpoints
- Must validate all inputs with Zod schemas
- Must return consistent error format
- Must support pagination for list endpoints
- Must maintain existing transaction types
- Must follow RESTful conventions

---

## Acceptance Criteria

- [ ] GET `/api/v1/journal` - List journal entries (paginated, filtered)
- [ ] POST `/api/v1/journal` - Create journal entry
- [ ] PUT `/api/v1/journal/:id` - Update journal entry
- [ ] DELETE `/api/v1/journal/:id` - Soft delete journal entry
- [ ] GET `/api/v1/trades` - List trades (alias for journal with type filter)
- [ ] POST `/api/v1/trades` - Create trade entry
- [ ] GET `/api/v1/wheel` - Get wheel positions and metrics
- [ ] All endpoints require authentication
- [ ] All endpoints filter by user_id
- [ ] Input validation with Zod schemas
- [ ] Consistent error response format
- [ ] Pagination support (limit, offset)
- [ ] Filtering support (symbol, type, date range)

---

## Related Files

### Code Files to Create

- `backend/src/routes/journal.ts` - Journal CRUD routes
- `backend/src/routes/trades.ts` - Trade-specific routes
- `backend/src/routes/wheel.ts` - Wheel data routes
- `backend/src/services/journal.service.ts` - Journal business logic
- `backend/src/services/wheel.service.ts` - Wheel data transformation
- `backend/src/schemas/journal.schema.ts` - Zod validation schemas
- `backend/src/types/api.ts` - API response types

### Code Files to Modify

- `backend/src/server.ts` - Register new routes
- `backend/src/middleware/auth.ts` - Ensure user context available

### Documentation

- `docs/reference/api-spec.md` - API endpoint specifications

---

## Implementation Notes

- Use Express Router for route organization
- Extract user_id from JWT token (auth middleware)
- Use Prisma client for database queries
- Pagination: default limit 50, max 100
- Filtering: query parameters (symbol, type, from, to)
- Error format: `{ error: string, code: string, details?: object }`
- Success format: `{ data: T, meta?: { total, page, limit } }`

---

## Next Actions (2-3 steps max)

1. **Create journal service and routes** - CRUD operations with user isolation
2. **Create trades and wheel routes** - Trade entry and wheel data endpoints
3. **Add validation and error handling** - Zod schemas and consistent error format

---

## Testing Requirements

### Unit Tests

- [ ] Service methods filter by user_id
- [ ] Validation schemas reject invalid input
- [ ] Error format is consistent

### Integration Tests

- [ ] GET journal returns only user's entries
- [ ] POST journal creates entry with user_id
- [ ] PUT journal updates only user's entries
- [ ] DELETE journal soft-deletes entry
- [ ] Wheel endpoint returns transformed data

### Manual Testing

- [ ] All endpoints require authentication
- [ ] Users can only access their own data
- [ ] Pagination works correctly
- [ ] Filtering works correctly
- [ ] Error responses are user-friendly

---

## Notes

User isolation is critical - double-check all queries filter by user_id.

---

## Completion

**Completed:** [Date]  
**Time Spent:** [Hours]  
**Commits:** [Commit hashes]  
**Lessons Learned:** [Optional]
