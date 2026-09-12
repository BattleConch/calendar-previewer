import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/AuthPage";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or sign up — Calendry" },
      { name: "description", content: "Create your Calendry account or sign in to sync events, tasks and notes across devices." },
      { property: "og:title", content: "Sign in or sign up — Calendry" },
      { property: "og:description", content: "Create your Calendry account or sign in to sync events, tasks and notes across devices." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});
