import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const { appointmentId } = await req.json();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: apt } = await supabase
    .from("appointments")
    .select("*, client:clients(name, phone), user:users(business_name)")
    .eq("id", appointmentId)
    .single();

  if (!apt?.client?.phone) {
    return NextResponse.json({ error: "No phone" }, { status: 400 });
  }

  const formatted = new Date(apt.scheduled_at).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });

  const twilio = (await import("twilio")).default;
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const businessName = apt.user?.business_name || "Your provider";

  await twilioClient.messages.create({
    from: process.env.TWILIO_PHONE_NUMBER,
    to: apt.client.phone,
    body: `Hi ${apt.client.name}! Your ${apt.service_name} appointment at ${businessName} is confirmed for ${formatted}. Reply YES to confirm or NO to cancel.`,
  });

  return NextResponse.json({ ok: true });
}
