import { db } from "./db";

export async function ensureSeedData() {
  try {
    const departmentCount = await db.department.count();
    if (departmentCount > 0) {
      return;
    }



    // 1. Departments
    const engDept = await db.department.create({
      data: {
        name: "Engineering",
        code: "ENG",
        managerName: "Dr. Vikram Seth",
        managerEmail: "vikram.seth@company.org",
      },
    });

    const productDept = await db.department.create({
      data: {
        name: "Product & UI/UX",
        code: "PROD",
        managerName: "Ananya Sharma",
        managerEmail: "ananya.sharma@company.org",
      },
    });

    const opsDept = await db.department.create({
      data: {
        name: "Operations & Logistics",
        code: "OPS",
        managerName: "Rajesh Kumar",
        managerEmail: "rajesh.kumar@company.org",
      },
    });

    const securityDept = await db.department.create({
      data: {
        name: "Cybersecurity & Governance",
        code: "SEC",
        managerName: "Priya Nair",
        managerEmail: "priya.nair@company.org",
      },
    });

    // 2. Users
    const u1 = await db.user.create({
      data: {
        name: "Alex Mercer",
        email: "alex.mercer@company.org",
        role: "Lead Engineer",
        departmentId: engDept.id,
      },
    });

    const u2 = await db.user.create({
      data: {
        name: "Sarah Jenkins",
        email: "sarah.j@company.org",
        role: "Product Manager",
        departmentId: productDept.id,
      },
    });

    const u3 = await db.user.create({
      data: {
        name: "Rohan Verma",
        email: "rohan.v@company.org",
        role: "DevOps Engineer",
        departmentId: engDept.id,
      },
    });

    const u4 = await db.user.create({
      data: {
        name: "Kavita Rao",
        email: "kavita.r@company.org",
        role: "Security Officer",
        departmentId: securityDept.id,
      },
    });

    // 3. Meetings
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const m1 = await db.meeting.create({
      data: {
        title: "Q3 Architecture & Security Baseline Review",
        date: fiveDaysAgo,
        durationMins: 60,
        department: "Engineering",
        agenda: "Review API microservice migration, vector database selection, and zero-trust security audit deadlines.",
        objectives: "Finalize vector database provider and approve authentication token refresh protocol.",
        status: "Processed",
        transcript: `[00:01] Sarah Jenkins (Product): Good morning team. Let's align on our Q3 backend architecture goals. Alex, what is our verdict on vector databases for the intelligent search requirement?
[00:03] Alex Mercer (Engineering): Based on benchmark performance and low latency requirements, we formally decide to adopt ChromaDB for localized embeddings and Qdrant for cloud cluster scaling.
[00:06] Kavita Rao (Security): We must enforce strict RBAC and token refresh intervals. Action item: Kavita will implement JWT rotation with a 15-minute expiration by Friday, August 25.
[00:09] Rohan Verma (DevOps): Regarding CI/CD pipelines, Rohan is assigned to configure Docker containerization for the microservice stack by tomorrow evening.
[00:12] Sarah Jenkins (Product): Great. Decision: We will standardize all payload schemas using Pydantic JSON validation across services.`,
        segments: {
          create: [
            {
              speaker: "Sarah Jenkins",
              timestamp: "00:01",
              text: "Good morning team. Let's align on our Q3 backend architecture goals. Alex, what is our verdict on vector databases for the intelligent search requirement?",
              type: "discussion",
              order: 1,
            },
            {
              speaker: "Alex Mercer",
              timestamp: "00:03",
              text: "Based on benchmark performance and low latency requirements, we formally decide to adopt ChromaDB for localized embeddings and Qdrant for cloud cluster scaling.",
              type: "decision",
              order: 2,
            },
            {
              speaker: "Kavita Rao",
              timestamp: "00:06",
              text: "We must enforce strict RBAC and token refresh intervals. Action item: Kavita will implement JWT rotation with a 15-minute expiration by Friday, August 25.",
              type: "action",
              order: 3,
            },
            {
              speaker: "Rohan Verma",
              timestamp: "00:09",
              text: "Regarding CI/CD pipelines, Rohan is assigned to configure Docker containerization for the microservice stack by tomorrow evening.",
              type: "action",
              order: 4,
            },
            {
              speaker: "Sarah Jenkins",
              timestamp: "00:12",
              text: "Great. Decision: We will standardize all payload schemas using Pydantic JSON validation across services.",
              type: "decision",
              order: 5,
            },
          ],
        },
        decisions: {
          create: [
            {
              title: "Adopt Dual Vector Storage (ChromaDB + Qdrant)",
              context: "Evaluated local and cloud vector database performance for semantic meeting transcript retrieval.",
              rationale: "ChromaDB provides zero-latency local development while Qdrant handles production enterprise scale.",
              department: "Engineering",
              tags: JSON.stringify(["VectorDB", "AI Architecture", "ChromaDB"]),
            },
            {
              title: "Standardize Payload Schemas with Pydantic",
              context: "Inconsistent JSON formats caused ingestion pipeline validation errors.",
              rationale: "Pydantic guarantees strict runtime type safety and OpenAPI spec generation.",
              department: "Product & UI/UX",
              tags: JSON.stringify(["API", "Schema", "Pydantic"]),
            },
          ],
        },
      },
    });

    const m2 = await db.meeting.create({
      data: {
        title: "Sprint 14 Standup & Overdue Task Audit",
        date: twoDaysAgo,
        durationMins: 30,
        department: "Operations & Logistics",
        agenda: "Track ongoing action items, flag overdue deliverable bottlenecks, and execute manager escalations.",
        objectives: "Clear overdue blockers for production deployment.",
        status: "Processed",
        transcript: `[00:01] Rajesh Kumar (Ops Manager): Welcome everyone. We have two critical items that have breached SLA deadlines.
[00:04] Alex Mercer (Engineering): The automated reminder system is complete, but n8n cron workflow integration for Slack notification triggers was delayed.
[00:07] Rajesh Kumar (Ops Manager): Action item: Alex Mercer must complete the n8n webhook notification node setup immediately. Deadline was yesterday.
[00:10] Ananya Sharma (Product): Action item: Sarah Jenkins to finalize user testing report for the new meeting effectiveness dashboard by August 22.
[00:14] Rajesh Kumar (Ops Manager): Decision: Any action item overdue by more than 48 hours will trigger an automated escalation email to the Department Head.`,
        segments: {
          create: [
            {
              speaker: "Rajesh Kumar",
              timestamp: "00:01",
              text: "Welcome everyone. We have two critical items that have breached SLA deadlines.",
              type: "discussion",
              order: 1,
            },
            {
              speaker: "Alex Mercer",
              timestamp: "00:04",
              text: "The automated reminder system is complete, but n8n cron workflow integration for Slack notification triggers was delayed.",
              type: "discussion",
              order: 2,
            },
            {
              speaker: "Alex Mercer",
              timestamp: "00:07",
              text: "Alex Mercer must complete the n8n webhook notification node setup immediately. Deadline was yesterday.",
              type: "action",
              order: 3,
            },
            {
              speaker: "Ananya Sharma",
              timestamp: "00:10",
              text: "Sarah Jenkins to finalize user testing report for the new meeting effectiveness dashboard by August 22.",
              type: "action",
              order: 4,
            },
            {
              speaker: "Rajesh Kumar",
              timestamp: "00:14",
              text: "Decision: Any action item overdue by more than 48 hours will trigger an automated escalation email to the Department Head.",
              type: "decision",
              order: 5,
            },
          ],
        },
        decisions: {
          create: [
            {
              title: "48-Hour SLA Escalation Policy",
              context: "Delayed task completion was hindering cross-department release syncs.",
              rationale: "Automated escalation notifies department leads to reallocate engineering resources quickly.",
              department: "Operations & Logistics",
              tags: JSON.stringify(["SLA", "Escalation", "Governance"]),
            },
          ],
        },
      },
    });

    // 4. Action Items / Tasks
    // Task 1: Overdue & Escalated Task
    await db.task.create({
      data: {
        meetingId: m2.id,
        title: "Integrate n8n Webhook Workflow for Overdue Notifications",
        description: "Connect n8n cron workflow trigger to send daily email & Slack notifications for pending task deadlines.",
        ownerName: "Alex Mercer",
        ownerEmail: "alex.mercer@company.org",
        department: "Engineering",
        priority: "High",
        status: "Escalated",
        deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        escalationLevel: 2,
        escalatedAt: yesterday,
        escalatedTo: "Dr. Vikram Seth (Dept Manager)",
      },
    });

    // Task 2: Overdue Task (Pending Escalation)
    await db.task.create({
      data: {
        meetingId: m1.id,
        title: "Implement JWT Token Rotation & RBAC Middleware",
        description: "Enforce 15-minute expiration window and secure role-based endpoint authorization.",
        ownerName: "Kavita Rao",
        ownerEmail: "kavita.r@company.org",
        department: "Cybersecurity & Governance",
        priority: "High",
        status: "Overdue",
        deadline: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        escalationLevel: 1,
      },
    });

    // Task 3: In Progress Task
    await db.task.create({
      data: {
        meetingId: m1.id,
        title: "Configure Docker Containerization for Microservices",
        description: "Write Dockerfile and docker-compose.yml for localized database and server orchestration.",
        ownerName: "Rohan Verma",
        ownerEmail: "rohan.v@company.org",
        department: "Engineering",
        priority: "Medium",
        status: "In_Progress",
        deadline: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000), // tomorrow
        escalationLevel: 0,
      },
    });

    // Task 4: Pending Task
    await db.task.create({
      data: {
        meetingId: m2.id,
        title: "Finalize User Testing Report for Analytics Dashboard",
        description: "Gather feedback from department heads on closure rate charts and decision lag metrics.",
        ownerName: "Sarah Jenkins",
        ownerEmail: "sarah.j@company.org",
        department: "Product & UI/UX",
        priority: "Medium",
        status: "Pending",
        deadline: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        escalationLevel: 0,
      },
    });

    // Task 5: Completed Task
    await db.task.create({
      data: {
        meetingId: m1.id,
        title: "Benchmark ChromaDB vs Qdrant Vector Search",
        description: "Run synthetic vector indexing tests with 50,000 transcript embeddings.",
        ownerName: "Alex Mercer",
        ownerEmail: "alex.mercer@company.org",
        department: "Engineering",
        priority: "High",
        status: "Completed",
        deadline: fiveDaysAgo,
        escalationLevel: 0,
      },
    });

    // 5. Notifications
    await db.notification.create({
      data: {
        recipient: "Dr. Vikram Seth (Manager)",
        subject: "🚨 Task Escalation: Overdue Task Breach (Alex Mercer)",
        body: "Task 'Integrate n8n Webhook Workflow for Overdue Notifications' is 48 hours overdue. Escalated as per SLA governance rules.",
        type: "Escalation",
        sentAt: yesterday,
        read: false,
      },
    });

    await db.notification.create({
      data: {
        recipient: "Kavita Rao",
        subject: "⚠️ Warning: Task Deadline Overdue (JWT Rotation)",
        body: "Task 'Implement JWT Token Rotation & RBAC Middleware' was due yesterday. Please update status to avoid escalation.",
        type: "Warning",
        sentAt: now,
        read: false,
      },
    });


  } catch (error) {
    console.error("Error seeding data:", error);
  }
}
