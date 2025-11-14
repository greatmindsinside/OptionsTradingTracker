# Task: Authentication System

**Task ID:** `003-auth-system`  
**Status:** `pending`  
**Created:** 2025-11-11  
**Assigned:** Development Team

---

## Objective

Implement JWT-based authentication with user registration, login, and protected route middleware.

---

## Context

Users need to authenticate to access their data in the cloud-based system. This task implements the core authentication flow using JWT tokens (access + refresh) for stateless authentication. The system must be secure, handle token expiration, and support password reset flows.

**Related Epic:** Cloud Migration  
**Depends on:** `002-database-schema`  
**Blocks:** `004-api-endpoints`, `005-frontend-integration`

---

## Constraints

- Must use JWT for stateless authentication
- Must hash passwords with bcrypt (salt rounds: 10)
- Must validate email format
- Must prevent duplicate email registration
- Must use httpOnly cookies for refresh tokens (security)
- Must handle token expiration gracefully
- Must follow security best practices (rate limiting, etc.)

---

## Acceptance Criteria

- [ ] POST `/api/v1/auth/register` endpoint creates user
- [ ] POST `/api/v1/auth/login` endpoint authenticates user
- [ ] POST `/api/v1/auth/refresh` endpoint refreshes access token
- [ ] JWT middleware validates tokens on protected routes
- [ ] Password hashing with bcrypt works
- [ ] Email validation prevents invalid emails
- [ ] Duplicate email check prevents re-registration
- [ ] Access token expires in 15 minutes
- [ ] Refresh token expires in 7 days
- [ ] Protected routes return 401 for invalid tokens
- [ ] Error messages don't leak user information

---

## Related Files

### Code Files to Create

- `backend/src/routes/auth.ts` - Authentication routes
- `backend/src/services/auth.service.ts` - Authentication business logic
- `backend/src/middleware/auth.ts` - JWT validation middleware
- `backend/src/utils/jwt.ts` - JWT token utilities
- `backend/src/utils/password.ts` - Password hashing utilities

### Code Files to Modify

- `backend/src/server.ts` - Add auth routes
- `backend/src/db/schema.prisma` - Users table (if not in 002)

### Documentation

- `docs/reference/api-spec.md` - API endpoint specifications

---

## Implementation Notes

- Use `jsonwebtoken` package for JWT
- Use `bcrypt` for password hashing
- Use `zod` for email validation
- Access token: 15 min expiry, stored in memory
- Refresh token: 7 day expiry, httpOnly cookie
- Token payload: `{ userId, email, subscriptionTier }`
- Rate limiting: 5 requests per minute on auth endpoints

---

## Next Actions (2-3 steps max)

1. **Create auth service and utilities** - Password hashing, JWT generation/validation
2. **Create auth routes** - Register, login, refresh endpoints
3. **Create auth middleware** - JWT validation for protected routes

---

## Testing Requirements

### Unit Tests

- [ ] Password hashing works correctly
- [ ] JWT token generation and validation
- [ ] Email validation rejects invalid emails
- [ ] Duplicate email check works

### Integration Tests

- [ ] Registration creates user in database
- [ ] Login returns valid tokens
- [ ] Refresh token generates new access token
- [ ] Protected route requires valid token

### Manual Testing

- [ ] Can register new user
- [ ] Can login with credentials
- [ ] Invalid credentials rejected
- [ ] Expired token returns 401
- [ ] Protected route accessible with token

---

## Notes

Security is critical here. Follow OWASP guidelines for authentication.

---

## Completion

**Completed:** [Date]  
**Time Spent:** [Hours]  
**Commits:** [Commit hashes]  
**Lessons Learned:** [Optional]
