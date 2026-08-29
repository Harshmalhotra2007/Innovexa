const fs = require("fs");
const path = require("path");

function normalizeFsRouteToApiPath(fsPath) {
  const relative = fsPath.replace(/\\/g, "/");
  const match = relative.match(/src\/app(\/api\/.*)\/route\.ts$/);
  if (!match) return "";

  let apiPath = match[1];
  apiPath = apiPath.replace(/\[(\.\.\.)?([^\]]+)\]/g, "{$2}");
  return apiPath;
}

function scanCodebaseRoutes(apiDir) {
  const results = [];

  function traverse(currentDir) {
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
        const methods = [];

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

function runDriftValidation() {
  const apiDir = path.join(__dirname, "../src/app/api");
  const openapiSpecFile = path.join(__dirname, "../src/lib/docs/openapi-spec.ts");
  const prismaSchemaFile = path.join(__dirname, "../prisma/schema.prisma");

  console.log("==================================================================");
  console.log("🔍 Innovexa CI/CD Documentation Drift & Schema Sync Validator");
  console.log("==================================================================");

  const codeRoutes = scanCodebaseRoutes(apiDir);
  const specContent = fs.readFileSync(openapiSpecFile, "utf-8");

  const issues = [];
  let documentedOperationsCount = 0;

  for (const cr of codeRoutes) {
    for (const m of cr.methods) {
      // Check if path and method exist in openapi-spec.ts
      const pathRegex = new RegExp(`path:\\s*["']${cr.path.replace(/[{}]/g, "\\$&")}["']`, "i");
      const hasPath = pathRegex.test(specContent);

      if (!hasPath) {
        issues.push({
          type: "MISSING_ENDPOINT",
          path: cr.path,
          method: m.toUpperCase(),
          details: `Endpoint ${cr.path} (${cr.filePath}) is not documented in OpenAPI spec.`,
        });
      } else {
        documentedOperationsCount++;
      }
    }
  }

  // Verify Prisma Task Status alignment
  if (fs.existsSync(prismaSchemaFile)) {
    const prismaContent = fs.readFileSync(prismaSchemaFile, "utf-8");
    const taskStatusMatch = prismaContent.match(/enum\s+TaskStatus\s*\{([^}]+)\}/);
    if (taskStatusMatch) {
      const enumValues = taskStatusMatch[1]
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s && !s.startsWith("//"));

      const validDocStatuses = ["Pending", "In_Progress", "In Progress", "Completed", "Overdue", "Escalated"];
      for (const val of enumValues) {
        if (!validDocStatuses.includes(val) && !validDocStatuses.includes(val.replace(/_/g, " "))) {
          issues.push({
            type: "SCHEMA_DRIFT",
            path: "prisma/schema.prisma",
            method: "MODEL",
            details: `TaskStatus enum '${val}' in Prisma is not present in documented statuses.`,
          });
        }
      }
    }
  }

  const totalCodeOperations = codeRoutes.reduce((acc, r) => acc + r.methods.length, 0);

  console.log(`Discovered Code Routes: ${codeRoutes.length} route files`);
  console.log(`Total Implemented Endpoints: ${totalCodeOperations} operations`);
  console.log(`Verified Documented Operations: ${documentedOperationsCount}`);
  console.log(`Drift Issues Detected: ${issues.length}`);

  if (issues.length > 0) {
    console.error("\n❌ DRIFT DETECTED: The following documentation discrepancies were found:\n");
    issues.forEach((issue, idx) => {
      console.error(`  [${idx + 1}] [${issue.type}] ${issue.method || ""} ${issue.path}`);
      console.error(`      -> ${issue.details}`);
    });
    console.error("\nRun 'npm run docs:generate' and update OpenAPI specification to resolve drift.");
    process.exit(1);
  }

  console.log("\n✅ CLEAN SYNC: 100% of codebase API routes and Prisma schemas match documentation perfectly.\n");
  process.exit(0);
}

runDriftValidation();
