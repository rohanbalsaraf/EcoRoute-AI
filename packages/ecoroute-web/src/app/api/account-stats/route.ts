import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const API_URL = rawApiUrl.trim().replace(/\/$/, "");
    const backendUrl = `${API_URL}/api/v1/user/quota`;

    const headers = new Headers();
    const authHeader = request.headers.get("authorization");
    if (authHeader) headers.set("authorization", authHeader);

    const res = await fetch(backendUrl, {
      method: "GET",
      headers,
    });
    
    const responseHeaders = new Headers(res.headers);
    return new NextResponse(res.body, {
      status: res.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Gateway connection failed", details: error.message },
      { status: 502 }
    );
  }
}
