import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackEvent, trackExitWithBeacon } from "../../services/analyticsService";

function shouldTrack(pathname) {
  return pathname && !pathname.startsWith("/admin");
}

function AnalyticsTracker() {
  const location = useLocation();
  const currentPathRef = useRef("");
  const currentPathStartRef = useRef(0);

  useEffect(() => {
    const path = location.pathname || "/";
    if (!shouldTrack(path)) {
      currentPathRef.current = "";
      currentPathStartRef.current = Date.now();
      return;
    }

    const previousPath = currentPathRef.current;
    const previousStart = currentPathStartRef.current;

    if (previousPath) {
      trackEvent("PAGE_EXIT", previousPath, { durationMs: Date.now() - previousStart });
    }

    trackEvent("PAGE_VIEW", path);
    currentPathRef.current = path;
    currentPathStartRef.current = Date.now();
  }, [location.pathname]);

  useEffect(() => {
    const onBeforeUnload = () => {
      if (!currentPathRef.current) return;
      const durationMs = Date.now() - currentPathStartRef.current;
      trackExitWithBeacon(currentPathRef.current, durationMs);
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && currentPathRef.current) {
        const durationMs = Date.now() - currentPathStartRef.current;
        trackExitWithBeacon(currentPathRef.current, durationMs);
      }
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    import("web-vitals").then((mod) => {
      if (!isMounted) return;
      const reporter = (metric) => {
        const path = window.location.pathname || "/";
        if (!shouldTrack(path)) return;
        const metricName = metric?.name === "FID" ? "INP" : metric?.name;
        if (!["LCP", "INP", "CLS", "TTFB"].includes(metricName)) return;
        trackEvent("WEB_VITAL", path, {
          metadata: {
            metricName,
            value: Number(metric?.value || 0),
          },
        });
      };

      if (typeof mod.getLCP === "function") mod.getLCP(reporter);
      if (typeof mod.getFID === "function") mod.getFID(reporter);
      if (typeof mod.getCLS === "function") mod.getCLS(reporter);
      if (typeof mod.getTTFB === "function") mod.getTTFB(reporter);
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return null;
}

export default AnalyticsTracker;
