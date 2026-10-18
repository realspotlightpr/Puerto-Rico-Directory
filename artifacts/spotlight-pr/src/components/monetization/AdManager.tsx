import { useEffect, useState } from "react";

const CONSENT_KEY = "spotlight-ad-consent-v1";
const PREFERENCES_EVENT = "spotlight:open-ad-preferences";

type Consent = "accepted" | "declined" | null;

const adsterraUnits = {
  mobile: {
    key: "bd755d57a286d516f8c02830ce1af57c",
    width: 320,
    height: 50,
  },
  tablet: {
    key: "62e8d859649c0fd02ff19c1e465dc0fa",
    width: 300,
    height: 250,
  },
  desktop: {
    key: "efe89a0b7eac959e07b2bc640919a485",
    width: 728,
    height: 90,
  },
} as const;

function loadAdSense() {
  if (document.querySelector('script[data-spotlight-adsense="true"]')) return;

  const script = document.createElement("script");
  script.async = true;
  script.crossOrigin = "anonymous";
  script.dataset.spotlightAdsense = "true";
  script.src =
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3103663019302736";
  document.head.appendChild(script);
}

function AdsterraFrame({
  unit,
}: {
  unit: (typeof adsterraUnits)[keyof typeof adsterraUnits];
}) {
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;overflow:hidden;background:transparent}</style></head><body><script>atOptions={key:'${unit.key}',format:'iframe',height:${unit.height},width:${unit.width},params:{}};<\/script><script src="https://www.highperformanceformat.com/${unit.key}/invoke.js"><\/script></body></html>`;

  return (
    <iframe
      title="Advertisement"
      srcDoc={srcDoc}
      width={unit.width}
      height={unit.height}
      scrolling="no"
      loading="lazy"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      className="border-0 max-w-full"
    />
  );
}

function AdPlacement() {
  return (
    <aside
      className="mx-auto w-full max-w-5xl px-4 py-5"
      aria-label="Sponsored advertisement"
    >
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        Advertisement
      </p>
      <div className="flex min-h-[50px] items-center justify-center overflow-hidden">
        <div className="block sm:hidden">
          <AdsterraFrame unit={adsterraUnits.mobile} />
        </div>
        <div className="hidden sm:block lg:hidden">
          <AdsterraFrame unit={adsterraUnits.tablet} />
        </div>
        <div className="hidden lg:block">
          <AdsterraFrame unit={adsterraUnits.desktop} />
        </div>
      </div>
    </aside>
  );
}

export function AdManager() {
  const [consent, setConsent] = useState<Consent>(() => {
    const stored = window.localStorage.getItem(CONSENT_KEY);
    return stored === "accepted" || stored === "declined" ? stored : null;
  });

  useEffect(() => {
    const openPreferences = () => setConsent(null);
    window.addEventListener(PREFERENCES_EVENT, openPreferences);
    return () => window.removeEventListener(PREFERENCES_EVENT, openPreferences);
  }, []);

  useEffect(() => {
    if (consent === "accepted") loadAdSense();
  }, [consent]);

  const saveConsent = (choice: Exclude<Consent, null>) => {
    window.localStorage.setItem(CONSENT_KEY, choice);
    setConsent(choice);
  };

  return (
    <>
      {consent === "accepted" && <AdPlacement />}
      {consent === null && (
        <section
          className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-3xl rounded-2xl border border-border bg-white/95 p-4 shadow-2xl backdrop-blur md:flex md:items-center md:gap-5 md:p-5"
          aria-label="Advertising preferences"
          role="dialog"
        >
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-base font-bold text-foreground">
              Support local discovery
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              With your permission, advertising partners may use cookies or similar technology to show and measure ads. You can decline and keep browsing.
            </p>
          </div>
          <div className="mt-4 flex shrink-0 gap-2 md:mt-0">
            <button
              type="button"
              onClick={() => saveConsent("declined")}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => saveConsent("accepted")}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              Allow ads
            </button>
          </div>
        </section>
      )}
    </>
  );
}

export function openAdPreferences() {
  window.dispatchEvent(new Event(PREFERENCES_EVENT));
}
