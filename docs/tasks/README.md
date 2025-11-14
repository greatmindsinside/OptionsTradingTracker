# Migration Tasks

This directory contains actionable tasks for the cloud migration project.

## Task Structure

Tasks are numbered sequentially (`001-`, `002-`, etc.) and follow the template in `docs/templates/task-template.md`.

## Current Tasks

- **001-backend-setup** - Initialize Node.js backend infrastructure
- **002-database-schema** - Create PostgreSQL schema with migrations
- **003-auth-system** - Implement JWT authentication
- **004-api-endpoints** - Create core REST API endpoints
- **005-frontend-integration** - Replace SQLite with API calls

## Workflow

1. **Open a task file** - Start with `001-backend-setup.md`
2. **Start Plan Mode** - Cursor will read the task + linked files
3. **Review the plan** - Agent proposes 2-3 concrete steps
4. **Approve and execute** - Let Agent run the first 2-3 steps
5. **Review changes** - Check diffs, run tests
6. **Update task status** - Mark completed steps
7. **Continue or move on** - Either continue with next steps or open next task

## Task Status

- `pending` - Not started
- `in_progress` - Currently working on
- `completed` - Finished
- `blocked` - Waiting on dependency

## Dependencies

Tasks have dependencies listed in their "Depends on" section. Always complete dependencies before starting a task.

## Related Documentation

- **Template:** `docs/templates/task-template.md`
- **ADRs:** `docs/decisions/` - Architecture decisions
- **Reference:** `docs/reference/` - Detailed specifications
- **Rules:** `.cursor/rules/` - Project and documentation rules
