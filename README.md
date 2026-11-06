# PennyHub
## 本机 PoC 登录与模型 API

要求：Node.js 24（本次验证版本24.13.1），已安装依赖。

```sh
npm run setup:local
npm run dev
```

初始化默认创建 `admin`，终端仅显示一次随机密码，请妥善保存。不存在默认密码；再次运行初始化不会覆盖原账户。也可在初始化前设置 `PENNY_ADMIN_USERNAME` 和 `PENNY_ADMIN_PASSWORD`，自定密码至少12个字符。

打开终端显示的本机地址，登录后进入 Models，填写 API 基础地址（通常以 `/v1` 结尾）、模型名称和按需填写的 API Key。保存配置后可测试连接。当前支持 OpenAI Chat Completions 兼容接口；测试会产生一次真实HTTP请求，可能产生少量费用。

本期采用本机单管理员模式，启动命令默认监听 `127.0.0.1`。不应直接公开到互联网。账户、12小时会话和加密模型配置保存在 `.pennyagent/`，自定义位置使用 `PENNY_DATA_DIR`。备份或迁移时保留整个目录及 `master.key`，不要提交到Git。

```sh
npm test
npm run typecheck
npm run lint
npm run build
npm start
```

测试使用独立临时数据目录和 `.next-platform-test` 构建目录，不接触实际账户。浏览器测试优先使用本机 Google Chrome；其他机器可设置 `PENNY_CHROME_PATH`，或运行 `npx playwright install chromium`。API与浏览器测试顺序执行，不要同时启动两组测试。

具体接口、存储和验证说明见 [工单#2实现说明](docs/implementation/issue-2-platform.md)。
