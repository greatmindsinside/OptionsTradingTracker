# Phase 2: Data Validation & Query Interfaces 🔒

## Goals

- Implement comprehensive data validation with Zod schemas
- Build type-safe CRUD query helpers for database operations
- Create data access objects (DAOs) combining validation and business logic
- Add input sanitization layer for security
- Establish comprehensive testing for data integrity

## Inputs

- Completed Phase 1 (Database & Schema)
- SQLite-WASM implementation with migration system
- Database schema with all required tables
- Requirements for data validation and type safety

## Outputs

- Comprehensive Zod validation schemas for all entities
- Type-safe query helpers with full CRUD operations
- Data Access Objects (DAOs) for business logic
- Input sanitization and normalization layer
- Comprehensive test suite for data operations

## Tasks Checklist

### Data Validation (Zod Schemas)

- [x] Install and configure Zod for runtime validation - **COMPLETED**
- [x] Create validation schemas for all database entities - **COMPLETED**
  - [x] Portfolio validation schema - **COMPLETED**
  - [x] Symbol validation schema - **COMPLETED**
  - [x] Trade validation schema - **COMPLETED**
  - [x] Position validation schema - **COMPLETED**
  - [x] Strategy validation schema - **COMPLETED**
  - [x] Market data validation schema - **COMPLETED**
  - [x] Performance metrics validation schema - **COMPLETED**
- [x] Implement data type conversion for SQLite compatibility - **COMPLETED**
- [x] Add comprehensive validation rules and constraints - **COMPLETED**
- [x] Create type inference from validation schemas - **COMPLETED**

### Query Helpers & CRUD Operations

- [x] Implement generic QueryHelper class for type-safe operations - **COMPLETED**
- [x] Create full CRUD operations (Create, Read, Update, Delete) - **COMPLETED**
- [x] Add pagination support with offset/limit - **COMPLETED**
- [x] Implement complex query building with WHERE clauses - **COMPLETED**
- [x] Add QueryBuilder for advanced query construction - **COMPLETED**
- [x] Implement automatic timestamp management - **COMPLETED**
- [x] Add utility operations (count, exists, batch operations) - **COMPLETED**

### Error Handling & Type Safety

- [x] Create custom error classes (DatabaseError, ValidationError, NotFoundError) - **COMPLETED**
- [x] Implement comprehensive error handling with detailed messages - **COMPLETED**
- [x] Add SQLite-specific data type conversion (boolean, null handling) - **COMPLETED**
- [x] Ensure full TypeScript type safety throughout operations - **COMPLETED**

### Input Sanitization & Security

- [x] Implement input sanitization for strings, numbers, booleans - **COMPLETED**
- [x] Add data normalization (trim whitespace, case conversion) - **COMPLETED**
- [x] Create SQL injection prevention through prepared statements - **COMPLETED**
- [x] Add validation before database insertion - **COMPLETED**

### Data Access Objects (DAOs)

- [ ] Create DAO base class with common operations
- [ ] Implement PortfolioDAO with business logic
- [ ] Implement TradeDAO with complex trade operations
- [ ] Implement SymbolDAO with market data integration
- [ ] Add relationship management between entities
- [ ] Create batch operations for bulk data handling

### Comprehensive Testing

- [x] Unit tests for validation schemas (23 tests) - **COMPLETED**
- [x] Unit tests for query helpers (19 tests) - **COMPLETED**
- [x] Integration tests for database operations - **COMPLETED**
- [x] Error handling tests with edge cases - **COMPLETED**
- [ ] DAO tests with business logic validation
- [ ] Performance tests for large datasets

## Implementation Details

### Validation Architecture

```typescript
// Zod schema with validation rules
export const PortfolioSchema = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1).max(100).trim(),
  broker: z.string().min(1).max(50).trim(),
  account_type: z.enum(['cash', 'margin', 'ira', 'roth_ira', '401k', 'other']),
  description: z.string().max(500).trim().optional(),
  is_active: z.boolean().default(true),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});

// Type inference
export type Portfolio = z.infer<typeof PortfolioSchema>;
```

### Query Helper Architecture

```typescript
// Generic CRUD operations with type safety
class QueryHelper<T> {
  async create(data: Record<string, unknown>): Promise<QueryResult<T>>;
  async findById(id: number): Promise<QueryResult<T>>;
  async findAll(options?: PaginationOptions): Promise<PaginatedResult<T>>;
  async update(id: number, data: Record<string, unknown>): Promise<QueryResult<T>>;
  async delete(id: number): Promise<QueryResult<boolean>>;
  async count(whereClause?: string): Promise<number>;
  async exists(id: number): Promise<boolean>;
}
```

### Error Handling

