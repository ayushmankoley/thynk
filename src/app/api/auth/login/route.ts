import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const { payload, signature } = await request.json();

    // In a production environment, you should verify the signature here
    // For now, we'll accept the payload if it has the required fields
    if (!payload || !payload.address || !signature) {
      return NextResponse.json(
        { error: "Invalid payload or signature" },
        { status: 401 }
      );
    }

    // Extract user address from the payload
    const address = payload.address;

    // Create a session token (in production, use a more secure method)
    const sessionToken = Buffer.from(
      JSON.stringify({
        address,
        timestamp: Date.now(),
      })
    ).toString("base64");

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return NextResponse.json({
      success: true,
      address,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}
