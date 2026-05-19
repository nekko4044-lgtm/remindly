export interface User {
  id: string;
  email: string;
  business_name: string;
  plan: "trial" | "solo" | "business" | "pro";
  trial_ends_at: string | null;
  stripe_customer_id: string | null;
  timezone: string;
  sms_template_24h: string | null;
  created_at: string;
}

export interface Client {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export interface Appointment {
  id: string;
  user_id: string;
  client_id: string;
  service_name: string;
  scheduled_at: string;
  status: AppointmentStatus;
  reminder_24h_sent: boolean;
  reminder_2h_sent: boolean;
  notes: string | null;
  created_at: string;
  // joined
  client?: Client;
}

export type ReminderType = "sms_24h" | "sms_2h" | "email_confirm";

export interface ReminderLog {
  id: string;
  appointment_id: string;
  type: ReminderType;
  sent_at: string;
  status: "sent" | "failed";
  error_message: string | null;
}
