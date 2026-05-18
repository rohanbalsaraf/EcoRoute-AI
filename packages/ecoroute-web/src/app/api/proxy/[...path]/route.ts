import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  return handleProxy(request, await params);
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

async function handleProxy(request: NextRequest, params: { path: string[] }) {
  try {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const API_URL = rawApiUrl.trim().replace(/\/$/, "");
    
    // Construct the backend URL
    const pathString = params.path.join("/");
    const searchParams = request.nextUrl.searchParams.toString();
    const query = searchParams ? `?${searchParams}` : "";
    const backendUrl = `${API_URL}/${pathString}${query}`;

    // Extract headers from the incoming request to forward to the backend
    const headers = new Headers();
    const authHeader = request.headers.get("authorization");
    if (authHeader) headers.set("authorization", authHeader);
    const contentType = request.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);

    // Prepare fetch options
    const init: RequestInit = {
      method: request.method,
      headers,
    };

    // Forward body for POST/PUT requests
    if (request.method !== "GET" && request.method !== "HEAD") {
      const body = await request.text();
      if (body) init.body = body;
    }

    const res = await fetch(backendUrl, init);
    const data = await res.text();

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", res.headers.get("Content-Type") || "application/json");

    return new NextResponse(data, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      { error: "Proxy connection failed", details: error.message },
      { status: 502 }
    );
  }
}
