"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function ProfileSettingsForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name);
  const [bio, setBio] = useState(profile.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      let nextAvatarUrl = avatarUrl;

      if (file) {
        if (!file.type.startsWith("image/")) {
          setError("Choose an image file.");
          return;
        }

        const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
        const path = `${profile.id}/${Date.now()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (uploadError) {
          setError(uploadError.message);
          return;
        }

        const { data } = supabase.storage.from("avatars").getPublicUrl(path);
        nextAvatarUrl = data.publicUrl;
        setAvatarUrl(nextAvatarUrl);
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || profile.display_name,
          bio: bio.trim() || null,
          avatar_url: nextAvatarUrl || null,
        })
        .eq("id", profile.id);

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage("Profile updated.");
      router.refresh();
    });
  }

  return (
    <form className="card space-y-4 p-5" onSubmit={saveProfile}>
      <div className="flex items-center gap-4">
        <Avatar name={displayName || profile.display_name} src={avatarUrl} size={64} />
        <label className="btn-secondary cursor-pointer">
          Upload photo
          <input
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            type="file"
          />
        </label>
      </div>

      <label>
        <span className="label">Display name</span>
        <input
          className="input mt-1"
          maxLength={80}
          onChange={(event) => setDisplayName(event.target.value)}
          value={displayName}
        />
      </label>

      <label>
        <span className="label">Bio / descriptor</span>
        <textarea
          className="input mt-1 min-h-28 resize-none leading-6"
          maxLength={180}
          onChange={(event) => setBio(event.target.value)}
          placeholder="King of Jamaica NY. Send a challenge if you disagree."
          value={bio}
        />
      </label>

      {file ? <p className="text-xs font-semibold text-slate-500">Selected: {file.name}</p> : null}
      {message ? <p className="text-sm font-bold text-emerald-600">{message}</p> : null}
      {error ? <p className="text-sm font-bold text-red-500">{error}</p> : null}

      <button className="btn-primary w-full" disabled={isPending} type="submit">
        {isPending ? "Saving..." : "Save profile"}
      </button>
    </form>
  );
}
