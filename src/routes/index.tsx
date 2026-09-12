import { createFileRoute } from "@tanstack/react-router";
import { Splash } from "@/components/Splash";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Calendry — a warm, tactile calendar" },
      { name: "description", content: "An elegant mobile calendar with ivory tones, hairline dividers, and satisfying motion." },
      { property: "og:title", content: "Calendry — a warm, tactile calendar" },
      { property: "og:description", content: "An elegant mobile calendar with ivory tones, hairline dividers, and satisfying motion." },
    ],
  }),
  component: Splash,
});
