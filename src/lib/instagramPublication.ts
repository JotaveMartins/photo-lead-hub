/** Use a real permalink only; a Graph media ID is not an Instagram shortcode. */
export const safeInstagramPermalink = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["instagram.com", "www.instagram.com"].includes(url.hostname) &&
      /^\/(p|reel|tv)\/[A-Za-z0-9_-]+\/?$/.test(url.pathname)
      ? url.origin + url.pathname : null;
  } catch { return null; }
};
