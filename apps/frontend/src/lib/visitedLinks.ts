const VISITED_URLS_KEY = "cw:visitedUrls:v1";
const MAX_VISITED_URLS = 500;

const readVisited = (): string[] => {
  try {
    const raw = localStorage.getItem(VISITED_URLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v)).filter(Boolean);
  } catch {
    return [];
  }
};

const writeVisited = (urls: string[]) => {
  try {
    localStorage.setItem(VISITED_URLS_KEY, JSON.stringify(urls.slice(0, MAX_VISITED_URLS)));
  } catch {
    // ignore
  }
};

export const markUrlVisited = (url: string) => {
  if (!url) return;
  try {
    const normalized = String(url).trim();
    if (!normalized) return;

    const current = readVisited();
    const next = [normalized, ...current.filter((u) => u !== normalized)];
    writeVisited(next);

    window.dispatchEvent(new Event("cw:visited-changed"));
  } catch {
    // ignore
  }
};

export const isUrlVisited = (url: string): boolean => {
  if (!url) return false;
  try {
    const normalized = String(url).trim();
    if (!normalized) return false;
    return readVisited().includes(normalized);
  } catch {
    return false;
  }
};
