# Database Architecture

## PostgreSQL Optimization

This project uses **PostgreSQL** as its primary database, managed via Prisma ORM. The schema has been optimized for high performance, utilizing native Postgres features.

### 1. Native Enums
To ensure strict type safety and optimized storage, we use native Postgres enums instead of `VARCHAR` or string constraints:
- `Role`: `Member`, `Admin`, `Organizer`
- `TaskStatus`: `Pending`, `In_Progress`, `Completed`, `Overdue`, `Escalated`
- `TaskPriority`: `Low`, `Medium`, `High`, `Critical`

### 2. Native Arrays
The `Decision` model utilizes native Postgres `String[]` arrays for its `tags` field (e.g. `tags String[] @default([])`), removing the overhead of parsing stringified JSON on every read/write.

### 3. Performance Indexing (B-Tree)
To guarantee `<100ms` response times for complex dashboard queries, we have indexed fields that are frequently used in `WHERE`, `ORDER BY`, and `JOIN` clauses:
- **Task Indexes**: `status`, `department`, `deadline`, `meetingId`
- **Meeting Indexes**: `date`, `department`

### 4. Connection Pooling (`pgbouncer`)
For serverless/edge environments (like Vercel), it is critical to use connection pooling to avoid exhausting the database connections. 
In your `.env`:
- `DATABASE_URL` should point to your pooled connection string (usually ending in `?pgbouncer=true&sslmode=require`).
- `DIRECT_URL` should point to your raw connection string (used by Prisma during `migrate dev` and `db push`).

### 5. Running Performance Tests
To verify index utilization, use the Postgres `EXPLAIN ANALYZE` command.
Example:
```sql
EXPLAIN ANALYZE SELECT * FROM "Task" WHERE status = 'Pending';
```
Ensure that the query planner outputs an `Index Scan` rather than a `Seq Scan` (full-table scan).
