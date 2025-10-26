import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");

    if (!session) {
      return NextResponse.json({
        isLoggedIn: false,
      });
    }

    // Decode the session token
    try {
      const sessionData = JSON.parse(
        Buffer.from(session.value, "base64").toString()
      );

      // Check if session is still valid (not expired)
      const sessionAge = Date.now() - sessionData.timestamp;
      const maxAge = 60 * 60 * 24 * 7 * 1000; // 7 days

      if (sessionAge > maxAge) {
        cookieStore.delete("session");
        return NextResponse.json({
          isLoggedIn: false,
        });
      }

      return NextResponse.json({
        isLoggedIn: true,
        address: sessionData.address,
      });
    } catch {
      // Invalid session token
      cookieStore.delete("session");
      return NextResponse.json({
        isLoggedIn: false,
      });
    }
  } catch (error) {
    console.error("Status check error:", error);
    return NextResponse.json(
      { error: "Status check failed" },
      { status: 500 }
    );
  }
}

