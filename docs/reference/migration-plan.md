# Cloud Migration Plan - Reference

**Last Updated:** 2025-11-11  
**Status:** Planning Phase

---

## Overview

This document provides the complete migration plan from browser-only SQLite to cloud-based PostgreSQL with authentication and subscriptions. This is a reference document - see `docs/tasks/` for actionable tasks.

---

## Migration Phases

### Phase 1: Backend Infrastructure

- Set up Node.js + Express + TypeScript backend
- Configure PostgreSQL database
- Set up development and production environments
- Create basic API structure

**Tasks:** `001-backend-setup`, `002-database-schema`

### Phase 2: Authentication & User Management

- Implement JWT-based authentication
- User registration and login
- Protected routes middleware
- Frontend auth context

**Tasks:** `003-auth-system`

### Phase 3: Core API Endpoints

- Journal CRUD endpoints
- Trade entry endpoints
- Wheel data endpoints
- User isolation enforcement

**Tasks:** `004-api-endpoints`

### Phase 4: Frontend Integration

- Replace SQLite calls with API calls
- Create API client layer
- Update Zustand stores
- Handle loading and error states

**Tasks:** `005-frontend-integration`

### Phase 5: Subscription & Monetization

- Subscription tier system
- Stripe integration
- Payment processing
- Tier-based feature gating

**Future Tasks:** To be created

### Phase 6: Data Migration

- Export tool for local data
- Import API endpoint
- Migration UI
- Data validation

**Future Tasks:** To be created

### Phase 7: Monitoring & Observability

- Error tracking (Sentry)
- Structured logging
- Performance monitoring
- Analytics

**Future Tasks:** To be created

---

## Architecture Decisions

### Backend Framework

- **Decision:** Node.js + Express + TypeScript
- **ADR:** `docs/decisions/001-backend-framework.md`
- **Rationale:** Familiar, flexible, good ecosystem

### Database

- **Decision:** PostgreSQL with Prisma ORM
- **ADR:** `docs/decisions/002-database-choice.md`
- **Rationale:** Relational, scalable, type-safe

### Authentication

- **Decision:** JWT tokens (access + refresh)
- **Rationale:** Stateless, scalable, secure

### API Design

- **Decision:** RESTful API with versioning
- **Format:** `/api/v1/resource`
- **Rationale:** Standard, predictable, easy to consume

---

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Journal Table

```sql
CREATE TABLE journal (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  ts TEXT NOT NULL,
  account_id TEXT NOT NULL,
  symbol TEXT,
  type TEXT NOT NULL,
  qty REAL,
  amount REAL NOT NULL,
  strike REAL,
  expiration TEXT,
  underlying_price REAL,
  notes TEXT,
  meta TEXT,
  deleted_at TEXT DEFAULT NULL,
  edited_by TEXT DEFAULT NULL,
  edit_reason TEXT DEFAULT NULL,
  original_entry_id TEXT DEFAULT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journal_user_id ON journal(user_id);
CREATE INDEX idx_journal_symbol ON journal(symbol);
CREATE INDEX idx_journal_ts ON journal(ts);
CREATE INDEX idx_journal_type ON journal(type);
```

### Accounts Table

```sql
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL
);
```

---

## API Endpoints

### Authentication

- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Logout

### Journal

- `GET /api/v1/journal` - List journal entries (paginated, filtered)
- `POST /api/v1/journal` - Create journal entry
- `PUT /api/v1/journal/:id` - Update journal entry
- `DELETE /api/v1/journal/:id` - Soft delete journal entry

### Trades

- `GET /api/v1/trades` - List trades
- `POST /api/v1/trades` - Create trade entry

### Wheel

- `GET /api/v1/wheel` - Get wheel positions and metrics

### Import

- `POST /api/v1/import/csv` - Import CSV file

---

## Technology Stack

### Backend

- **Runtime:** Node.js 20+
- **Framework:** Express 4.x
- **Language:** TypeScript 5.x
- **Database:** PostgreSQL 15+
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Zod

### Frontend

- **Framework:** React 19.1.1
- **Language:** TypeScript 5.9.3
- **Build Tool:** Vite 7.1.7
- **State Management:** Zustand 5.0.8
- **HTTP Client:** Axios or native fetch
- **Routing:** React Router 7.9.4

### Infrastructure

- **Database Hosting:** Supabase or Neon (managed PostgreSQL)
- **API Hosting:** Vercel, Railway, or AWS
- **CDN:** Cloudflare
- **Monitoring:** Sentry
- **Email:** SendGrid or Resend

---

## Migration Strategy

### For Existing Users

1. **Export Tool** - Users export local SQLite data to JSON
2. **Import API** - Users upload JSON to import endpoint
3. **Validation** - Backend validates and imports data
4. **Verification** - Users verify data imported correctly

### For New Users

1. **Registration** - Create account
2. **Start Fresh** - Begin with empty journal
3. **Import Option** - Can import CSV or manual entry

---

## Security Considerations

### Authentication

- JWT access tokens (15 min expiry)
- Refresh tokens in httpOnly cookies (7 day expiry)
- Password hashing with bcrypt (10 salt rounds)
- Rate limiting on auth endpoints (5 req/min)

### API Security

- All endpoints require authentication
- User isolation (filter by user_id)
- Input validation with Zod
- SQL injection prevention (Prisma ORM)
- CORS configuration
- HTTPS only in production

### Data Privacy

- Users can only access their own data
- Soft deletes for audit trail
- GDPR compliance (data export, account deletion)

---

## Performance Considerations

### Database

- Connection pooling (10-20 connections)
- Indexes on frequently queried columns
- Query optimization
- Pagination for list endpoints

### API

- Response caching where appropriate
- Rate limiting to prevent abuse
- CDN for static assets
- Compression (gzip)

### Frontend

- Code splitting
- Lazy loading
- API response caching
- Optimistic updates

---

## Cost Estimates

### Infrastructure (Monthly)

- **Database:** $20-100 (managed PostgreSQL)
- **API Hosting:** $20-50 (Vercel/Railway)
- **Email Service:** $15-80 (SendGrid)
- **Monitoring:** $26-99 (Sentry)
- **CDN:** Free tier or $20 (Cloudflare)
- **Total:** ~$100-350/month base

### Scaling

- Costs scale with usage
- Database: Pay for storage and compute
- API: Pay for bandwidth and compute
- Email: Pay per email sent

---

## Risk Mitigation

### Data Loss

- Automated daily backups
- Export functionality always available
- Migration tool validates before import
- Database replication for high availability

### Performance

- Load testing before launch
- Monitoring and alerting
- Auto-scaling where possible
- Query optimization

### Security

- Regular security audits
- Dependency vulnerability scanning
- Penetration testing
- Bug bounty program (optional)

---

## Success Metrics

### Technical

- API response time < 200ms (p95)
- Database query time < 50ms (p95)
- 99.9% uptime
- Zero data loss incidents

### Business

- User registration conversion
- Subscription conversion rate
- User retention
- Customer satisfaction

---

## References

- **Tasks:** `docs/tasks/` - Actionable tasks
- **ADRs:** `docs/decisions/` - Architecture decisions
- **API Spec:** `docs/reference/api-spec.md` - Detailed API documentation
- **Data Architecture:** `docs/DATA_ARCHITECTURE.md` - Current architecture

---

## Next Steps

1. Complete foundational tasks (001-005)
2. Set up infrastructure (database, hosting)
3. Implement authentication
4. Create API endpoints
5. Integrate frontend
6. Test thoroughly
7. Deploy to staging
8. Migrate test users
9. Deploy to production
10. Migrate existing users
