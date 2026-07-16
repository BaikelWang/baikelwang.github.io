---
title: Codex Windows ARM64 闪退：服务端开关引爆的本地崩溃
tags: [Codex, Windows, ARM64, Electron, Node-API, 排查]
date: 2026-07-16 11:30:00
categories: 杂谈
index_img: /img/code.jpg
---

> **环境：** Windows 11 ARM64 虚拟机 · Microsoft Store 版 Codex `26.707.9981.0` · Release `26.707.72221`
>
> **结论：** 闪退不是虚拟显示器或沙箱配置导致的。根因是 ARM64 `ChatGPT.exe` 缺少 Node-API 导出；服务端功能开关启用 Codex Micro 后加载了 `serialport` 原生模块，主进程随即崩溃。本地用模块拦截绕过后，Browser Use 与 Computer Use 均已恢复。

## 问题现象

Codex 此前在这台 ARM64 虚拟机上可以稳定运行很久。故障出现在一次「虚拟显示器」相关任务中：窗口还能短暂打开，聊天区有时已经渲染出来，但大约 3～15 秒后，主进程连同 renderer、GPU、utility 一起退出。没有友好报错，日志也停在普通初始化附近。

清空配置、重装、重启 Windows，都改变不了结果：一启动就闪退。

时间上的巧合很强——正在处理虚拟显示器、驱动权限和 Computer Use，Codex 就开始崩。直觉很容易把两件事绑在一起。后来证明，它们只是发生在同一时间段。

## 排查中踩过的假线索

### 1. 虚拟显示器与驱动残留

清理了相关文件、注册表和设备状态，没有找到足以让 Codex **冷启动**就崩的驱动残留。更合理的解释是：虚拟显示器任务只是让 Codex 一直跑到了故障触发时刻，而不是制造故障的原因。

### 2. 沙箱与权限

不同沙箱配置会改变初始化顺序：

- `elevated` 可能让更多组件先完成初始化，从而更快走到致命路径
- `unelevated` 是合法配置，但原生插件加载时依旧崩溃
- `disabled` 甚至不是有效枚举值——它只是打断部分初始化，让应用「活得更久」或卡在设置页

非法配置带来的延迟退出，不是修复，只是假性好转。

### 3. Browser Use / IAB / Computer Use

日志里满是浏览器面板、IAB 生命周期、Computer Use 插件和 Remote Control 消息，看起来很像元凶。一度关掉：

```toml
[features]
in_app_browser = false
browser_use = false
browser_use_external = false
computer_use = false
```

应用仍以同样方式退出。这些组件只是启动阶段的伴随噪声。

### 4. Primary Runtime 404

`primary_runtime_update_poll_failed` 和 `404 Not Found` 也很显眼，但代码路径会捕获该错误并按 warning 处理，不会结束主进程。

原生异常发生时，**日志最后一行经常是无辜的**。

## 真正的突破口：退出码

直接等待 `ChatGPT.exe` 退出并读取状态：

```text
有符号：-1066598273
十六进制：0xC06D007F
```

这与 VC++ delay-load 的「找不到过程」一致。结合 Crashpad dump 与公开复现，失败信息被定位为：

```text
缺失符号：napi_create_function
延迟加载目标：node.exe
实际宿主：ChatGPT.exe
失败模块：@serialport/bindings-cpp/.../win32-arm64/node.napi.node
```

依赖链很清楚：

```text
@worklouder/device-kit-oai
  → @worklouder/wl-device-kit
  → serialport
  → @serialport/bindings-cpp
  → win32-arm64/node.napi.node
```

ARM64 版 `ChatGPT.exe` 的导出表缺少完整的 `napi_*` / `node_api_*` 符号。原生插件解析 `napi_create_function` 失败时，delay-load helper 抛异常，Electron 主进程当场崩溃。

公开 Issue 里也能看到相同版本、相同退出码、相同缺失符号和相同依赖链：

