import { useCallback, useEffect, useRef, useState } from "react";

export function usePolling<T>(fn: () => Promise<T>, intervalMs = 3000, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  const inFlight = useRef(false);
  fnRef.current = fn;

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const result = await fnRef.current();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (cancelled) return;
      await refresh();
    };
    void run();
    const timer = window.setInterval(run, intervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, refresh, ...deps]);

  return { data, error, loading, refresh, setData };
}

export function useHashRoute(): [string, (route: string) => void] {
  const [route, setRoute] = useState<string>(() => window.location.hash.replace(/^#\/?/, "") || "overview");
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace(/^#\/?/, "") || "overview");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = useCallback((next: string) => {
    window.location.hash = `/${next}`;
    setRoute(next);
  }, []);
  return [route, navigate];
}

export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}
