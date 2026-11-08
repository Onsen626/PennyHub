# Issue #4：Target List、API Specification 与 Instruction File

## 实施范围

本次修改将黑盒 Web App Pentest 的输入从单纯 URL 扩展为目标列表文件、OpenAPI/Swagger 规范、Postman Collection 和指令输入。PennyAgent 服务端先验证和整理输入，Strix worker 再使用独立运行目录中的副本执行。

## 输入处理

- 目标列表文件通过受保护上传接口保存，服务端逐行读取，忽略空行和 `#` 注释，并规范化域名、IP、端口和路径。
- OpenAPI 3、Swagger 2 和 Postman Collection 文件通过 `js-yaml` 或 JSON 解析，提取格式、标题、Base URL、操作数量、参数数量、请求体数量和认证要求。
- `postman://<collection-uuid>?env=<environment-uuid>` 由服务端验证地址格式；执行时将 `POSTMAN_API_KEY` 注入 Strix worker 环境，密钥保存在加密访问记录中。
- API 规范没有 Base URL 时，服务端要求同时提交实际 HTTP 或 HTTPS API 地址。
- Custom Instructions 与 Instruction File 由服务端执行二选一校验。指令文件在执行目录中复制后读取，原始上传文件保持不变。

## Strix 运行边界

worker 将目标列表、API 规范和指令文件复制到任务运行目录，使用规范化后的任务输入调用 Strix 的目标解析、API 规范暂存和运行入口。原始上传文件不会被 worker 修改。访问凭据、Custom Instructions 和 Postman API Key 继续使用加密访问记录，并沿用日志及事件脱敏逻辑。

## 验证记录

- `npm run typecheck`：通过。
- `npm run test:pentests`：5 项通过。
- `npm run test:ui`：1 项通过。
- `npm run build`：通过。
- `npm run lint`：0 个错误，保留 2 个既有警告。
- 新增接口测试覆盖目标列表、OpenAPI YAML、在线 Postman Collection、Instruction File 和缺失 Postman API Key 错误。