- [openai/codex #33381](https://github.com/openai/codex/issues/33381)
- [openai/codex #33384](https://github.com/openai/codex/issues/33384)
- [openai/codex #33385](https://github.com/openai/codex/issues/33385)

## 为什么同一个版本以前能用，后来必崩？

这是整件事里最值得讲清楚的一点。

ARM64 兼容性缺陷在安装这个版本时就已经存在，但它不是所有功能都会经过的公共路径。普通聊天、文件编辑、终端、Git 并不需要加载 Work Louder 的串口原生插件。

真正的触发更像一颗被远程开关控制的地雷：

```text
有缺陷的 ARM64 二进制已经安装
        ↓
Codex Micro 功能开关尚未启用
        ↓
Work Louder / serialport 从未加载
        ↓
Codex 可以正常工作数小时
        ↓
Statsig 定时刷新服务端配置
        ↓
Codex Micro 路径被启用
        ↓
主进程 require('@worklouder/device-kit-oai')
        ↓
serialport ARM64 原生模块开始加载
        ↓
ChatGPT.exe 缺少 napi_create_function
        ↓
主进程当场崩溃
```

公开复现里，同一安装版本曾正常运行约 9～24 小时；第一次崩溃与一次成功的 Statsig interval refresh 精确重合。刷新后的值被缓存或再次从服务端取得，于是故障从「一次中途退出」迅速变成「每次启动都退出」。

因此可以更准确地说：

| 层面 | 结论 |
| --- | --- |
| **根因** | ARM64 `ChatGPT.exe` 缺少原生插件所需的 Node-API 导出 |
| **直接触发** | 加载 `@worklouder/device-kit-oai` 及其 `serialport` 依赖 |
| **时序解释** | 服务端 Statsig 开关在运行中启用了 Codex Micro |
| **与虚拟显示器** | 时间重合，但没有因果证据 |

**应用二进制没有变化，不代表运行路径没有变化。** 服务端开关、灰度实验和缓存值，都能让同一版本从「连续正常」瞬间变成「每次必崩」。

## 本地临时修复：只切断致命依赖

上游修复需要 OpenAI 重新构建并签名 ARM64 安装包。本机无法可靠修改 Microsoft Store 签名的 `ChatGPT.exe`，所以选择了影响最小的进程级绕过。

启动时临时注入：

```text
NODE_OPTIONS=--require=<disable-codex-micro.cjs>
```

预加载脚本只拦截精确模块名 `@worklouder/device-kit-oai`，返回一个「未发现设备」的桩实现：设备发现为空，连接/断开为空操作，HID、摇杆、灯效不再触达原生模块。

这样一来，Codex Micro / Work Louder 硬件集成被禁用，`serialport` 不会被加载，致命异常也就不会发生。

边界也很重要：

1. `NODE_OPTIONS` 只注入本次 Codex 子进程，不写入全局环境
2. 普通聊天、工程、终端、Git、插件和 MCP 不受影响
3. 必须通过加固后的桌面快捷方式启动
4. 启动器只接受已验证版本 `26.707.9981.0`；升级后必须重新评估

## 卸载重装之后，先谈备份

排查期间做过干净重装。卸载前分层备份了 sessions、SQLite 状态、`Documents\Codex` 工作区，以及可选的缓存和日志。恢复时没有用旧配置整体覆盖，而是只恢复会话、索引、数据库状态和工作区，并保留已经验证过的沙箱与 ARM64 稳定配置。最终恢复了 12 条历史会话。

经验很简单：**重装不等于问题消失**。服务端开关与安装包缺陷还在，而 `.codex` 又承载大量用户数据——动手前先做分层备份。

## 恢复被牺牲的能力

核心闪退解决后，不必继续牺牲浏览器和桌面交互。最终恢复：

```toml
[features]
in_app_browser = true
browser_use = true
browser_use_external = true
computer_use = true

[windows]
sandbox = "unelevated"
```

但只改 `config.toml` 还不够。排查阶段在桌面全局状态里留下了两个禁用标志：

```text
computer-use-bundled-plugin-auto-install-disabled
browser-use-bundled-plugin-auto-install-disabled
```

需要把它们恢复为 `false`，bundled 插件才会重新安装。

## 最后一个坑：关窗口 ≠ 完全退出

第一次恢复配置后，表面上已经「重启」了 Codex，但 09:01 启动的旧 `ChatGPT.exe` 仍在后台。旧实例保留着内存中的禁用状态，并把两个自动安装开关重新写回 `true`。

结果就是：TOML 里四项功能都是 `true`，Browser / Computer Use 插件却装不回来。

于是启动器又加了一层：

1. 启动前检查是否仍有 `ChatGPT.exe`
2. 有残留进程时拒绝继续，并显示 PID
3. 确认完全退出后，再恢复两项 bundled 插件安装状态
4. 最后注入 Work Louder 拦截并启动 Codex

涉及内存状态和自动安装逻辑时，**必须确认相关进程真正消失**，再开新实例。

## 最终验证

2026-07-16 通过加固快捷方式重新启动后：

- 进程均为新启动实例，且 `Responding=True`
- 四项浏览器与 Computer Use 功能保持为 `true`
- 两个 bundled 插件自动安装禁用标志均为 `false`
- 已安装 `browser`、`chrome`、`computer-use` 插件
- 日志出现 `computer-use native pipe startup ready`、`browser-use native pipe listening`
- 未再出现 `worklouder`、`serialport`、`napi_create_function` 或 `0xC06D007F`
- Crashpad `.dmp` 数量为 0

最终状态：

> Codex 保持稳定运行；Work Louder / Codex Micro 硬件集成被禁用；Browser Use、内置浏览器、Chrome 交互和 Computer Use 均已恢复。

对本机这台不连接外部 Work Louder 设备的虚拟机，实际损失很小；对话、文件、终端、Git、插件、MCP、Browser Use 和 Computer Use 都可以继续用。

## 什么才算官方修复

本地方案是精准绕过，不是上游根治。官方至少需要完成一项：

1. 为 ARM64 `ChatGPT.exe` 正确链接完整 Node-API 导出表
2. 针对 Electron ARM64 重新构建 Work Louder / serialport 原生插件
3. 在缺少 N-API 导出的宿主上跳过该模块并优雅降级
4. 正式修复发布前，对 `win32/arm64` 关闭相关服务端功能开关

不建议本机直接改 PE 导出表、重打 MSIX 或长期替换包内文件——会破坏签名与更新链，也难以证明运行时安全。

## 经验总结

1. **时间相关 ≠ 因果相关。** 故障发生在某个任务中，不代表该任务导致故障；退出码、dump 和依赖链才能把「同一时间」推进到「存在因果」。
2. **原生崩溃时，日志最后一行经常是无辜的。** 进程被 native exception 直接终止时，不会优雅收尾。
3. **动态功能开关可以引爆潜伏的客户端缺陷。** 二进制没变，运行路径却可能变。
4. **配置层的假性好转要用进程证据验证。** 非法配置可能让应用晚一点退出，不等于根因消失。
5. **定位根因后，把排查时关掉的能力逐项恢复。** 否则「不崩了」只是换来一个长期残缺的工作环境。
6. **桌面应用的「重启」必须确认进程级退出。** 关窗口可能只是藏到后台。

这次排查从虚拟显示器、权限、沙箱一路走到 Electron、Node-API、delay-load 和服务端开关，最后说明的是一个很典型的问题：**根因可能很底层，触发却来自云端；现象发生在一个任务中，原因却与任务本身无关。**

有效做法不是关掉所有可疑功能，而是找到唯一致命的加载路径，精准切断它，再把日常需要的能力逐一恢复并验证。

## 参考资料

- [openai/codex #33381](https://github.com/openai/codex/issues/33381)
- [openai/codex #33384](https://github.com/openai/codex/issues/33384)
- [openai/codex #33385](https://github.com/openai/codex/issues/33385)

关键本地路径（备份中的 `auth.json` 可能含令牌，勿公开上传）：

```text
用户配置：     %USERPROFILE%\.codex\config.toml
桌面全局状态： %USERPROFILE%\.codex\.codex-global-state.json
绕过脚本：     %LOCALAPPDATA%\OpenAI-Codex-Workarounds\disable-codex-micro.cjs
ARM64 启动器：  %LOCALAPPDATA%\OpenAI-Codex-Workarounds\Start-Codex-ARM64.ps1
应用日志：     %LOCALAPPDATA%\Packages\OpenAI.Codex_2p2nqsd0c76g0\LocalCache\Local\Codex\Logs\
```

官方更新到新版本后，应先测试原始入口；确认 ARM64 原生崩溃已修复，再移除本地绕过。
