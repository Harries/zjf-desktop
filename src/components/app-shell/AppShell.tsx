import { getVersion } from "@tauri-apps/api/app";
import { useEffect, useState, type ReactNode } from "react";

type NavKey = "gallery" | "uploads" | "settings";

type AppShellProps = {
  active: NavKey;
  tokenLabel?: string;
  children: ReactNode;
  toolbar?: ReactNode;
  onNavigate?: (key: NavKey) => void;
};

const navItems: Array<{ key: NavKey; label: string; icon: string }> = [
  { key: "gallery", label: "图库", icon: "□" },
  { key: "uploads", label: "上传队列", icon: "↑" },
  { key: "settings", label: "设置", icon: "⌘" },
];

export function AppShell({
  active,
  tokenLabel = "未配置",
  toolbar,
  children,
  onNavigate,
}: AppShellProps) {
  const [appVersion, setAppVersion] = useState<string>();

  useEffect(() => {
    let disposed = false;

    getVersion()
      .then((version) => {
        if (!disposed) setAppVersion(version);
      })
      .catch(() => {
        if (!disposed) setAppVersion("1.0.8");
      });

    return () => {
      disposed = true;
    };
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">
            <span className="brand-mark">Z</span>
            <span>ZJF Desktop</span>
          </div>

          <p className="nav-label">管理</p>
          <nav className="nav-list" aria-label="主导航">
            {navItems.map((item) => (
              <button
                className={`nav-item ${active === item.key ? "active" : ""}`}
                key={item.key}
                onClick={() => onNavigate?.(item.key)}
                type="button"
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="token-card">
            <strong>Token 状态</strong>
            <span>{tokenLabel}</span>
          </div>
        </div>

        <div className="version-card" aria-label="客户端版本">
          <span>版本</span>
          <strong>{appVersion ? `v${appVersion}` : "读取中"}</strong>
        </div>
      </aside>

      <section className="shell-main">
        {toolbar ? <div className="toolbar">{toolbar}</div> : null}
        {children}
      </section>
    </div>
  );
}
