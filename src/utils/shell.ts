export type ShellStatus = "booting" | "loading-frame" | "ready" | "timeout" | "error";

export function isMobileViewport(width: number): boolean {
  return width <= 900;
}

export function isLandscapeViewport(width: number, height: number): boolean {
  return width > height;
}

export function getRequestedGameRoute(search: string): string | null {
  const params = new URLSearchParams(search);
  return params.get("route");
}

export function normalizeGameHash(route: string | null | undefined): string {
  if (!route) {
    return "#/auth";
  }

  const trimmed = decodeURIComponent(route).trim();
  if (!trimmed) {
    return "#/auth";
  }

  if (trimmed.startsWith("#/")) {
    return trimmed;
  }

  if (trimmed.startsWith("#")) {
    return `#/${trimmed.slice(1).replace(/^\/+/, "")}`;
  }

  if (trimmed.startsWith("/")) {
    return `#${trimmed}`;
  }

  return `#/${trimmed.replace(/^\/+/, "")}`;
}

export function buildGameFrameUrl(route: string | null | undefined, reloadSeed = 0): string {
  const hash = normalizeGameHash(route);
  return `./game/index.html?shell=${reloadSeed}${hash}`;
}
