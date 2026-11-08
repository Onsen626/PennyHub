# Issue #24：仓库内置 Strix 执行来源

## 已完成内容

- 将黑盒 Web App Pentest 所需的 Strix Python 执行来源放入 `third_party/strix/`。
- 固定 Strix 提交：`06015506625a78b981ae0b34be40239fc1b389be`。
- 固定依赖锁文件及哈希：`e82b68f2d9ff70695843e43ce932b8c4ecb90551e1b0c2fff4b82d45248af36d`。
- 保留 Apache-2.0 许可证和上游项目说明。
- 移除终端界面源码、终端入口和前端开发源码，保留扫描执行所需的 Python 模块、技能和报告资源。
- 默认从 `third_party/strix` 读取执行来源。
- 仍支持 `PENNY_STRIX_SOURCE` 与 `PENNY_STRIX_PYTHON` 作为本地开发覆盖项。
- 外部 Git 来源使用提交和工作区检查；仓库内置来源使用 `STRIX_COMMIT` 标记检查。

## 安装与检查

```sh
npm run setup:strix
npm run check:strix
```

安装命令使用 `uv sync --frozen`，并设置 `UV_LINK_MODE=copy`，避免跨磁盘硬链接失败。运行检查会确认提交、锁文件、已安装依赖版本、Python 依赖指纹和 Docker 镜像。

## PennyAgent 与 Strix 边界

PennyAgent 管理账户、任务记录、加密访问资料、任务状态、事件、结果和原生产物。Strix 负责目标解析、Agent 协作、工具执行、扫描流程、发现记录和原生报告状态。后台适配器继续使用单个 JSON 输入和现有任务生命周期接口。

## 验证结果

- `npm run setup:strix`：本地冻结依赖安装成功。
- `npm run check:strix`：固定提交、锁文件哈希、116 个依赖和 Docker 镜像检查成功。
- `npm run typecheck`：通过。
- `npm run lint`：通过，保留项目原有 2 条警告。
- `npm run test:pentests`：4 项通过。
- `npm run build`：通过。