```typescript
// Custom error classes for specific scenarios
export class DatabaseError extends Error {
  constructor(message: string, operation: string, table: string);
}

export class ValidationError extends Error {
  constructor(message: string, field: string, value: unknown);
}

export class NotFoundError extends Error {
  constructor(table: string, id: number | string);
}
```

## Dependencies

- Phase 1 (Database & Schema) must be complete
- Zod library for runtime validation
- TypeScript for compile-time type safety
- Vitest for comprehensive testing

## Acceptance Tests

- [x] **Validation Schemas (23 tests)** - All entity validation working correctly ✅
- [x] **Query Helpers (19 tests)** - Full CRUD operations with type safety ✅
- [x] **Data Type Conversion** - SQLite boolean/null handling working ✅
- [x] **Error Handling** - Custom errors with detailed messages ✅
- [x] **Input Sanitization** - String trimming and normalization working ✅
- [x] **SQL Injection Prevention** - Prepared statements protecting against injection ✅
- [x] **Type Safety** - Full TypeScript integration with proper inference ✅
- [x] **Pagination** - Offset/limit queries working correctly ✅
- [x] **Complex Queries** - WHERE clauses and query building working ✅
- [x] **Timestamp Management** - Automatic created_at/updated_at handling ✅
- [ ] **DAO Business Logic** - Entity-specific business rules and operations
- [ ] **Performance with Large Datasets** - Efficient operations with 1k+ records
- [ ] **Batch Operations** - Bulk insert/update operations

## Risks & Mitigations

- **Risk:** Validation performance with large datasets
  - **Mitigation:** Efficient Zod schemas, batch validation, selective validation
- **Risk:** Type safety breaking with schema changes
  - **Mitigation:** Strong TypeScript integration, comprehensive tests
- **Risk:** Query helper complexity with advanced operations
  - **Mitigation:** Modular design, extensive testing, clear error messages
- **Risk:** DAO layer becoming too complex
  - **Mitigation:** Simple base class, focused responsibilities, good documentation

## Demo Script

```typescript
// Initialize with validation
const portfolioHelper = new QueryHelper(db, 'portfolios', PortfolioSchema);

// Create with validation
const portfolioData = {
  name: 'Trading Account',
  broker: 'td_ameritrade',
  account_type: 'margin' as const,
  description: 'Primary trading portfolio',
};

const result = await portfolioHelper.create(portfolioData);
if (result.success) {
  console.log('Created portfolio:', result.data);
} else {
  console.error('Validation failed:', result.error);
}

// Query with pagination
const portfolios = await portfolioHelper.findAll({
  limit: 10,
  offset: 0,
  orderBy: 'name',
});

// Complex query with WHERE clause
const activePortfolios = await portfolioHelper.findAll({ limit: 100 }, 'is_active = ?', [true]);
```

## Status

🚧 **IN PROGRESS - 80% COMPLETE**

**Files Created:**

- **Validation Schemas:** `src/modules/db/validation.ts` - Comprehensive Zod validation for all entities
- **Query Helpers:** `src/modules/db/query-helpers.ts` - Type-safe CRUD operations with error handling
- **Test Coverage:** `tests/unit/db/validation.test.ts` + `tests/unit/db/query-helpers.test.ts` - 42 comprehensive tests

**Completed:**

- ✅ **Data Validation:** Complete Zod schema implementation with 23 passing tests
- ✅ **Query Helpers:** Full CRUD operations with 19 passing tests
- ✅ **Type Safety:** Complete TypeScript integration with proper inference
- ✅ **Error Handling:** Custom error classes with detailed error reporting
- ✅ **Input Sanitization:** String/number/boolean sanitization working
- ✅ **SQLite Integration:** Proper data type conversion and null handling
- ✅ **Testing Foundation:** 42/42 tests passing with comprehensive coverage

**Remaining Work:**

- 🚧 **Data Access Objects (DAOs):** Entity-specific business logic layer
- 🚧 **Advanced Testing:** Performance tests and DAO business logic tests
- 🚧 **Batch Operations:** Bulk insert/update operations for CSV import

**Verification Results:**

- **All Validation Tests:** 23/23 passing ✅
- **All Query Helper Tests:** 19/19 passing ✅
- **Total Database Tests:** 64/64 passing ✅
- **Type Safety:** Full TypeScript integration working ✅
- **Error Handling:** Comprehensive error management working ✅

**Next Steps:**

1. **Implement DAO Layer:** Create business logic layer for entities
2. **Add Batch Operations:** Bulk operations for CSV import functionality
3. **Performance Testing:** Test with larger datasets (1k+ records)
4. **Complete Phase 2:** Finish remaining DAO and batch operation tasks

**Previous Phase:** [Phase 1 - Database & Schema](./phase-1-database.md) ✅
**Next Phase:** [Phase 3 - CSV Import & Normalization](./phase-2-csv-import.md) ⏳
