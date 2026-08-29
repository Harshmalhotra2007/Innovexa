import { NextResponse } from "next/server";

/**
 * Custom error class for API errors with specific status codes.
 * Allows throwing expected errors (like validation errors) with appropriate HTTP status.
 */
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Wrapper for Next.js API route handlers to ensure consistent error handling.
 * Logs errors and returns standardized error responses.
 *
 * Usage:
 * export async function GET(req: Request) {
 *   return apiHandler(async () => {
 *     // your logic here
 *     // throw new ApiError(400, "Validation error") for expected errors
 *     return result;
 *   });
 * }
 */
export async function apiHandler<T>(
  reqOrHandler: Request | ((req: Request) => Promise<T>),
  handlerFunc?: (req: Request) => Promise<T>
): Promise<NextResponse> {
  try {
    let req: Request;
    let handler: (req: Request) => Promise<T>;

    if (typeof reqOrHandler === "function") {
      handler = reqOrHandler;
      req = new Request("http://localhost");
    } else {
      req = reqOrHandler;
      handler = handlerFunc || (async () => ({} as T));
    }

    const result = await handler(req);

    // If result is already a NextResponse, return it directly
    if (result instanceof NextResponse) {
      return result;
    }

    // If result is an object with status and body, use those
    if (result && typeof result === 'object' && 'status' in result && 'body' in result) {
      const resObj = result as { status: number; body: unknown };
      return NextResponse.json(resObj.body, { status: resObj.status });
    }

    return NextResponse.json(result);
  } catch (error) {
    // Log the error for debugging
    console.error('[API Error]', error);

    // Handle ApiError instances for expected errors with specific status codes
    if (error instanceof ApiError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    // For unexpected errors, return 500
    // In development, include error message; in production, hide details
    const isDevelopment = process.env.NODE_ENV === 'development';
    const errorMessage = isDevelopment
      ? error instanceof Error
        ? error.message
        : 'Unknown error'
      : 'Internal Server Error';

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}