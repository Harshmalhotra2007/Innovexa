# Innovexa Ops Console — Database & Prisma Architecture

Comprehensive documentation of the PostgreSQL database schema, Prisma ORM configuration, performance indexes, and migration procedures.

---

## 📊 Entity Relationship (ER) Diagram

```mermaid
erDiagram
    Department ||--o{ User : "contains"
    Meeting ||--o{ MeetingSegment : "has"
    Meeting ||--o{ Decision : "yields"
    Meeting ||--o{ Task : "generates"
    User ||--o{ Task : "owns"
    Task ||--o{ Notification : "triggers"

    Department {
        string id PK
        string name UK
        string code UK
        string managerName
        string managerEmail
        datetime createdAt
    }

    User {
        string id PK
        string name
        string email UK
        enum role "Member | Admin | Organizer"
        string departmentId FK
        datetime createdAt
    }

    Meeting {
        string id PK
        string title
        datetime date
        int durationMins
        string department
        string agenda
        string objectives
        string transcript
        string status
        datetime createdAt
        datetime updatedAt
    }

    MeetingSegment {
        string id PK
        string meetingId FK
        string speaker
        string timestamp
        string text
        string type
        int order
    }

    Decision {
        string id PK
        string meetingId FK
        string title
        string context
        string rationale
        string department
        string_array tags
        datetime createdAt
    }

    Task {
        string id PK
        string meetingId FK
        string assigneeId FK
        string title
        string description
        string ownerName
        string ownerEmail
        string department
        enum priority "Low | Medium | High | Critical"
        enum status "Pending | In_Progress | Completed | Overdue | Escalated"
        datetime deadline
        int escalationLevel
        datetime escalatedAt
        string escalatedTo
        datetime createdAt
        datetime updatedAt
    }

    Notification {
        string id PK
        string taskId FK
        string recipient
        string subject
        string body
        string type
        datetime sentAt
        boolean read
    }
```

---

## ⚡ PostgreSQL Native Features

### 1. Native Enums
Strictly enforced database-level type safety for permissions and lifecycle states:
- `Role`: `'Member'`, `'Admin'`, `'Organizer'`
- `TaskStatus`: `'Pending'`, `'In_Progress'`, `'Completed'`, `'Overdue'`, `'Escalated'`
- `TaskPriority`: `'Low'`, `'Medium'`, `'High'`, `'Critical'`

### 2. Native Array Types (`String[]`)
The `Decision` model utilizes native PostgreSQL array columns (`tags String[] @default([])`), eliminating stringified JSON parsing overhead during semantic searches.

### 3. B-Tree Performance Indexing
High-performance B-Tree indexes configured on critical query fields:
- `Meeting`: `@@index([date])`, `@@index([department])`
- `Task`: `@@index([status])`, `@@index([department])`, `@@index([deadline])`, `@@index([meetingId])`

---

## 🔄 Migration & Connection Workflow

### Connection String Separation
- **`DATABASE_URL`**: Pooled connection string (`?pgbouncer=true&sslmode=require`) used by serverless runtime instances.
- **`DIRECT_URL`**: Direct connection string used by Prisma CLI during schema migrations (`npx prisma migrate dev`).

### Migration Commands
```bash
# Generate Prisma Client after schema changes
npx prisma generate

# Create and apply a new migration (Development)
npx prisma migrate dev --name add_custom_index

# Deploy pending migrations (Production)
npx prisma migrate deploy
```

---

## 🔍 Query Profiling & Optimization

Use `EXPLAIN ANALYZE` to verify index scanning:

```sql
-- Benchmark Task status lookup
EXPLAIN ANALYZE SELECT * FROM "Task" WHERE status = 'Overdue' AND department = 'Engineering';
```

---

## 💾 Backup & Restore Procedures

### Database Dump (Backup)
```bash
pg_dump -U postgres -d innovexa_db -F c -b -v -f innovexa_backup.dump
```

### Database Restore
```bash
pg_restore -U postgres -d innovexa_db -v innovexa_backup.dump
```

