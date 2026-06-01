# zjf.ai Desktop

zjf.ai Desktop 是 zjf.ai 图床的桌面客户端。用户配置自己的 zjf.ai API Token 后，可以在桌面端完成图片上传、浏览、搜索、复制链接、删除和基础偏好管理。

## 功能

- Token 配置、验证、脱敏展示和清除。
- 图片列表、刷新、本地搜索和详情预览。
- 文件选择上传、拖拽上传、剪贴板粘贴上传。
- 上传队列、失败重试、清除完成任务。
- 复制 URL、Markdown、HTML 图片链接。
- 上传成功后按偏好自动复制链接。
- 删除图片前二次确认，删除后同步本地列表。
- 默认复制格式、自动复制、缩略图缓存等设置项。

## 技术栈

- Tauri 2
- React 19
- TypeScript
- Vite
- TanStack Query
- Zustand
- Rust
- pnpm

## 环境要求

- Node.js 22
- pnpm 9
- Rust stable toolchain
- macOS 本地构建 DMG 需要 macOS
- Windows 安装包需要 Windows runner 或 Windows 本机

## 安装依赖

```bash
pnpm install
```

如果依赖下载失败，可临时配置代理：

```bash
export https_proxy=http://127.0.0.1:7890
export http_proxy=http://127.0.0.1:7890
export all_proxy=socks5://127.0.0.1:7890
pnpm install
```

## 本地开发

```bash
pnpm dev
```

前端开发服务：

```bash
pnpm dev:vite
```

## 质量检查

```bash
pnpm typecheck
pnpm lint
pnpm test
cargo fmt --manifest-path src-tauri/Cargo.toml -- --check
cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets -- -D warnings
cargo test --manifest-path src-tauri/Cargo.toml
```

## 构建

```bash
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

产物位置：

- macOS x64 DMG：`src-tauri/target/x86_64-apple-darwin/release/bundle/dmg/*.dmg`
- macOS arm64 DMG：`src-tauri/target/aarch64-apple-darwin/release/bundle/dmg/*.dmg`
- Windows x64 EXE：`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/nsis/*.exe`
- Windows x64 MSI：`src-tauri/target/x86_64-pc-windows-msvc/release/bundle/msi/*.msi`

## GitHub Actions 发布

`.github/workflows/tag-release.yml` 只在推送 tag 时触发。

```bash
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

触发后会生成：

- 运行前端和 Rust 检查。
- `zjf.ai.Desktop_<version>_arm64.dmg`
- `zjf.ai.Desktop_<version>_x64.dmg`
- `zjf.ai.Desktop_<version>_x64-setup.exe`
- `zjf.ai.Desktop_<version>_x64_en-US.msi`
- 将安装包上传到对应 tag 的 GitHub Release。

## API

当前客户端使用 zjf.ai 公开 API：

- 上传图片：`POST /api/upload`
- 获取图片列表：`GET /api/uploads?pageSize=100`
- 删除图片：`DELETE /api/uploads/:id`

请求使用：

```http
Authorization: Bearer <token>
```

Token 保存在系统安全存储中，不会明文写入项目文件或日志。

## 文档

- [需求整理](docs/requirements.md)
- [技术架构](docs/technical-architecture.md)
- [开发任务](docs/development-tasks.md)
- [手动验收](docs/manual-acceptance.md)
- [内测包构建说明](docs/internal-build.md)

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 常见问题

### GitHub Actions 报 pnpm 版本冲突

不要在 `pnpm/action-setup` 中额外指定版本。项目已经通过 `package.json` 的 `packageManager` 字段固定 pnpm 版本。

### 推送 workflow 被 GitHub 拒绝

如果使用 Personal Access Token 推送 `.github/workflows/*`，Token 需要包含 `workflow` scope。

### 接口返回 Not found

确认图片列表接口使用的是 `GET /api/uploads?pageSize=100`，不是旧的 `/api/images`。
