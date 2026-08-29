import * as fs from "fs";
import * as path from "path";
import { API_ENDPOINTS } from "./openapi-spec";

export interface DriftReport {
  timestamp: string;
  totalCodeRoutes: number;
  totalDocRoutes: number;
  driftCount: number;
  driftPercentage: number;
  isSynced: boolean;
  issues: Array<{
    type: "MISSING_ENDPOINT" | "MISSING_METHOD" | "SCHEMA_DRIFT" | "RBAC_MISMATCH";
    path: string;
    method?: string;
    details: string;
  }>;
}

/**
 * Normalizes Next.js App Router filesystem path to OpenAPI format
 * Example: "src/app/api/meetings/[id]/route.ts" -> "/api/meetings/{id}"
 */
export function normalizeFsRouteToApiPath(fsPath: string): string {
  const relative = fsPath.replace(/\\/g, "/");
  const match = relative.match(/src\/app(\/api\/.*)\/route\.ts$/);
  if (!match) return "";

  let apiPath = match[1];
  // Replace [param] with {param}
  apiPath = apiPath.replace(/\[(\.\.\.)?([^\]]+)\]/g, "{$2}");
  return apiPath;
}

/**
 * Scans filesystem for all App Router route handlers
 */
export function scanCodebaseRoutes(apiDir: string): Array<{ path: string; methods: string[]; filePath: string }> {
  const results: Array<{ path: string; methods: string[]; filePath: string }> = [];

  function traverse(currentDir: string) {
    if (!fs.existsSync(currentDir)) return;
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name === "route.ts") {
        const apiPath = normalizeFsRouteToApiPath(fullPath);
        if (!apiPath) continue;

        const content = fs.readFileSync(fullPath, "utf-8");
        const methods: string[] = [];

        if (/export\s+(async\s+)?function\s+GET\b/.test(content)) methods.push("get");
        if (/export\s+(async\s+)?function\s+POST\b/.test(content)) methods.push("post");
        if (/export\s+(async\s+)?function\s+PATCH\b/.test(content)) methods.push("patch");
        if (/export\s+(async\s+)?function\s+DELETE\b/.test(content)) methods.push("delete");
        if (/export\s+(async\s+)?function\s+PUT\b/.test(content)) methods.push("put");

        results.push({ path: apiPath, methods, filePath: fullPath });
      }
    }
  }

  traverse(apiDir);
  return results;
}

/**
 * Validates documentation drift between code and OpenAPI specification
 */
export function validateDocumentationDrift(apiDir: string, prismaPath?: string): DriftReport {
  const codeRoutes = scanCodebaseRoutes(apiDir);
  const issues: DriftReport["issues"] = [];

  // Index documented endpoints
  const documentedMap = new Map<string, Set<string>>();
  for (const ep of API_ENDPOINTS) {
    if (!documentedMap.has(ep.path)) {
      documentedMap.set(ep.path, new Set());
    }
    documentedMap.get(ep.path)!.add(ep.method.toLowerCase());
  }

  // Check code routes vs doc routes
  for (const cr of codeRoutes) {
    const docMethods = documentedMap.get(cr.path);

    if (!docMethods) {
      // Endpoint completely missing from docs
      issues.push({
        type: "MISSING_ENDPOINT",
        path: cr.path,
        details: `Route exists in code (${cr.filePath}) but is absent from OpenAPI specification.`,
      });
      continue;
    }

    for (const m of cr.methods) {
      if (!docMethods.has(m)) {
        issues.push({
          type: "MISSING_METHOD",
          path: cr.path,
          method: m.toUpperCase(),
          details: `HTTP method ${m.toUpperCase()} is implemented in code but not documented in OpenAPI spec.`,
        });
      }
    }
  }

  // Check Prisma Task enum alignment if prisma schema exists
  if (prismaPath && fs.existsSync(prismaPath)) {
    const prismaContent = fs.readFileSync(prismaPath, "utf-8");
    const taskStatusMatch = prismaContent.match(/enum\s+TaskStatus\s*\{([^}]+)\}/);
    if (taskStatusMatch) {
      const enumValues = taskStatusMatch[1]
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("//"));

      const documentedStatuses = ["Pending", "In_Progress", "In Progress", "Completed", "Overdue", "Escalated"];
      for (const val of enumValues) {
        if (!documentedStatuses.includes(val) && !documentedStatuses.includes(val.replace(/_/g, " "))) {
          issues.push({
            type: "SCHEMA_DRIFT",
            path: "prisma/schema.prisma",
            details: `TaskStatus enum value '${val}' in Prisma is not aligned with documented task statuses.`,
          });
        }
      }
    }
  }

  const totalCodeRoutes = codeRoutes.reduce((acc, r) => acc + r.methods.length, 0);
  const totalDocRoutes = API_ENDPOINTS.length;
  const driftCount = issues.length;
  const driftPercentage = totalCodeRoutes > 0 ? Math.round((driftCount / totalCodeRoutes) * 100) : 0;

  return {
    timestamp: new Date().toISOString(),
    totalCodeRoutes,
    totalDocRoutes,
    driftCount,
    driftPercentage,
    isSynced: driftCount === 0,
    issues,
  };
}
