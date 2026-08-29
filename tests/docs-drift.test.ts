import * as path from "path";
import {
  normalizeFsRouteToApiPath,
  scanCodebaseRoutes,
  validateDocumentationDrift,
} from "../src/lib/docs/drift-detector";

describe("Documentation Drift & Schema Sync Validator", () => {
  const apiDir = path.join(__dirname, "../src/app/api");
  const prismaPath = path.join(__dirname, "../prisma/schema.prisma");

  it("should normalize App Router paths with parameter brackets", () => {
    expect(normalizeFsRouteToApiPath("src/app/api/meetings/[id]/route.ts")).toBe("/api/meetings/{id}");
    expect(normalizeFsRouteToApiPath("src/app/api/ai-agent/[meetingId]/transcript/route.ts")).toBe(
      "/api/ai-agent/{meetingId}/transcript"
    );
    expect(normalizeFsRouteToApiPath("src/app/api/tasks/route.ts")).toBe("/api/tasks");
  });

  it("should scan codebase route handlers and detect HTTP methods", () => {
    const routes = scanCodebaseRoutes(apiDir);
    expect(routes.length).toBeGreaterThanOrEqual(40);

    const tasksRoute = routes.find((r) => r.path === "/api/tasks");
    expect(tasksRoute).toBeDefined();
    expect(tasksRoute?.methods).toContain("get");
    expect(tasksRoute?.methods).toContain("post");
    expect(tasksRoute?.methods).toContain("patch");
    expect(tasksRoute?.methods).toContain("delete");
  });

  it("should validate zero documentation drift on current codebase", () => {
    const report = validateDocumentationDrift(apiDir, prismaPath);
    if (!report.isSynced) {
      console.log("Drift Issues:", report.issues);
    }
    expect(report.isSynced).toBe(true);
    expect(report.driftCount).toBe(0);
    expect(report.driftPercentage).toBe(0);
    expect(report.totalCodeRoutes).toBeGreaterThanOrEqual(50);
  });
});
