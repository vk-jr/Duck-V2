"use server";

import { createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

export async function updateProfile(
  userId: string,
  fullName: string
): Promise<ActionResult> {
  if (!fullName.trim()) {
    return { success: false, error: "Name cannot be empty" };
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName.trim() })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
