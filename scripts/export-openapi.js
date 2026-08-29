const fs = require("fs");
const path = require("path");

// Read typescript openapi spec
const specTsPath = path.join(__dirname, "../src/lib/docs/openapi-spec.ts");
const content = fs.readFileSync(specTsPath, "utf-8");

// Parse metadata and endpoints using eval/vm or structured extraction
const metadataMatch = content.match(/export const OPENAPI_METADATA\s*=\s*(\{[\s\S]*?\n\};)/);
const endpointsMatch = content.match(/export const API_ENDPOINTS:\s*OpenApiEndpoint\[\]\s*=\s*(\[[\s\S]*?\n\];)/);

if (!metadataMatch || !endpointsMatch) {
  console.error("Could not parse OPENAPI_METADATA or API_ENDPOINTS from openapi-spec.ts");
  process.exit(1);
}

// Clean and parse JS object
let metadataCode = metadataMatch[1].replace(/;$/, "");
let endpointsCode = endpointsMatch[1].replace(/;$/, "");

const metadata = eval(`(${metadataCode})`);
const endpoints = eval(`(${endpointsCode})`);

const paths = {};
for (const endpoint of endpoints) {
  if (!paths[endpoint.path]) {
    paths[endpoint.path] = {};
  }
  paths[endpoint.path][endpoint.method] = {
    summary: endpoint.summary,
    description: endpoint.description,
    tags: endpoint.tags,
    security: endpoint.security,
    parameters: endpoint.parameters,
    requestBody: endpoint.requestBody,
    responses: endpoint.responses,
  };
}

const openapiDocument = {
  ...metadata,
  paths,
};

const publicDir = path.join(__dirname, "../public");
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, "openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(openapiDocument, null, 2), "utf-8");

console.log(`[OpenAPI Generator] Successfully exported public/openapi.json`);
console.log(`[OpenAPI Generator] Generated OpenAPI 3.1.0 specification with ${endpoints.length} operations.`);
