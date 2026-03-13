<p align="center">
  <img src="resources/clawfast.png" width="128" height="128" alt="ClawFast Logo" />
</p>

<h1 align="center">ClawFast</h1>

<p align="center">
  <strong>OpenClaw 的桌面管理控制台</strong>
</p>

<p align="center">
  用更清晰、更产品化的方式管理 OpenClaw。
</p>

<p align="center">
  <a href="#项目简介">项目简介</a> ·
  <a href="#界面截图">界面截图</a> ·
  <a href="#核心能力">核心能力</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#打包方式">打包方式</a> ·
  <a href="#目录结构">目录结构</a> ·
  <a href="#后续计划">后续计划</a> ·
  <a href="#联系我们">联系我们</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-4b5563" alt="Platform" />
  <img src="https://img.shields.io/badge/electron-34+-47848F?logo=electron&logoColor=white" alt="Electron" />
  <img src="https://img.shields.io/badge/next.js-14-111111?logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/react-18-61DAFB?logo=react&logoColor=111111" alt="React" />
  <img src="https://img.shields.io/badge/license-MIT-16a34a" alt="License" />
</p>

<p align="center">
  <a href="README.md">English</a> | 简体中文
</p>

---

## 项目简介

**ClawFast** 是围绕 OpenClaw 打造的桌面管理控制台，面向团队和长期运维场景，重点覆盖模型路由、频道接入、定时任务、会话巡检、使用情况分析和日常配置维护。

相比配置文件和命令行优先的管理方式，ClawFast 把常见的 OpenClaw 管理任务收敛进一个更容易操作、更容易确认、更适合协作交接的桌面界面。

当前集成版本：

- `openclaw@2026.3.2`

### 为什么是 ClawFast

| 需求 | ClawFast 的方式 |
|---|---|
| 日常运维 | 用一个桌面控制台统一管理配置、频道、定时任务、会话和使用情况 |
| 更稳的改动流程 | 通过表单、预览和校验降低直接改配置的风险 |
| 更低的上手门槛 | 不要求每个使用者都先理解内部配置结构 |
| 更强的可见性 | 仪表盘、会话记录、用量分析、配置预览统一放在一个入口中 |

---

## 界面截图

<p align="center">
  <img src="resources/screenshot/dashboard.png" style="width: 100%; height: auto;" alt="Dashboard" />
</p>

<p align="center">
  <img src="resources/screenshot/chat.png" style="width: 100%; height: auto;" alt="Chat" />
</p>

<p align="center">
  <img src="resources/screenshot/channel.png" style="width: 100%; height: auto;" alt="Channels" />
</p>

<p align="center">
  <img src="resources/screenshot/model.png" style="width: 100%; height: auto;" alt="Models" />
</p>

<p align="center">
  <img src="resources/screenshot/cron.png" style="width: 100%; height: auto;" alt="Scheduled Tasks" />
</p>

<p align="center">
  <img src="resources/screenshot/session.png" style="width: 100%; height: auto;" alt="Sessions" />
</p>

<p align="center">
  <img src="resources/screenshot/skills.png" style="width: 100%; height: auto;" alt="Skills" />
</p>

<p align="center">
  <img src="resources/screenshot/usage.png" style="width: 100%; height: auto;" alt="Usage" />
</p>

---

## 核心能力

### 基于供应商的模型配置

通过可视化方式配置模型供应商、维护模型列表和默认路由，不再依赖手工编辑原始配置。

### 定时任务管理

通过弹层流程创建和编辑定时任务，支持普通创建和高级创建两种路径。

### 频道接入管理

在同一个界面中管理多平台频道配置，统一添加流程和状态展示。

### 会话与用量可见性

在一个桌面控制台里查看会话、消息历史、用量总览、图表和配置快照。

### 更适合桌面的体验

支持亮色 / 暗色主题、中英文界面，以及适配不同部署方式的打包模式。

---

## 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

### 执行类型检查

```bash
npm run typecheck
```

### 构建渲染层

```bash
npm run build:renderer
```

---

## 打包方式

### 内置 OpenClaw

将 OpenClaw 一并打入桌面应用，ClawFast 可以按需启动 bundled gateway。

```bash
npm run package:win
```

### Admin Only

作为纯管理控制台打包，不自动启动 gateway。

```bash
npm run package:win:admin
```

也可以打包其它平台：

```bash
npm run package:mac
npm run package:mac:admin

npm run package:linux
npm run package:linux:admin
```

---

## 目录结构

```text
main/       Electron 主进程、gateway 集成、IPC
renderer/   基于 Next.js + React 的桌面界面
shared/     主进程与渲染层共享的类型与协议
scripts/    构建、打包、OpenClaw bundling、Node runtime bundling
resources/  图标、截图和打包资源
```

---

## 技术栈

- Electron
- Nextron
- Next.js
- React
- TypeScript
- Tailwind CSS
- OpenClaw

---

## 发布检查

发布前建议至少确认以下内容：

- 打包后的应用连接到预期 gateway
- bundled OpenClaw 模式能正确启动 gateway
- `admin-only` 模式不会自动启动 OpenClaw
- 模型供应商配置可以正确保存和加载
- 定时任务可以正确创建、编辑、禁用和删除
- 打包图标与 Windows 任务栏身份显示正常

---

## 后续计划

- 继续完善供应商配置和模型路由体验
- 优化定时任务编辑、校验和高级字段联动
- 持续统一主要页面的桌面视觉语言
- 打磨打包流程、发布准备和上手文档
- 扩展频道、会话和用量的运维可见性

---

## 参与贡献

欢迎一起完善 ClawFast。建议的参与方式：

1. Fork 仓库。
2. 新建功能分支。
3. 保持改动聚焦且易于 review。
4. 提交前先运行类型检查。
5. 发起 Pull Request，并附上清晰的变更说明。

---

## 联系我们

<table align="center">
  <tr>
    <td align="center">
      <img src="resources/contactme/feishu.png" width="180" alt="Feishu" />
      <br />
      <strong>飞书</strong>
      <br />
      产品交流与直接沟通。
    </td>
    <td align="center">
      <img src="resources/contactme/wechat.png" width="180" alt="Enterprise WeChat" />
      <br />
      <strong>企业微信</strong>
      <br />
      商务联系与协作沟通。
    </td>
    <td align="center">
      <img src="resources/contactme/discord.png" width="180" alt="Discord" />
      <br />
      <strong>Discord</strong>
      <br />
      社区讨论与支持交流。
    </td>
    <td align="center">
      <img src="resources/contactme/whatsapp.png" width="180" alt="WhatsApp" />
      <br />
      <strong>WhatsApp</strong>
      <br />
      快速移动端联系。
    </td>
  </tr>
</table>

---

## License

This project is licensed under the [MIT License](./LICENSE).
