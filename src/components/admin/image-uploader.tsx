import { useRef, useState } from "react";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function ImageUploader({
  bucket = "salons",
  value,
  onChange,
  label = "Image",
  aspect = "aspect-video",
}: {
  bucket?: "salons" | "avatars";
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  aspect?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (error) throw error;
      const { data, error: signErr } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      if (signErr || !data) throw signErr ?? new Error("Could not sign URL");
      onChange(data.signedUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="mb-1 block text-sm font-medium">{label}</label>
      <div className={`relative overflow-hidden rounded-md border bg-muted ${aspect}`}>
        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 rounded-full bg-background/80 p-1 shadow"
              aria-label="Remove image"
            >
              <X className="h-3 w-3" />
            </button>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 w-full"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Upload className="mr-2 h-3 w-3" />}
        {value ? "Replace image" : "Upload image"}
      </Button>
    </div>
  );
}