"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ImageOff, Image as ImageIcon } from "lucide-react";

/** Per-view Images ON/OFF toggle. Drives both the preview and the export
 * (via the ?images query param), so text-only exports are one click away. */
export function ImagesToggle({ on }: { on: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function set(next: boolean) {
    const sp = new URLSearchParams(params.toString());
    if (next) sp.delete("images");
    else sp.set("images", "off");
    router.replace(`${pathname}?${sp.toString()}`);
  }

  return (
    <button
      type="button"
      onClick={() => set(!on)}
      className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
      title="Include diagrams/images in the preview and exports"
    >
      {on ? <ImageIcon className="size-4" /> : <ImageOff className="size-4" />}
      Images: {on ? "On" : "Off"}
    </button>
  );
}
