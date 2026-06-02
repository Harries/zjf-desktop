# ZJF Desktop 内测包构建说明

环境要求：

- Node.js 22。
- pnpm 9。
- Rust stable toolchain。
- macOS x64 DMG 需要在 Intel macOS runner 或本机上执行。
- macOS arm64 DMG 需要在 Apple Silicon macOS runner 或本机上执行。
- Windows x64 EXE / MSI 安装包需要在 Windows runner 或本机上执行。

构建命令：

```bash
export PATH=/Users/liuhaihua/.nvm/versions/node/v22.12.0/bin:$PATH
pnpm install
pnpm tauri build
```

按平台和架构构建安装包：

```bash
# macOS x64
pnpm tauri build --target x86_64-apple-darwin --bundles dmg

# macOS arm64
pnpm tauri build --target aarch64-apple-darwin --bundles dmg

# Windows x64
pnpm tauri build --target x86_64-pc-windows-msvc --bundles nsis,msi
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

- macOS x64 DMG：`src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg`
- macOS arm64 DMG：`src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg`
- Windows x64 EXE：`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe`
- Windows x64 MSI：`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi`

安装与运行：

- 打开 DMG 后将 `ZJF Desktop.app` 拖入 Applications。
- 首次启动输入 zjf.ai API Token。
- 如 macOS Gatekeeper 阻止启动，在系统设置中允许打开该应用。

当前构建配置：

- 应用名：`ZJF Desktop`
- Bundle Identifier：`ai.zjf.desktop`
- macOS 最低版本：`10.13`
- Bundle 目标：`app`
- 图标源：`src-tauri/icons/icon-source.png`

GitHub Actions：

- 仅在推送 tag 时触发。
- macOS x64 runner 执行 `pnpm tauri build --target x86_64-apple-darwin --bundles dmg`。
- macOS arm64 runner 执行 `pnpm tauri build --target aarch64-apple-darwin --bundles dmg`。
- Windows x64 runner 执行 `pnpm tauri build --target x86_64-pc-windows-msvc --bundles nsis,msi`。
- 产物会上传到同名 GitHub Release。
