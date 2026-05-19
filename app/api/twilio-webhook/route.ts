import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const params = new URLSearchParams(body);
  const from = params.get("From") ?? "";
  const messageBody = (params.get("Body") ?? "").trim().toUpperCase();

  if (!from) {
    return new NextResponse("<?xml version='1.0' encoding='UTF-8'?><Response/>", {
      headers: { "Content-Type": "text/xml" },
    });
  }

  const supabase = createClient();

  // Find the most recent upcoming appointment for this phone number
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
