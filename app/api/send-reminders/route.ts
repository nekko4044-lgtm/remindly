import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  console.log('1. CRON STARTED');

  const auth = req.headers.get("authorization");
  const secret = auth?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  console.log('2. AUTH PASSED');

  const supabase = createClient();
  const now = new Date();

  // Wide windows cover all US timezones (UTC-5 to UTC-8) since appointments
  // are stored in local time without timezone info. Duplicate-send protection
  // comes from the reminder_24h_sent / reminder_2h_sent flags.
  const window24hStart = new Date(now.getTime() + 20 * 60 * 60 * 1000);
  const window24hEnd = new Date(now.getTime() + 28 * 60 * 60 * 1000);

  const window2hStart = new Date(now.getTime() + 0.5 * 60 * 60 * 1000);
  const window2hEnd = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);

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
  console.log('3. APPOINTMENTS FOUND 24h:', due24h?.length, JSON.stringify(due24h));
  console.log('3. APPOINTMENTS FOUND 2h:', due2h?.length, JSON.stringify(due2h));
  if (!due24h?.length && !due2h?.length) {
    console.log('4. NO APPOINTMENTS - window 24h:', window24hStart.toISOString(), window24hEnd.toISOString(), '| window 2h:', window2hStart.toISOString(), window2hEnd.toISOString());
  }

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
      console.log('5. SENDING SMS to:', phone);
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

  return NextResponse.json({
    ok: true,
    ...results,
    debug: {
      now: now.toISOString(),
      window24hStart: window24hStart.toISOString(),
      window24hEnd: window24hEnd.toISOString(),
      appointments24h: due24h?.length ?? 0,
      appointments2h: due2h?.length ?? 0,
      raw24h: due24h,
      raw2h: due2h,
    },
  });
}
