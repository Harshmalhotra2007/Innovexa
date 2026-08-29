import { generateOpenApiSpec, API_ENDPOINTS, OPENAPI_METADATA } from "../src/lib/docs/openapi-spec";

describe("Automated OpenAPI 3.1.0 Specification Generator", () => {
  it("should generate a valid OpenAPI 3.1.0 document structure", () => {
    const spec = generateOpenApiSpec();

    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toContain("Innovexa");
    expect(spec.info.version).toBe("1.0.0");
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers.length).toBeGreaterThanOrEqual(1);
  });

  it("should contain all essential tags and components", () => {
    const spec = generateOpenApiSpec();

    expect(spec.tags.length).toBeGreaterThanOrEqual(8);
    const tagNames = spec.tags.map((t: any) => t.name);
    expect(tagNames).toContain("Meetings");
    expect(tagNames).toContain("Tasks & SLA Governance");
    expect(tagNames).toContain("AI Agent");
    expect(tagNames).toContain("LiveKit & WebRTC");

    expect(spec.components.securitySchemes.RoleAuth).toBeDefined();
    expect(spec.components.schemas.Task).toBeDefined();
    expect(spec.components.schemas.Meeting).toBeDefined();
  });

  it("should compile paths with methods and operations", () => {
    const spec = generateOpenApiSpec();
    const paths = Object.keys(spec.paths);

    expect(paths.length).toBeGreaterThanOrEqual(30);
    expect(paths).toContain("/api/meetings");
    expect(paths).toContain("/api/tasks");
    expect(paths).toContain("/api/cron/sla-monitor");
    expect(paths).toContain("/api/livekit/token");

    const meetingsPost = spec.paths["/api/meetings"].post;
    expect(meetingsPost).toBeDefined();
    expect(meetingsPost.summary).toBeDefined();
    expect(meetingsPost.responses["201"]).toBeDefined();
  });

  it("should sanitize and never expose sensitive environment variables", () => {
    const specJson = JSON.stringify(generateOpenApiSpec());

    expect(specJson).not.toContain(process.env.AWS_SECRET_ACCESS_KEY || "DUMMY_AWS_KEY");
    expect(specJson).not.toContain(process.env.SUPABASE_KEY || "DUMMY_SUPABASE_KEY");
    expect(specJson).not.toContain(process.env.RESEND_API_KEY || "DUMMY_RESEND_KEY");
  });
});
