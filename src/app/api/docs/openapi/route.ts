import { NextResponse } from "next/server";
import { generateOpenApiSpec } from "@/lib/docs/openapi-spec";

export const dynamic = "force-dynamic";

export async function GET() {
  const spec = generateOpenApiSpec();
  return NextResponse.json(spec, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
