import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { clientName, clientEmail, serviceName, scheduledAt } = await req.json();

  if (!clientEmail) {
    return NextResponse.json({ ok: true, skipped: "no email" });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(process.env.RESEND_API_KEY);

  const date = new Date(scheduledAt);
  const formatted = date.toLocaleString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const calStart = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const calEnd = new Date(date.getTime() + 60 * 60 * 1000)
    .toISOString()
    .replace(/[-:]/g, "")
    .split(".")[0] + "Z";
  const calLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(serviceName)}&dates=${calStart}/${calEnd}`;

  const { error } = await resend.emails.send({
    from: "NoShow <hello@noshow.pro>",
    replyTo: "hello@noshow.pro",
    to: clientEmail,
    subject: `Appointment confirmed — ${serviceName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#111111;color:#ffffff;border-radius:12px;">
        <div style="margin-bottom:24px;">
          <span style="font-size:18px;font-weight:700;color:#ffffff;">NoShow</span>
          <span style="display:inline-block;width:6px;height:6px;background:#e8502a;border-radius:50%;margin-left:2px;vertical-align:super;"></span>
        </div>
        <h2 style="margin:0 0 8px;color:#ffffff;">Your appointment is confirmed</h2>
        <p style="color:#888888;margin:0 0 24px;">Hi ${clientName}, here are your appointment details:</p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="padding:10px 0;color:#888888;font-size:14px;border-bottom:1px solid #2a2a2a;">Service</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600;color:#ffffff;border-bottom:1px solid #2a2a2a;">${serviceName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888888;font-size:14px;">Date &amp; Time</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600;color:#ffffff;">${formatted}</td>
          </tr>
        </table>
        <a href="${calLink}" style="display:inline-block;background:#e8502a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600;">
          Add to Google Calendar
        </a>
        <p style="margin-top:24px;font-size:12px;color:#555555;">
          Reply YES to confirm or NO to cancel this appointment.
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("Resend error:", error);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
