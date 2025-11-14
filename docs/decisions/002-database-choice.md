# ADR-002: Database Choice

**Status:** Accepted  
**Date:** 2025-11-11  
**Deciders:** Development Team

---

## Context

We need to migrate from browser-based SQLite (sql.js) to a cloud database. The application uses a journal-first architecture with a simple, flat journal table. We need a database that:

- Supports relational data (users, journal, accounts)
- Handles concurrent users
- Provides data persistence in the cloud
- Supports transactions
- Has good TypeScript/Node.js support
- Is cost-effective for startup phase

## Decision

We will use **PostgreSQL** for production with **Prisma ORM** for type-safe database access.

## Rationale

### PostgreSQL

- **Relational database** - Supports foreign keys, joins, transactions
- **ACID compliance** - Data integrity guarantees
- **Scalable** - Handles concurrent users well
- **Open source** - No licensing costs
- **Rich feature set** - Full-text search, JSON support, etc.
- **Cloud hosting** - Many managed options (Supabase, Neon, AWS RDS)
- **Performance** - Excellent for read-heavy workloads

### Prisma ORM

- **Type safety** - Generates TypeScript types from schema
- **Migration system** - Version-controlled schema changes
- **Developer experience** - Great tooling, autocomplete
- **Query builder** - Type-safe queries
- **Performance** - Efficient queries, connection pooling

## Alternatives Considered

### MySQL

- **Pros:** Very popular, many hosting options
- **Cons:** Less advanced features than PostgreSQL
- **Decision:** PostgreSQL chosen for better features and JSON support

### MongoDB (NoSQL)

- **Pros:** Flexible schema, good for rapid iteration
- **Cons:** Doesn't fit relational data well, no foreign keys
- **Decision:** PostgreSQL chosen because we need relational data and transactions

### SQLite (Cloud-hosted)

- **Pros:** Familiar, simple
- **Cons:** Not designed for concurrent writes, limited cloud options
- **Decision:** PostgreSQL chosen for multi-user support

### Drizzle ORM

- **Pros:** Lightweight, SQL-like syntax
- **Cons:** Less mature, smaller ecosystem
- **Decision:** Prisma chosen for better tooling and ecosystem

## Consequences

### Positive

- ✅ Strong data integrity with ACID transactions
- ✅ Supports concurrent users efficiently
- ✅ Type-safe database access with Prisma
- ✅ Good migration system
- ✅ Many cloud hosting options
- ✅ Can scale as we grow

### Negative

- ⚠️ Need to set up database hosting (cost)
- ⚠️ More complex than SQLite
- ⚠️ Need to learn Prisma (but good DX)

### Costs

- **Development:** Free (local PostgreSQL)
- **Production:** ~$20-100/month (managed PostgreSQL)
  - Supabase: Free tier available
  - Neon: Free tier available
  - AWS RDS: ~$20/month minimum

### Risks

- **Risk:** Database hosting costs - mitigated by free tiers and gradual scaling
- **Risk:** Learning curve for Prisma - mitigated by good documentation
- **Risk:** Migration complexity - mitigated by keeping schema simple initially

## Implementation Notes

- Use Prisma for schema definition and migrations
- Connection pooling: 10-20 connections
- Environment variable: `DATABASE_URL`
- Local development: Docker PostgreSQL or local install
- Production: Managed PostgreSQL (Supabase or Neon recommended)
- Backup strategy: Automated daily backups

## Migration Strategy

1. **Phase 1:** Set up PostgreSQL schema matching existing SQLite structure
2. **Phase 2:** Add user_id to all tables
3. **Phase 3:** Create data migration tool
4. **Phase 4:** Migrate users' data

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase](https://supabase.com/) - Managed PostgreSQL option
- [Neon](https://neon.tech/) - Serverless PostgreSQL option
- Project architecture: `docs/DATA_ARCHITECTURE.md`
