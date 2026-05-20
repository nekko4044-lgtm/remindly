import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardShell from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("business_name, email")
    .eq("id", user.id)
    .single();

  return (
    <DashboardShell
      email={profile?.email ?? user.email ?? ""}
      businessName={profile?.business_name ?? "My Business"}
    >
      {children}
    </DashboardShell>
  );
}
