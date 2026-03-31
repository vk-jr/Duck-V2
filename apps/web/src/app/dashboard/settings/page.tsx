import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsClient } from "./client";

export default async function SettingsPage() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Settings</h1>
      <p className="text-sm text-[var(--text-muted)] mb-8">Manage your profile</p>
      <SettingsClient profile={profile} userId={user.id} />
    </div>
  );
}
