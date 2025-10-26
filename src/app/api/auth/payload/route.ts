    import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { address, chainId } = await request.json();

    // Generate a login payload for the user to sign
    const payload = {
      domain: request.headers.get("host") || "localhost:3000",
      address,
      statement: "Sign in to Thynk",
      uri: request.headers.get("origin") || "http://localhost:3000",
      version: "1",
      chain_id: chainId || "11142220", // Celo Sepolia
      nonce: Math.random().toString(36).substring(2, 15),
      issued_at: new Date().toISOString(),
      expiration_time: new Date(Date.now() + 1000 * 60 * 5).toISOString(), // 5 minutes
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Payload generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate payload" },
      { status: 500 }
    );
  }
}

