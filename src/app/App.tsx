import { useEffect, useState } from "react";

import { getTokenStatus } from "../api/desktop-commands";
import { AppShell } from "../components/app-shell";
import { AlbumsPage } from "../pages/albums";
import { GalleryPage } from "../pages/gallery";
import { ImageDetailPage } from "../pages/image-detail";
import { SettingsPage } from "../pages/settings";
import { TokenSetupPage } from "../pages/token-setup";
import { UploadQueuePage } from "../pages/upload-queue";
import { imageIdFromHash, navigateTo, routeForHash, routes, type AppRoute } from "./routes";

export function App() {
  const [route, setRoute] = useState<AppRoute>(() => routeForHash(window.location.hash));
  const [tokenLabel, setTokenLabel] = useState("检查中...");

  useEffect(() => {
    const onHashChange = () => setRoute(routeForHash(window.location.hash));

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    getTokenStatus()
      .then((status) => {
        setTokenLabel(status.maskedToken ?? "未配置");
        if (status.hasToken && route === routes.setup) {
          navigateTo(routes.gallery);
        }
        if (!status.hasToken) {
          navigateTo(routes.setup);
        }
      })
      .catch(() => {
        setTokenLabel("未配置");
        navigateTo(routes.setup);
      });
  }, [route]);

  if (route === routes.setup) {
    return (
      <TokenSetupPage
        onConfigured={(maskedToken) => {
          setTokenLabel(maskedToken ?? "已配置");
          navigateTo(routes.gallery);
        }}
      />
    );
  }

  const active =
    route === routes.albums
      ? "albums"
      : route === routes.uploads
        ? "uploads"
        : route === routes.settings
          ? "settings"
          : "gallery";

  return (
    <AppShell
      active={active}
      onNavigate={(key) => {
        if (key === "gallery") navigateTo(routes.gallery);
        if (key === "albums") navigateTo(routes.albums);
        if (key === "uploads") navigateTo(routes.uploads);
        if (key === "settings") navigateTo(routes.settings);
      }}
      tokenLabel={tokenLabel}
    >
      {route === routes.albums ? <AlbumsPage /> : null}
      {route === routes.uploads ? <UploadQueuePage /> : null}
      {route === routes.settings ? <SettingsPage /> : null}
      {route === routes.imageDetail ? <ImageDetailPage imageId={imageIdFromHash(window.location.hash)} /> : null}
      {route === routes.gallery ? <GalleryPage /> : null}
    </AppShell>
  );
}
