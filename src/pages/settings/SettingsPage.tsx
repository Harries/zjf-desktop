import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearThumbnailCache,
  clearToken,
  getAppSettings,
  getTokenStatus,
  saveAppSettings,
  validateToken,
} from "../../api/desktop-commands";
import { navigateTo, routes } from "../../app/routes";
import { ErrorState } from "../../components/error-state";
import { defaultAppSettings } from "../../stores/app-settings-store";
import type { AppSettings, CopyFormat } from "../../types/settings";
import { toUserErrorMessage } from "../../utils/user-error";

const copyFormats: Array<{ value: CopyFormat; label: string }> = [
  { value: "url", label: "URL" },
  { value: "markdown", label: "Markdown" },
  { value: "html", label: "HTML" },
];

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string>();
  const [errorNotice, setErrorNotice] = useState<string>();
  const [nextToken, setNextToken] = useState("");
  const [showClearTokenConfirm, setShowClearTokenConfirm] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: getAppSettings,
  });

  const tokenQuery = useQuery({
    queryKey: ["tokenStatus"],
    queryFn: getTokenStatus,
  });

  const settings = settingsQuery.data ?? defaultAppSettings;

  const saveMutation = useMutation({
    mutationFn: saveAppSettings,
    onSuccess: (savedSettings) => {
      queryClient.setQueryData(["settings"], savedSettings);
      setErrorNotice(undefined);
      setNotice("设置已保存");
    },
    onError: (error) => {
      setNotice(undefined);
      setErrorNotice(toUserErrorMessage(error, "设置保存失败，请稍后重试。"));
    },
  });

  const clearCacheMutation = useMutation({
    mutationFn: clearThumbnailCache,
    onSuccess: () => {
      setErrorNotice(undefined);
      setNotice("缩略图缓存已清理");
    },
    onError: (error) => {
      setNotice(undefined);
      setErrorNotice(toUserErrorMessage(error, "缓存清理失败，请稍后重试。"));
    },
  });

  const tokenMutation = useMutation({
    mutationFn: validateToken,
    onSuccess: (status) => {
      setShowClearTokenConfirm(false);
      queryClient.setQueryData(["tokenStatus"], status);
      void queryClient.invalidateQueries({ queryKey: ["images"] });
      setNextToken("");
      setErrorNotice(undefined);
      setNotice("Token 已更新，图片列表会使用新 Token 刷新。");
    },
    onError: (error) => {
      setNotice(undefined);
      setErrorNotice(toUserErrorMessage(error, "Token 验证失败，请稍后重试。"));
    },
  });

  const clearTokenMutation = useMutation({
    mutationFn: clearToken,
    onSuccess: (status) => {
      queryClient.setQueryData(["tokenStatus"], status);
      void queryClient.removeQueries({ queryKey: ["images"] });
      void queryClient.removeQueries({ queryKey: ["image"] });
      navigateTo(routes.setup);
    },
    onError: (error) => {
      setNotice(undefined);
      setErrorNotice(toUserErrorMessage(error, "Token 清除失败，请稍后重试。"));
    },
  });

  const isSaving =
    saveMutation.isPending ||
    clearCacheMutation.isPending ||
    tokenMutation.isPending ||
    clearTokenMutation.isPending;
  const updateSettings = (nextSettings: AppSettings) => {
    setNotice(undefined);
    setErrorNotice(undefined);
    queryClient.setQueryData(["settings"], nextSettings);
    saveMutation.mutate(nextSettings);
  };

  const statusText = useMemo(() => {
    if (settingsQuery.isLoading) return "加载设置中";
    if (isSaving) return "保存中";
    return "已同步到本机";
  }, [isSaving, settingsQuery.isLoading]);

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">设置</p>
          <h1>偏好配置</h1>
          <p className="intro">管理默认复制格式、上传后自动复制和缩略图缓存。</p>
        </div>
        <div className="settings-status">{statusText}</div>
      </header>

      {notice ? <div className="notice ok">{notice}</div> : null}
      {errorNotice ? (
        <ErrorState
          error={errorNotice}
          fallbackMessage="设置操作失败，请稍后重试。"
          variant="notice"
        />
      ) : null}

      <section className="settings-list">
        <article className="settings-row token-settings-row">
          <div>
            <h2>Token 管理</h2>
            <p>{tokenQuery.data?.maskedToken ?? "未配置 Token"}</p>
          </div>
          <div className="token-manage">
            <input
              className="text-input"
              onChange={(event) => setNextToken(event.target.value)}
              placeholder="输入新的 zjf.ai Token"
              type="password"
              value={nextToken}
            />
            <button
              className="primary-button"
              disabled={tokenMutation.isPending || nextToken.trim().length === 0}
              onClick={() => tokenMutation.mutate(nextToken.trim())}
              type="button"
            >
              {tokenMutation.isPending ? "验证中" : "更换"}
            </button>
            <button
              className="danger-button"
              disabled={clearTokenMutation.isPending || !tokenQuery.data?.hasToken}
              onClick={() => setShowClearTokenConfirm(true)}
              type="button"
            >
              清除
            </button>
          </div>
        </article>

        <article className="settings-row">
          <div>
            <h2>默认复制格式</h2>
            <p>上传成功后自动复制时使用这个格式。</p>
          </div>
          <div className="segmented settings-segmented">
            {copyFormats.map((format) => (
              <button
                className={settings.defaultCopyFormat === format.value ? "active" : ""}
                disabled={settingsQuery.isLoading}
                key={format.value}
                onClick={() =>
                  updateSettings({
                    ...settings,
                    defaultCopyFormat: format.value,
                  })
                }
                type="button"
              >
                {format.label}
              </button>
            ))}
          </div>
        </article>

        <article className="settings-row">
          <div>
            <h2>上传后自动复制</h2>
            <p>上传成功后把图片链接写入剪贴板。</p>
          </div>
          <label className="switch-control">
            <input
              checked={settings.autoCopyAfterUpload}
              disabled={settingsQuery.isLoading}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  autoCopyAfterUpload: event.target.checked,
                })
              }
              type="checkbox"
            />
            <span />
          </label>
        </article>

        <article className="settings-row">
          <div>
            <h2>缩略图缓存</h2>
            <p>保留缩略图缓存可以提升图库滚动和预览速度。</p>
          </div>
          <label className="switch-control">
            <input
              checked={settings.thumbnailCacheEnabled}
              disabled={settingsQuery.isLoading}
              onChange={(event) =>
                updateSettings({
                  ...settings,
                  thumbnailCacheEnabled: event.target.checked,
                })
              }
              type="checkbox"
            />
            <span />
          </label>
        </article>

        <article className="settings-row">
          <div>
            <h2>清理缓存</h2>
            <p>移除本机缩略图缓存，不影响 zjf.ai 上的远端图片。</p>
          </div>
          <button
            className="secondary-button"
            disabled={clearCacheMutation.isPending}
            onClick={() => clearCacheMutation.mutate()}
            type="button"
          >
            {clearCacheMutation.isPending ? "清理中" : "清理缓存"}
          </button>
        </article>
      </section>

      {showClearTokenConfirm ? (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-dialog" aria-modal="true" role="dialog">
            <p className="eyebrow">清除 Token</p>
            <h2>确认清除当前 Token？</h2>
            <p>清除后将无法继续读取或上传图片，需要重新配置 Token 才能使用客户端。</p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setShowClearTokenConfirm(false)}
                type="button"
              >
                取消
              </button>
              <button
                className="danger-button"
                disabled={clearTokenMutation.isPending}
                onClick={() => clearTokenMutation.mutate()}
                type="button"
              >
                {clearTokenMutation.isPending ? "清除中" : "确认清除"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
