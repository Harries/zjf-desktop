# zjf.ai Desktop 内测包构建说明

环境要求：

- Node.js 22。
- pnpm 9。
- Rust stable toolchain。
- macOS 构建 DMG 需要在 macOS 上执行。
- Windows 构建 NSIS 安装包需要在 Windows 上执行。

构建命令：

```bash
export PATH=/Users/liuhaihua/.nvm/versions/node/v22.12.0/bin:$PATH
pnpm install
pnpm tauri build
```

按平台构建安装包：

```bash
# macOS
pnpm tauri build --bundles dmg

# Windows
pnpm tauri build --bundles nsis
```

如果依赖下载失败：

```bash
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890
pnpm install
pnpm tauri build
```

输出位置：

- `.app`：`src-tauri/target/release/bundle/macos/zjf.ai Desktop.app`
- `.dmg`：`src-tauri/target/release/bundle/dmg/*.dmg`
- Windows 安装包：`src-tauri/target/release/bundle/nsis/*.exe`

安装与运行：

- 打开 DMG 后将 `zjf.ai Desktop.app` 拖入 Applications。
- 首次启动输入 zjf.ai API Token。
- 如 macOS Gatekeeper 阻止启动，在系统设置中允许打开该应用。

当前构建配置：

- 应用名：`zjf.ai Desktop`
- Bundle Identifier：`ai.zjf.desktop`
- macOS 最低版本：`10.13`
- Bundle 目标：`app`
- 图标源：`src-tauri/icons/icon-source.png`

GitHub Actions：

- 仅在推送 tag 时触发。
- macOS runner 执行 `pnpm tauri build --bundles dmg`。
- Windows runner 执行 `pnpm tauri build --bundles nsis`。
- 产物会上传到同名 GitHub Release。
