import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import DashboardSidebar from "@/components/dashboard-sidebar";

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
    <div className="flex min-h-screen bg-[#111111]">
      <DashboardSidebar
        email={profile?.email ?? user.email ?? ""}
        businessName={profile?.business_name ?? "My Business"}
      />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
