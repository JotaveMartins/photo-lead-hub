import { useEffect, useState } from "react";

const KEY = "crm-privacy-mode";
const EVENT = "crm-privacy-mode-change";

const read = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const usePrivacyMode = () => {
  const [enabled, setEnabled] = useState<boolean>(read);

  useEffect(() => {
    const sync = () => setEnabled(read());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = () => {
    const next = !read();
    try {
      window.localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
    window.dispatchEvent(new Event(EVENT));
    setEnabled(next);
  };

  return { enabled, toggle };
};

export const maskName = (index: number) => `Cliente ${index + 1}`;
export const maskEmail = () => "••••••@•••";