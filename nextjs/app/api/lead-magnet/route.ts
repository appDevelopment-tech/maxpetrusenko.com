import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Lead magnet submission API
 *
 * POST /api/lead-magnet
 *
 * Body:
 * - email: string
 * - stack: string (for stack_analysis type)
 * - type: "stack_analysis" | "checklist" | "assessment"
 * - source: string (tracking source)
 *
 * Processes lead magnet submissions and sends notifications
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      email?: string;
      stack?: string;
      type?: "stack_analysis" | "checklist" | "assessment";
      source?: string;
    };
    const { email, stack, type = "stack_analysis", source = "unknown" } = body;

    // Validate
    if (!email || !stack) {
      return NextResponse.json(
        { error: "Email and stack are required" },
        { status: 400 }
      );
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // In production, you would:
    // 1. Store in database (Airtable, Supabase, etc.)
    // 2. Add to email list (ConvertKit, Mailchimp, etc.)
    // 3. Send notification to owner
    // 4. Trigger automated email sequence

    // For now, log and return success
    console.log("[Lead Magnet] New submission:", {
      type,
      email,
      stack: stack.slice(0, 100) + "...", // Truncate for logs
      source,
      timestamp: new Date().toISOString(),
    });

    // TODO: Send to your email service or database
    // Example: await fetch("https://api.airtable.com/v0/...", { ... })

    return NextResponse.json({
      success: true,
      message: "Thanks! I'll review your stack and send personalized automation ideas.",
    });
  } catch (error) {
    console.error("[Lead Magnet] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
