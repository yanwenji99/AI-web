# AI-web

一个本地运行的网页 AI 代理工具。

目标是把多个网页版 AI 的调用方式统一成类似 API 的体验：

- 统一请求格式
- 手动切换 Provider/模型
- 本地自动化执行网页交互

## 特性

1. 本地单机运行，不依赖云端网关。
2. 统一接口，屏蔽不同网页 AI 的调用差异。
3. 支持多 Provider 适配器扩展。
4. 基础错误码与重试机制，便于上层调用处理。

## 当前项目结构

```text
AI-web/
  README.md
  开发流程.md
  .gitignore
  package.json
  apps/server/src/
  apps/server/data/
  apps/server/tests/
  scripts/
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务

```bash
npm run dev
```

默认启动地址：`http://127.0.0.1:3000`

### 3. 代码质量检查

```bash
npm run typecheck
npm run lint
```

## 已有路由

1. `POST /chat`
   - 统一聊天调用入口（已接入 provider-a/provider-b 最小可运行实现，默认 echo 模式）。
   - 支持 `provider` 字段选择适配器，未传时默认 `provider-a`。
   - 成功和失败都返回统一结构：`provider`、`model`、`text`、`error_code`。

2. `GET /models`
   - 查询可用 Provider 与模型列表。

## 核心目录说明

1. `apps/server/src/routes`
   - API 路由入口。

2. `apps/server/src/providers`
   - 各 Provider 适配器与选择器。

3. `apps/server/src/browser`
   - Playwright 浏览器实例与流式解析。

4. `apps/server/src/core`
   - 路由注册、会话管理、错误码定义。

5. `apps/server/data`
   - 本地运行时数据（会话、Cookie、日志）。

## 开发建议

1. 先实现 `provider-a/adapter.ts` 的最小链路：打开页面、发送消息、提取结果。
2. Provider 的页面定位统一放在 `selectors.ts`，避免把选择器散落在业务逻辑里。
3. 新增 Provider 时优先复用 `base-provider.ts` 的接口约束。

## 注意事项

1. 本项目为本地工具，不是官方 API。
2. 使用时请遵守目标平台服务条款。

## 上层联调（默认 echo）

1. 启动服务

```bash
npm run dev
```

2. 用 PowerShell 脚本联调

```bash
npm run chat:ping
```

可自定义消息：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-chat.ps1 -Message "hello from script"
```

3. 用 TypeScript 客户端联调

```bash
npm run chat:client -- "hello from ts client"
```
