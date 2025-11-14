# Task: Database Schema Setup

**Task ID:** `002-database-schema`  
**Status:** `pending`  
**Created:** 2025-11-11  
**Assigned:** Development Team

---

## Objective

Create PostgreSQL database schema with users, journal, and accounts tables, including migrations system.

---

## Context

We need to migrate from browser-based SQLite to cloud PostgreSQL. This task creates the core database schema that mirrors our existing journal-first architecture but adds user isolation and subscription support. The schema must support the existing transaction types and maintain data integrity.

**Related Epic:** Cloud Migration  
**Depends on:** `001-backend-setup`  
**Blocks:** `003-auth-system`, `004-api-endpoints`

---

## Constraints

- Must maintain journal-first architecture (single source of truth)
- Must add `user_id` to all tables for multi-user support
- Must preserve existing transaction types (sell_to_open, buy_to_close, etc.)
- Must use Prisma or Drizzle ORM for type safety
- Must support database migrations
- Must maintain indexes for performance

---

## Acceptance Criteria

- [ ] PostgreSQL database connection configured
- [ ] Users table created with required fields (id, email, password_hash, subscription_tier)
- [ ] Journal table created with user_id foreign key
- [ ] Accounts table created with user_id foreign key
- [ ] Indexes created for performance (user_id, symbol, ts, type)
- [ ] Migration system set up (Prisma migrations or similar)
- [ ] Database connection pooling configured
- [ ] Migration can run successfully
- [ ] Schema matches existing journal structure
- [ ] TypeScript types generated from schema

---

## Related Files

### Code Files to Create

- `backend/src/db/schema.prisma` - Prisma schema (if using Prisma)
- `backend/src/db/migrations/` - Migration files directory
- `backend/src/db/connection.ts` - Database connection setup
- `backend/src/db/index.ts` - Database client export

### Code Files to Modify

- `backend/src/config/env.ts` - Add database connection string

### Documentation

- `docs/decisions/002-database-choice.md` - Database decision ADR
- `docs/reference/migration-plan.md` - Full migration plan reference

---

## Implementation Notes

- Use Prisma for ORM (type-safe, good migration system)
- Database URL from environment: `DATABASE_URL`
- Connection pooling: 10-20 connections
- Migration naming: `YYYYMMDDHHMMSS_description`
- Indexes: user_id, symbol, ts (timestamp), type, deleted_at
- Foreign keys: user_id references users(id)

---

## Next Actions (2-3 steps max)

1. **Set up Prisma and database connection** - Install Prisma, configure connection
2. **Create schema with users, journal, accounts tables** - Define all tables with relationships
3. **Create and run initial migration** - Generate migration, test database setup

---

## Testing Requirements

### Unit Tests

- [ ] Database connection succeeds
- [ ] Tables created correctly
- [ ] Foreign keys work
- [ ] Indexes exist

### Manual Testing

- [ ] Migration runs without errors
- [ ] Can insert test data
- [ ] Can query with user_id filter
- [ ] Connection pooling works

---

## Notes

This schema must support the existing journal-first architecture while adding multi-user capabilities.

---

## Completion

**Completed:** [Date]  
**Time Spent:** [Hours]  
**Commits:** [Commit hashes]  
**Lessons Learned:** [Optional]
