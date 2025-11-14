# ADR-001: Backend Framework Choice

**Status:** Accepted  
**Date:** 2025-11-11  
**Deciders:** Development Team

---

## Context

We need to choose a backend framework for the cloud migration. The application currently runs entirely in the browser with no backend. We need a framework that:

- Supports TypeScript natively
- Has good ecosystem and documentation
- Is performant and scalable
- Has good testing support
- Is familiar to the team

## Decision

We will use **Node.js + Express + TypeScript** for the backend.

## Rationale

### Node.js

- **JavaScript ecosystem** - Team already knows JavaScript/TypeScript
- **Large package ecosystem** - npm has packages for everything we need
- **Performance** - Good for I/O-heavy operations (database, API calls)
- **Mature** - Stable, well-tested, widely used

### Express

- **Minimal and flexible** - Unopinionated, easy to customize
- **Large ecosystem** - Many middleware packages available
- **Familiar** - Most common Node.js framework, easy to find resources
- **Performance** - Fast, lightweight
- **TypeScript support** - Works well with TypeScript

### TypeScript

- **Type safety** - Catches errors at compile time
- **Better IDE support** - Autocomplete, refactoring
- **Consistency** - Frontend already uses TypeScript
- **Documentation** - Types serve as documentation

## Alternatives Considered

### Fastify

- **Pros:** Faster than Express, built-in TypeScript support
- **Cons:** Smaller ecosystem, less familiar to team
- **Decision:** Express chosen for familiarity and ecosystem

### NestJS

- **Pros:** Opinionated, built-in TypeScript, decorators, DI
- **Cons:** More complex, steeper learning curve, overkill for our needs
- **Decision:** Express chosen for simplicity

### Next.js API Routes

- **Pros:** Same framework as frontend, easy deployment
- **Cons:** Tied to Next.js, less flexible, not ideal for separate backend
- **Decision:** Express chosen for flexibility

## Consequences

### Positive

- ✅ Team can leverage existing JavaScript/TypeScript knowledge
- ✅ Large ecosystem of packages and middleware
- ✅ Easy to find developers familiar with Express
- ✅ Good performance for our use case
- ✅ TypeScript provides type safety

### Negative

- ⚠️ Express is unopinionated (need to make more decisions)
- ⚠️ Need to set up project structure ourselves
- ⚠️ Need to configure TypeScript, testing, etc.

### Risks

- **Risk:** Express is "old" - mitigated by active maintenance and large ecosystem
- **Risk:** Too many choices - mitigated by following best practices and project rules

## Implementation Notes

- Use Express Router for route organization
- Use middleware for cross-cutting concerns (auth, logging, error handling)
- Use TypeScript strict mode
- Follow RESTful conventions
- Structure: `backend/src/routes/`, `backend/src/services/`, `backend/src/middleware/`

## References

- [Express.js Documentation](https://expressjs.com/)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
- Project rules: `.cursor/rules/project.md`
