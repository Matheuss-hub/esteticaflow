"use client";

import { Play } from "lucide-react";

export function TutorialReopenButton() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("reopen-tour"))}
      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
    >
      <Play size={16} aria-hidden="true" />
      Rever o tutorial
    </button>
  );
}
