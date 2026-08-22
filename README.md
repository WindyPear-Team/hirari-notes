# Hirari Notes

Hirari Notes 是一款**本地优先、结构化且可迁移**的 React Native 手机便签应用。你可以设计任意便签格式，以本地数据为主，并选择 WebDAV、SFTP 或可视化 HTTP 流程同步到自己掌控的服务。

## 功能概览

| 模块 | 能力 |
| --- | --- |
| 自定义格式 | 使用文本、数字、密码、日期、开关、单选和多选字段设计结构化便签。 |
| 数据迁移 | 单独导入或导出格式定义，也可导入或导出完整归档；归档不含同步凭据。 |
| 云同步 | 支持 WebDAV、SFTP 和可视化 HTTP 请求/解析/映射流程。 |
| 冲突处理 | 支持字段级三方合并；可选较新版本、本机、远端或保留冲突副本。 |
| 安全 | 同步密码、Token 和 SSH 私钥通过 iOS Keychain / Android Keystore 保存。 |

## 本地开发

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
```

SFTP 功能依赖原生客户端构建；Web 预览仅展示其配置界面。GitHub Actions 工作流会对 Android 和 iOS 执行类型检查、测试及原生预构建验证。

## 许可证

本项目采用 [GNU General Public License v3.0](./LICENSE) 发布。
