import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profile · StockXchange" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  return (
    <ProfileForm
      userId={user.id}
      email={user.email ?? ""}
      initialDisplayName={profile?.display_name ?? ""}
      initialAvatarUrl={profile?.avatar_url ?? null}
      createdAt={profile?.created_at ?? null}
    />
  );
}
