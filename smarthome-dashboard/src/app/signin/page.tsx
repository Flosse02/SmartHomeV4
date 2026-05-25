'use client';

import { signIn, useSession } from "next-auth/react";
import { useEffect } from "react";

export default function SignInPage() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (!(status === "loading") && !session) {
      void signIn("google", { callbackUrl: "/signin" });
    }
    if (session) {
      // Send message to parent window before closing
      if (window.opener) {
        window.opener.postMessage('nextauth:success', window.location.origin);
      }
      window.close();
    }
  }, [session, status]);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "absolute",
        left: 0,
        top: 0,
        background: "var(--bg-base)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontFamily: "monospace",
        color: "var(--text-primary)",
      }}
    >
      {status === "loading" ? "Loading..." : "Redirecting to Google..."}
    </div>
  );
}