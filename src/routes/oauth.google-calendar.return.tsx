import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/oauth/google-calendar/return")({
  head: () => ({
    meta: [
      { title: "Connecting Google Calendar — Calendry" },
      { name: "description", content: "Finishing the Google Calendar connection for your Calendry account." },
      { property: "og:title", content: "Connecting Google Calendar — Calendry" },
      { property: "og:description", content: "Finishing the Google Calendar connection for your Calendry account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OAuthReturn,
});

function OAuthReturn() {
  const [message, setMessage] = useState("Finishing the connection…");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const notify = (
      type: "appUserConnectorOAuthComplete" | "appUserConnectorOAuthFailed",
      code?: string,
    ) => {
      window.opener?.postMessage(
        { type, connectorId: "google_calendar", code: code ?? null },
        window.location.origin,
      );
      window.close();
    };

    if (params.get("success") !== "true") {
      setMessage(params.get("error") ?? "Google didn't finish connecting.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    const code = params.get("code");
    if (!code) {
      if (params.get("offline_access_allowed") === "false") {
        notify("appUserConnectorOAuthComplete");
        return;
      }
      setMessage("Google finished, but no connection was returned.");
      notify("appUserConnectorOAuthFailed");
      return;
    }
    notify("appUserConnectorOAuthComplete", code);
  }, []);

  return (
    <main className="grid min-h-dvh place-items-center bg-ivory px-8 text-center">
      <p className="text-[15px] text-clay-soft">{message}</p>
    </main>
  );
}
