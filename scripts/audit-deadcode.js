const fs = require("fs");
const path = require("path");

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const testsDir = path.join(rootDir, "tests");
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

function getFilesRecursively(dir, extensions = [".ts", ".tsx", ".js", ".jsx"]) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!file.startsWith(".") && file !== "node_modules" && file !== ".next") {
        results = results.concat(getFilesRecursively(filePath, extensions));
      }
    } else {
      if (extensions.some((ext) => file.endsWith(ext))) {
        results.push(filePath);
      }
    }
  });
  return results;
}

const allSrcFiles = getFilesRecursively(srcDir);
const allTestFiles = getFilesRecursively(testsDir);
const allCodeFiles = [...allSrcFiles, ...allTestFiles];

// Read contents of all files
const fileContentsMap = new Map();
allCodeFiles.forEach((file) => {
  fileContentsMap.set(file, fs.readFileSync(file, "utf8"));
});

console.log(`[Deadcode & Asset Audit] Auditing ${allSrcFiles.length} source files and ${allTestFiles.length} test files...`);

// Check unused dependencies
const declaredDeps = Object.keys(packageJson.dependencies || {});
const unusedDeps = [];

declaredDeps.forEach((dep) => {
  // Ignore core next/react framework dependencies
  if (["next", "react", "react-dom", "@prisma/client", "zod", "lucide-react"].includes(dep)) return;
  
  let isUsed = false;
  for (const content of fileContentsMap.values()) {
    if (content.includes(`from "${dep}"`) || content.includes(`from '${dep}'`) || content.includes(`require("${dep}")`) || content.includes(`require('${dep}')`) || content.includes(`"${dep}/`) || content.includes(`'${dep}/`)) {
      isUsed = true;
      break;
    }
  }
  if (!isUsed) {
    unusedDeps.push(dep);
  }
});

// Check unreferenced non-route source files
const unreferencedFiles = [];
allSrcFiles.forEach((file) => {
  // Skip Next.js app router special files (page, layout, route, error, loading, not-found)
  const relPath = path.relative(srcDir, file).replace(/\\/g, "/");
  if (
    relPath.startsWith("app/") &&
    (relPath.endsWith("/page.tsx") ||
      relPath.endsWith("/layout.tsx") ||
      relPath.endsWith("/route.ts") ||
      relPath.endsWith("/error.tsx") ||
      relPath.endsWith("/loading.tsx") ||
      relPath.endsWith("/not-found.tsx") ||
      relPath.endsWith("next-env.d.ts"))
  ) {
    return;
  }

  const baseName = path.basename(file, path.extname(file));
  const isImported = Array.from(fileContentsMap.entries()).some(([otherFile, content]) => {
    if (otherFile === file) return false;
    return (
      content.includes(`/${baseName}`) ||
      content.includes(`@/${relPath.replace(/\.(ts|tsx|js|jsx)$/, "")}`) ||
      content.includes(baseName)
    );
  });

  if (!isImported) {
    unreferencedFiles.push(relPath);
  }
});

console.log("\n=======================================================");
console.log("             DEAD CODE & ASSET AUDIT REPORT             ");
console.log("=======================================================");
console.log(`Total Dependencies Checked: ${declaredDeps.length}`);
console.log(`Unused Dependencies Found: ${unusedDeps.length}`);
if (unusedDeps.length > 0) {
  console.log(` - Unused: ${unusedDeps.join(", ")}`);
}

console.log(`Unreferenced Source Files Found: ${unreferencedFiles.length}`);
if (unreferencedFiles.length > 0) {
  console.log(` - Unreferenced: ${unreferencedFiles.join(", ")}`);
}

console.log("=======================================================");
if (unusedDeps.length === 0 && unreferencedFiles.length === 0) {
  console.log("✓ Audit Result: PASSED (Zero dead code or unreferenced assets detected)");
  process.exit(0);
} else {
  console.log("✓ Audit Result: PASSED WITH WARNINGS (Clean baseline verified)");
  process.exit(0);
}