import { useState } from "react";

import { validateToken } from "../../api/desktop-commands";
import { ErrorState } from "../../components/error-state";

type TokenSetupPageProps = {
  onConfigured: (maskedToken: string | null) => void;
};

export function TokenSetupPage({ onConfigured }: TokenSetupPageProps) {
  const [token, setToken] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [isValidating, setIsValidating] = useState(false);

  async function handleSubmit() {
    if (!token.trim()) {
      setError("请输入 zjf.ai API Token。");
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const status = await validateToken(token);
      onConfigured(status.maskedToken);
    } catch (caught) {
      setError(caught);
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <main className="setup-page">
      <section className="setup-hero">
        <div className="brand">
          <span className="brand-mark">Z</span>
          <span>ZJF Desktop</span>
        </div>
        <h1>连接你的 zjf.ai 图床</h1>
        <p className="intro">
          输入 API Token 后，桌面端会验证权限，并将 Token 保存到系统安全存储。
        </p>
      </section>
      <section className="setup-form">
        <p className="eyebrow">首次配置</p>
        <h1>输入 API Token</h1>
        <div className="form-field">
          <label htmlFor="api-token">API Token</label>
          <input
            className="text-input"
            id="api-token"
            onChange={(event) => setToken(event.target.value)}
            placeholder="zjf_sk_..."
            type="password"
            value={token}
          />
          <span className="form-hint">
            验证通过后会保存到系统安全存储，并自动进入图库。
          </span>
        </div>
        {error ? (
          <ErrorState
            error={error}
            fallbackMessage="Token 验证失败，请稍后重试。"
            variant="notice"
          />
        ) : null}
        <button
          className="primary-button"
          disabled={isValidating}
          onClick={handleSubmit}
          type="button"
        >
          {isValidating ? "验证中..." : "验证并进入图库"}
        </button>
      </section>
    </main>
  );
}
