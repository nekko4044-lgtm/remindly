import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);

  // Validate the request actually came from Twilio
  const sig = req.headers.get("x-twilio-signature") ?? "";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "";
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const webhookUrl = `${proto}://${host}/api/twilio-webhook`;

  const paramsObj: Record<string, string> = {};
  params.forEach((value, key) => { paramsObj[key] = value; });

  const { validateRequest } = await import("twilio");
  const isValid = validateRequest(
    process.env.TWILIO_AUTH_TOKEN!,
    sig,
    webhookUrl,
    paramsObj
  );

  if (!isValid) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const from = params.get("From") ?? "";
  const messageBody = (params.get("Body") ?? "").trim().toUpperCase();

  if (!from) {
    return twimlResponse("");
  }

  // Use service role key so queries work regardless of RLS auth context
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: clients } = await supabase
    .from("clients")
    .select("id")
    .eq("phone", from);

  if (!clients || clients.length === 0) {
    return twimlResponse("Sorry, we couldn't find your appointment.");
  }

  const clientIds = clients.map((c) => c.id);
  const now = new Date().toISOString();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, status, service_name, scheduled_at")
    .in("client_id", clientIds)
    .in("status", ["scheduled", "confirmed"])
    .gte("scheduled_at", now)
    .order("scheduled_at")
    .limit(1);

  const apt = appointments?.[0];
  if (!apt) {
    return twimlResponse("No upcoming appointments found.");
  }

  if (messageBody === "YES") {
    await supabase
      .from("appointments")
      .update({ status: "confirmed" })
      .eq("id", apt.id);
    const time = new Date(apt.scheduled_at).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    return twimlResponse(
      `Confirmed! See you for your ${apt.service_name} on ${time}.`
    );
  }

  if (messageBody === "NO") {
    await supabase
      .from("appointments")
      .update({ status: "cancelled" })
      .eq("id", apt.id);
    return twimlResponse(
      `Your ${apt.service_name} appointment has been cancelled. Contact us to reschedule.`
    );
  }

  return twimlResponse(
    "Reply YES to confirm or NO to cancel your appointment."
  );
}

function twimlResponse(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`;
  return new NextResponse(xml, {
    headers: { "Content-Type": "text/xml" },
  });
}
