"use client";

import { getIcon } from "@/lib/icons";

export default function MediaLibraryPage() {
  const Icon = getIcon("Image");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10">
        <Icon className="h-8 w-8 text-accent" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Media Library</h1>
      <p className="text-text-secondary text-center max-w-md">
        This module is coming soon. It will be built in a later phase.
      </p>
    </div>
  );
}
