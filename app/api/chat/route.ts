import { routeToModel } from "@/lib/nova-router";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { message, previousContext } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const novaResponse = await routeToModel(message, previousContext);

    return NextResponse.json({
      success: true,
      response: novaResponse.response,
      metadata: {
        modelUsed: novaResponse.modelUsed,
        tokensUsed: novaResponse.tokensUsed,
        reasoningDepth: novaResponse.reasoningDepth,
        decisionVelocity: novaResponse.decisionVelocity,
      },
    });
  } catch (error) {
    console.error("Nova chat error:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 }
    );
  }
}