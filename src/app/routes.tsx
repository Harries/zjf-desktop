export const routes = {
  setup: "/setup",
  gallery: "/gallery",
  albums: "/albums",
  imageDetail: "/images/:id",
  uploads: "/uploads",
  settings: "/settings",
} as const;

export type AppRoute = (typeof routes)[keyof typeof routes];

export function routeForHash(hash: string): AppRoute {
  const route = hash.replace(/^#/, "");

  if (route.startsWith("/images/")) {
    return routes.imageDetail;
  }

  if (route === routes.gallery || route === routes.albums || route === routes.uploads || route === routes.settings) {
    return route;
  }

  return routes.setup;
}

export function navigateTo(route: AppRoute) {
  window.location.hash = route;
}

export function navigateToImage(imageId: string) {
  window.location.hash = `/images/${encodeURIComponent(imageId)}`;
}

export function imageIdFromHash(hash: string) {
  const route = hash.replace(/^#/, "");
  const match = route.match(/^\/images\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
