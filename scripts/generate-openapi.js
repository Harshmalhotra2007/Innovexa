const fs = require("fs");
const path = require("path");

// Dynamically read the endpoints and metadata from the compiled/transpiled lib or create json directly
const openapiSpecPath = path.join(__dirname, "../src/lib/docs/openapi-spec.ts");
const publicDir = path.join(__dirname, "../public");

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Compile openapi document
const { API_ENDPOINTS, OPENAPI_METADATA } = require(path.join(__dirname, "../src/lib/docs/openapi-spec.ts"));

const paths = {};
for (const endpoint of API_ENDPOINTS) {
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

const spec = {
  ...OPENAPI_METADATA,
  paths,
};

const outputPath = path.join(publicDir, "openapi.json");
fs.writeFileSync(outputPath, JSON.stringify(spec, null, 2), "utf-8");

console.log(`[OpenAPI Generator] Successfully generated OpenAPI 3.1.0 specification at: ${outputPath}`);
console.log(`[OpenAPI Generator] Documented ${API_ENDPOINTS.length} operations across ${Object.keys(paths).length} API path routes.`);
