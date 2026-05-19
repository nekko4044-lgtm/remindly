import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = auth?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient();
  const now = new Date();

  const window24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const window2hStart = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
  const window2hEnd = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

  const [{ data: due24h }, { data: due2h }] = await Promise.all([
    supabase
      .from("appointments")
      .select("*, client:clients(name, phone)")
      .eq("reminder_24h_sent", false)
      .in("status", ["scheduled", "confirmed"])
      .gte("scheduled_at", window24hStart.toISOString())
      .lte("scheduled_at", window24hEnd.toISOString()),
    supabase
      .from("appointments")
      .select("*, client:clients(name, phone)")
      .eq("reminder_2h_sent", false)
      .in("status", ["scheduled", "confirmed"])
      .gte("scheduled_at", window2hStart.toISOString())
      .lte("scheduled_at", window2hEnd.toISOString()),
  ]);

  const twilio = (await import("twilio")).default;
  const twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );

  const results = { sent: 0, failed: 0 };

  async function sendSms(
    appointmentId: string,
    phone: string,
    body: string,
    field: "reminder_24h_sent" | "reminder_2h_sent",
    type: "sms_24h" | "sms_2h"
  ) {
    try {
      await twilioClient.messages.create({
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
        body,
      });
      await supabase
        .from("appointments")
        .update({ [field]: true })
        .eq("id", appointmentId);
      await supabase.from("reminder_logs").insert({
        appointment_id: appointmentId,
        type,
        status: "sent",
      });
      results.sent++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await supabase.from("reminder_logs").insert({
        appointment_id: appointmentId,
        type,
        status: "failed",
        error_message: msg,
      });
      results.failed++;
    }
  }

  const tasks: Promise<void>[] = [];

  for (const apt of due24h ?? []) {
    const client = apt.client as { name: string; phone: string } | null;
    if (!client?.phone) continue;
    const time = new Date(apt.scheduled_at).toLocaleString([], {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    tasks.push(
      sendSms(
        apt.id,
        client.phone,
        `Hi ${client.name}! Reminder: your ${apt.service_name} appointment is tomorrow at ${time}. Reply YES to confirm or NO to cancel.`,
        "reminder_24h_sent",
        "sms_24h"
      )
    );
  }

  for (const apt of due2h ?? []) {
    const client = apt.client as { name: string; phone: string } | null;
    if (!client?.phone) continue;
    const time = new Date(apt.scheduled_at).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    tasks.push(
      sendSms(
        apt.id,
        client.phone,
        `Hi ${client.name}! Your ${apt.service_name} appointment is in 2 hours at ${time}. Reply YES to confirm or NO to cancel.`,
        "reminder_2h_sent",
        "sms_2h"
      )
    );
  }

  await Promise.all(tasks);

  return NextResponse.json({ ok: true, ...results });
}
