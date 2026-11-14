import { NextResponse } from "next/server";
import { createBookingRequest } from "@/lib/booking/create";

/** Creates a pending booking + Stripe Checkout session, or an inquiry. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ code: "INVALID_INPUT", error: "Invalid request." }, { status: 400 });
  }

  try {
    const result = await createBookingRequest(body);
    if (!result.ok) {
      return NextResponse.json({ code: result.code, error: result.error }, { status: result.status });
    }
    return NextResponse.json(
      result.type === "checkout"
        ? { type: "checkout", url: result.url, reference: result.reference }
        : { type: "inquiry", reference: result.reference },
    );
  } catch (err) {
    console.error(`[booking] unexpected error: ${err instanceof Error ? err.message : err}`);
    return NextResponse.json(
      { code: "SERVER_ERROR", error: "Something went wrong on our side. You have not been charged — please try again." },
      { status: 500 },
    );
  }
}
