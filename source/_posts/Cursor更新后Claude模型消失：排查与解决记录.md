---
title: Cursor 更新后 Claude 模型消失：排查与解决记录
tags: [Cursor, Claude, 代理, macOS, 网络排查, Clash]
date: 2026-06-30 11:00:00
categories: 杂谈
index_img: /img/code.jpg
---

> **环境：** macOS · Cursor 3.9.16 · Ultra 订阅 · Clash Verge Rev 2.4.7
>
> **结论：** 模型消失并非订阅失效，而是 Cursor 3.x 部分后台进程不继承编辑器代理设置；开启 TUN + 域名白名单后恢复 Claude。

## 问题现象

Cursor 更新后，Claude 系列模型从模型列表中消失：

- 聊天模型选择器只显示 `Composer 2.5`
- Settings → Models 仅显示 Composer、Grok、Kimi、GLM 等模型
- 搜索 `Claude` 时提示 `No models available`
- 仅开启 Clash 的「系统代理」无效；开启 TUN/虚拟网卡并重启 Cursor 后，Claude 恢复

## 网络环境

| 项目 | 检测结果 |
| --- | --- |
| 局域网 IPv4 | `192.168.5.75` |
| 默认网卡 | `en0` |
| 直连公网 IP | `219.142.86.194`，北京，中国 |
| Clash 混合端口 | `127.0.0.1:7891` |
| 代理出口 IP | `108.181.0.173`，洛杉矶，美国 |

Cursor 中已有以下代理配置：

```json
{
  "http.proxy": "http://127.0.0.1:7891",
  "http.proxySupport": "override",
  "http.useLocalProxyConfiguration": false
}
```

但这些设置只覆盖 VS Code/Electron 的**部分**网络请求，不能保证新版 Cursor 的所有后台进程都使用该代理。

## 排查过程与证据

### 1. 排除订阅和额度问题

本地状态显示账号为 `Ultra`。历史日志中，2026-06-24 至 2026-06-26 曾正常选择并调用：

```text
claude-opus-4-8
claude-sonnet-4-6
```

因此账号此前具备 Claude 权限，问题不是订阅档位突然失效。

### 2. 排除 Cursor 服务整体故障

Cursor Settings → Network → Run Diagnostic 的项目全部通过，包括：

- DNS、SSL、API、Ping
- Chat、Agent、Authentication
- Agent Endpoint、CDN

这说明基础网络和账号认证正常。

### 3. 确认是地区目录限制

直连出口位于中国大陆。Cursor 会根据获取模型目录时的网络出口和模型提供商的地区政策隐藏不可用模型。当前模型列表的形态——只剩 Composer、Grok、Kimi、GLM——与地区限制完全吻合。

开启 TUN 后，Cursor 请求经美国节点发送，重新启动 Cursor 后 Claude 模型恢复，进一步验证了这一判断。

### 4. 为什么更新前系统代理有效，更新后失效

**更新前：** 大部分请求由 Electron/VS Code 网络层发出，能够读取 macOS 系统代理或 `http.proxy`。

**更新后：** Cursor 3.x，特别是新版 Agents Window，引入了更多独立后台组件。本机可观察到：

- `AlwaysLocalSingleton`
- `mcp-process`
- Agent/插件扩展进程
- 指向 `api2.cursor.sh`、`api3.cursor.sh`、`agentn.api5.cursor.sh` 的 HTTP/2 或长连接

部分独立进程**不会完整继承**系统代理或编辑器代理设置。TUN 位于 IP 路由层，不依赖应用是否主动读取代理配置，因此能够稳定接管这些连接。

> 这是根据本机进程、连接和更新前后行为作出的判断；Cursor 的公开更新日志没有明确说明该代理兼容性变化。

## 最终解决思路

### 推荐方案：TUN + Rule + 默认直连

不再使用 Clash 的 `Global` 模式，而是：

```yaml
mode: rule

tun:
  enable: true
```

只让 Cursor 必需域名通过 `AI` 代理组，其余流量全部直连：

```javascript
function main(config, profileName) {
  config.mode = "rule";
  config.rules = [
    "DOMAIN-SUFFIX,cursor.sh,AI",
    "DOMAIN-SUFFIX,cursor.com,AI",
    "DOMAIN-SUFFIX,cursorapi.com,AI",
    "DOMAIN-SUFFIX,cursor-cdn.com,AI",
    "DOMAIN-SUFFIX,anthropic.com,AI",
    "DOMAIN-SUFFIX,claude.ai,AI",
    "MATCH,DIRECT",
  ];
  return config;
}
```

这样 TUN 可以常开，但系统更新、视频、国内服务及其他未列出的流量不会消耗代理额度。

## 生效验证

规则模式启用后，Mihomo 实时连接显示：

```text
us-only.gcpp.cursor.sh  → cursor.sh → AI → 美国01
agentn.api5.cursor.sh   → cursor.sh → AI → 美国01
api2.cursor.sh          → cursor.sh → AI → 美国01
api3.cursor.sh          → cursor.sh → AI → 美国01
```

而未加入白名单的普通域名走 `MATCH,DIRECT`。因此用普通 IP 查询网站测试时仍可能看到北京出口，这是**预期行为**，不代表 Cursor 没有经过代理。

## 备份与回滚

修改前已创建备份：

```text
~/Library/Application Support/io.github.clash-verge-rev.clash-verge-rev/
├── config.yaml.backup-20260630-111422
└── profiles/shDW6uZX6H4G.js.backup-20260630-111422
```

若需回滚，可用备份恢复对应文件，然后重启 Clash Verge。

## 经验总结

1. 模型消失不一定是订阅或额度问题，先检查出口 IP 和 Models 页面。
2. Cursor 的 `http.proxy` ≠ 所有 Cursor 后台进程都经过代理。
3. 系统代理只能覆盖主动遵守代理设置的应用；TUN 才能兜住独立进程和长连接。
4. TUN 不必等于全局代理。配合域名白名单和 `MATCH,DIRECT`，可以同时获得稳定性和极低的代理流量。
5. 修改代理后应**完全退出并重启 Cursor**，使模型目录重新拉取。

## 参考资料

- [Cursor 更新日志](https://cursor.com/changelog)
- [Cursor 模型文档](https://docs.cursor.com/models/)
- [Cursor 网络故障排查](https://docs.cursor.com/en/troubleshooting/troubleshooting-guide)
- [Cursor 所需网络域名讨论](https://forum.cursor.com/t/please-reconsider-cursors-ip-allowlisting-strategy/162015)
- [Claude 模型地区限制说明](https://forum.cursor.com/t/anthropics-models-disappearing-in-pro-account/163318/5)
