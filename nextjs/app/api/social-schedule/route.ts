import { NextResponse } from "next/server";
import schedule from "../../../workers/social-scheduler/schedule.json";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json(schedule, {
    status: 200,
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
    },
  });
}
