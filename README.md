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

## Chat 接口契约（已固化）

### 请求体

```json
{
  "provider": "provider-a",
  "model": "default",
  "timeoutMs": 15000,
  "messages": [
    { "role": "system", "content": "你是助手" },
    { "role": "user", "content": "你好" }
  ]
}
```

字段说明：

1. `provider`：可选，Provider ID。未传默认 `provider-a`，可选 `provider-a` / `provider-b`。
2. `model`：必填，模型标识。
3. `timeoutMs`：可选，超时毫秒数。
4. `messages`：必填，至少一条消息；每条必须包含 `role` 与 `content`。

### 成功响应示例

```json
{
  "provider": "provider-a",
  "model": "default",
  "text": "provider-a echo: 你好",
  "error_code": null
}
```

### 失败响应示例

```json
{
  "provider": "provider-x",
  "model": "default",
  "text": "Unsupported provider: provider-x",
  "error_code": "UNKNOWN"
}
```

说明：

1. 无论 HTTP 200 或 4xx/5xx，响应体结构都固定为 `provider`、`model`、`text`、`error_code`。
2. 失败时 `error_code` 一定非空。

### 错误码重试策略

可重试（建议最多重试 1 次，使用退避）：

1. `TIMEOUT`
2. `RATE_LIMITED`
3. `PAGE_CHANGED`

不可重试（应人工处理或修正请求后再试）：

1. `NOT_LOGGED_IN`
2. `UNKNOWN`

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

该脚本会自动切换当前 PowerShell 会话到 UTF-8，减少中文乱码问题（尤其是系统默认 GBK 时）。

可自定义消息：

```powershell
powershell -ExecutionPolicy Bypass -File scripts/test-chat.ps1 -Message "hello from script"
```

3. 用 TypeScript 客户端联调

```bash
npm run chat:client -- "hello from ts client"
```

## Provider A 真实网页模式验证

### 环境变量

1. `PROVIDER_A_MODE=web`：切换到真实网页模式。
2. `PROVIDER_A_URL`：Provider A 网页地址。
3. `PROVIDER_A_HEADLESS=false`：允许人工接管登录。
4. `PROVIDER_A_STORAGE_STATE_PATH`：可选，登录态持久化路径，默认 `apps/server/data/cookies/provider-a-state.json`。
5. `PROVIDER_A_LOGIN_REQUIRED_SELECTOR`：可选，目标网站的登录态识别选择器。
6. `PROVIDER_A_RESPONSE_LOADING_SELECTOR`：可选，回复生成中的 loading 选择器。
7. `PROVIDER_A_KEEP_ALIVE=true`：可选，复用同一浏览器上下文，避免每次请求后关闭窗口。
8. `PROVIDER_A_KEEP_ALIVE_IDLE_MS=600000`：可选，空闲回收时间（毫秒），默认 10 分钟。

### 最小登录失效处理策略

1. 如果检测到登录页面且 `PROVIDER_A_HEADLESS=false`，会等待人工在浏览器里完成登录。
2. 如果仍无法获得输入框，返回 `error_code=NOT_LOGGED_IN` 并提示人工接管。
3. 只要检测到“已登录且输入框可用”，就会立即保存 storage state（不必等待本次回复成功）。
4. 开启 `PROVIDER_A_KEEP_ALIVE=true` 后，窗口不会在每次请求后立即关闭，空闲达到 `PROVIDER_A_KEEP_ALIVE_IDLE_MS` 后自动回收。

### 长时间在线建议配置

```powershell
$env:PROVIDER_A_MODE="web"
$env:PROVIDER_A_URL="https://www.doubao.com/chat/"
$env:PROVIDER_A_HEADLESS="false"
$env:PROVIDER_A_KEEP_ALIVE="true"
$env:PROVIDER_A_KEEP_ALIVE_IDLE_MS="600000"
```

说明：

1. `KEEP_ALIVE=true` 会复用同一页面，减少每次请求后的窗口关闭。
2. `KEEP_ALIVE_IDLE_MS` 到期会自动回收，避免长期脏状态累积。
3. 若页面异常关闭或上下文失效，内部会自动重建会话。

### 10 次连续请求成功率验证

1. 先启动服务：

```bash
npm run dev
```

2. 在另一个终端运行验证：

```bash
npm run verify:provider-a:web
```

该脚本会连续发起 10 次 `provider-a` 请求并统计成功率；全部成功返回退出码 `0`，否则退出码 `1`。
