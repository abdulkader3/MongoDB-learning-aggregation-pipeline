"use client";

import { useCallback, useRef, useState } from "react";
import { ImagePlus, Trash2, User } from "lucide-react";
import { fileToAvatarDataUrl, useProfile } from "@/lib/stores/profile";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function SettingsForm({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile);
  const save = useProfile((s) => s.save);
  const [name, setName] = useState(profile.name);
  const [avatar, setAvatar] = useState<string | null>(profile.avatar);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File | null | undefined) => {
    if (!file) return;
    try {
      setBusy(true);
      const dataUrl = await fileToAvatarDataUrl(file);
      setAvatar(dataUrl);
    } catch (err) {
      toast.error("Could not use this image", {
        description: err instanceof Error ? err.message : "Please pick a different file.",
      });
    } finally {
      setBusy(false);
    }
  }, []);

  const handleSave = () => {
    save({ name: name.trim(), avatar });
    onClose();
    toast.success("Profile saved");
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Profile</DialogTitle>
        <DialogDescription>
          Your profile is stored locally on this device. Nothing is uploaded.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="group relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-muted/40 transition-colors hover:bg-muted/60 disabled:opacity-60"
            aria-label="Choose profile image"
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element -- local data URL avatar, next/image does not apply
              <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground/60" />
            )}
            <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <ImagePlus className="h-5 w-5 text-white" />
            </span>
          </button>

          <div className="flex flex-col gap-2 pt-1">
            <p className="text-xs text-muted-foreground">Profile image</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
                disabled={busy}
              >
                {busy ? "Processing…" : "Choose image"}
              </Button>
              {avatar && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setAvatar(null)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="profile-name">Name</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={60}
          />
        </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      <DialogFooter>
        <Button type="button" size="sm" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={busy}>
          Save
        </Button>
      </DialogFooter>
    </>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <DialogContent className="max-w-sm">
          <SettingsForm onClose={() => onOpenChange(false)} />
        </DialogContent>
      )}
    </Dialog>
  );
}
