"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient, createServiceClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/types";

const AuthSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function login(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = AuthSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0].message,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    return { success: false, error: "Invalid email or password" };
  }

  redirect("/dashboard");
}

export async function signup(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const parsed = AuthSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0].message,
    };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp(parsed.data);

  if (error) {
    return { success: false, error: error.message };
  }

  if (data.user) {
    // Upsert profile row (trigger handles this, but ensure it exists)
    const service = createServiceClient();
    await service.from("profiles").upsert(
      {
        id: data.user.id,
        email: parsed.data.email,
      },
      { onConflict: "id" }
    );
  }

  redirect("/dashboard");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
