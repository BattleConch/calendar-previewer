import { createFileRoute } from "@tanstack/react-router";
import { CalendarApp } from "@/components/CalendarApp";
import { GoogleSyncProvider } from "@/lib/google-sync";

function AppScreen() {
  return (
    <GoogleSyncProvider>
      <CalendarApp />
    </GoogleSyncProvider>
  );
}

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Your calendar — Calendry" },
      { name: "description", content: "Your month at a glance, with an agenda a tap away." },
      { property: "og:title", content: "Your calendar — Calendry" },
      { property: "og:description", content: "Your month at a glance, with an agenda a tap away." },
    ],
  }),
  component: AppScreen,
});
