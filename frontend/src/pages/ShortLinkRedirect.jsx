import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { FiLink2 } from "react-icons/fi";
import { API_BASE } from "../utils/apiConfig";

const ALLOWED = ["speshwayhrms.com", "speshway.com"];
const isAllowed = (u) => {
  try {
    const { protocol, hostname } = new URL(u);
    return protocol === "https:" && ALLOWED.some((h) => hostname === h || hostname.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

// Opens /s/:code. Also used at /link-expired (no code) to show the expired state.
const ShortLinkRedirect = () => {
  const { code } = useParams();
  const [state, setState] = useState(code ? "loading" : "expired");

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    axios
      .get(`${API_BASE}/api/links/resolve/${encodeURIComponent(code)}`)
      .then(({ data }) => {
        if (cancelled) return;
        // Defence in depth: the server already restricts targets to our domains.
        if (data?.url && isAllowed(data.url)) window.location.replace(data.url);
        else setState("expired");
      })
      .catch((err) => !cancelled && setState(err.response?.status === 429 ? "busy" : "expired"));
    return () => { cancelled = true; };
  }, [code]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-muted px-4">
      <div className="bg-white border border-surface-subtle rounded-xl shadow-card p-8 max-w-sm w-full text-center" aria-live="polite">
        {state === "loading" ? (
          <>
            <div className="w-10 h-10 mx-auto mb-4 rounded-full border-4 border-surface-subtle border-t-accent-600 animate-spin motion-reduce:animate-none" aria-hidden />
            <p className="text-ink font-medium">Opening your link…</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-surface-muted flex items-center justify-center">
              <FiLink2 className="text-ink-faint" size={26} aria-hidden />
            </div>
            <h1 className="text-lg font-semibold text-ink">
              {state === "busy" ? "Too many requests" : "This link has expired"}
            </h1>
            <p className="text-sm text-ink-muted mt-1">
              {state === "busy"
                ? "Please wait a minute and open the link again."
                : "It may have been disabled or never existed. Ask the person who shared it for a new one."}
            </p>
            <Link to="/" className="inline-flex items-center justify-center min-h-[44px] mt-5 px-4 rounded-lg bg-accent-600 hover:bg-accent-700 text-white font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-600">
              Go to Speshway HRMS
            </Link>
          </>
        )}
      </div>
    </main>
  );
};

export default ShortLinkRedirect;
