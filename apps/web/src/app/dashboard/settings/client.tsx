"use client";

import { useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { updateProfile } from "./actions";
import type { Profile } from "@/types";

export function SettingsClient({
  profile,
  userId,
}: {
  profile: Profile | null;
  userId: string;
}) {
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await updateProfile(userId, fullName);
      if (result.success) {
        setMessage({ type: "success", text: "Profile updated successfully" });
      } else {
        setMessage({ type: "error", text: result.error ?? "Update failed" });
      }
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Full name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Email"
            value={profile?.email ?? ""}
            disabled
            hint="Email cannot be changed"
          />

          {message && (
            <p
              className={`rounded-lg border px-3 py-2 text-sm ${
                message.type === "success"
                  ? "border-green-500/20 bg-green-500/10 text-green-500"
                  : "border-red-500/20 bg-red-500/10 text-red-500"
              }`}
            >
              {message.text}
            </p>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
