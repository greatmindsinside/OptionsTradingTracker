# Task: Backend Infrastructure Setup

**Task ID:** `001-backend-setup`  
**Status:** `pending`  
**Created:** 2025-11-11  
**Assigned:** Development Team

---

## Objective

Initialize Node.js backend project with TypeScript, Express, and project structure to support cloud-based API.

---

## Context

We're migrating from a browser-only application to a cloud-based architecture. This task sets up the foundational backend infrastructure that all other tasks will build upon. The backend will serve as the API layer between the React frontend and PostgreSQL database.

**Related Epic:** Cloud Migration  
**Depends on:** None (foundational task)  
**Blocks:** All backend tasks (002, 003, 004)

---

## Constraints

- Must use TypeScript with strict mode
- Must follow existing project style (see `.cursor/rules/project.md`)
- Must support both development and production environments
- Must include health check endpoint for monitoring
- Must be compatible with existing frontend (React 19.1.1)

---

## Acceptance Criteria

- [ ] Backend directory structure created (`backend/src/`)
- [ ] TypeScript configured with strict mode
- [ ] Express server runs on port 3001 (configurable via env)
- [ ] Health check endpoint `GET /api/health` returns 200
- [ ] ESLint and Prettier configured
- [ ] Environment variable configuration set up
- [ ] Basic error handling middleware
- [ ] CORS configured for frontend origin
- [ ] Development script runs successfully
- [ ] Production build script works

---

## Related Files

### Code Files to Create

- `backend/src/server.ts` - Express server entry point
- `backend/src/config/env.ts` - Environment variable configuration
- `backend/src/middleware/error-handler.ts` - Centralized error handling
- `backend/src/middleware/cors.ts` - CORS configuration
- `backend/package.json` - Backend dependencies
- `backend/tsconfig.json` - TypeScript configuration
- `backend/.eslintrc.js` - ESLint configuration
- `backend/.prettierrc` - Prettier configuration

### Documentation

- `docs/decisions/001-backend-framework.md` - Framework decision ADR

---

## Implementation Notes

- Use Express for HTTP server (familiar, well-documented)
- Use `dotenv` for environment variables
- Use `cors` package for CORS handling
- Use `helmet` for security headers
- Structure: `backend/src/` for source, `backend/dist/` for compiled output
- Development: `ts-node-dev` for hot reload
- Production: Build to `dist/` and run with `node`

---

## Next Actions (2-3 steps max)

1. **Create backend directory structure** - Initialize `backend/` folder with `src/` subdirectory
2. **Set up package.json and TypeScript** - Install dependencies, configure TypeScript
3. **Create Express server with health check** - Basic server setup with health endpoint

---

## Testing Requirements

### Unit Tests

- [ ] Health check endpoint returns 200
- [ ] Error handler middleware works correctly
- [ ] CORS middleware allows frontend origin

### Manual Testing

- [ ] Server starts without errors
- [ ] Health check accessible at `/api/health`
- [ ] Environment variables load correctly

---

## Notes

This is the foundation for all backend work. Keep it simple but extensible.

---

## Completion

**Completed:** [Date]  
**Time Spent:** [Hours]  
**Commits:** [Commit hashes]  
**Lessons Learned:** [Optional]
