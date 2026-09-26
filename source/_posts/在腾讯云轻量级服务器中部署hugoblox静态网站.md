---
title: 在腾讯云轻量级服务器中部署hugoblox静态网站
date: 2025-7-11 11:40:38
tags:  [网站,域名,caddy,hugo blox,腾讯云]
index_img: /img/covers/web-infrastructure-academic.jpg
categories: 杂谈
---
# 购买服务器
_腾讯云购买任意轻量级服务器----->配置 Ubuntu 系统----->购买域名 xxx.cn----->备案----->开启域名解析_

这一步骤请参考其他博主的文章，在这里不过多赘述，以下是本文核心，在服务器中部署 hugo。

# 配置 caddy
在完成了上述步骤之后，来到你的服务器控制台主页，登录进入服务器：

![](/img/建网站/denglu.png)

选择中间的**密码/密钥登录**，然后再从中选择 root 一键登录来到终端。

首先，安装 caddyv2，在终端命令行中输入：

参考[https://caddy2.dengxiaolong.com/docs/install](https://caddy2.dengxiaolong.com/docs/install)

```bash
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

安装完成之后，找到 caddyfile：

```bash
sudo find / -name "Caddyfile"

'nano /etc/caddy/Caddyfile'
```

接下来配置Caddyfile以反向代理到本地服务：

### 1. 编辑Caddyfile
```bash
sudo nano /etc/caddy/Caddyfile
```

### 2. 添加域名配置
在文件中写入（将 `xxx.cn` 替换为你的实际域名）：

```nginx
xxx.cn {
    reverse_proxy 127.0.0.1:1313
}
```

在这里 127.0.0.1 是服务器默认的 localhost 的 ip 地址，1313 是 hugo 默认的部署页面端口号，下文会用到。

### 3. 保存并退出
+ Nano编辑器：按 `Ctrl+O` 保存 → 回车确认 → `Ctrl+X` 退出

### 4. 重载Caddy服务
```bash
sudo systemctl reload caddy
```

### 5. 验证配置
```bash
sudo caddy validate --config /etc/caddy/Caddyfile
```

出现 `Valid configuration` 表示配置正确

### 6. 检查服务状态
```bash
sudo systemctl status caddy
```

查看是否有错误日志（重点关注域名解析和代理绑定）

### 重要提示：
1. **域名准备**：
    - 确保域名已解析到服务器IP（通过 `ping www.xxx.cn` 验证）
    - 如果服务器有防火墙（如UFW），开放80/443端口：

```bash
sudo ufw allow 80,443/tcp
```

2. **服务检查**：
    - 确认本地服务已在 `127.0.0.1:1313` 运行：

```bash
curl -I 127.0.0.1:1313
```

3. **HTTPS自动化**：  
Caddy会自动：
    - 申请Let's Encrypt证书
    - 将HTTP重定向到HTTPS
    - 无需额外配置

### 常见问题排查：
```bash
# 查看详细日志
journalctl -u caddy -f

# 测试配置语法
sudo caddy fmt --overwrite /etc/caddy/Caddyfile  # 自动格式化配置
sudo caddy adapt --config /etc/caddy/Caddyfile   # 检查配置转换
```

完成以上步骤后，访问 `https://www.xxx.cn` 即可看到反向代理后的内容。整个过程通常不超过2分钟生效。

# Hugo
完成上述步骤之后，在 Ubuntu 上安装 Hugo：

### 推荐方法：安装最新扩展版（支持Sass/SCSS）
```bash
# 1. 确定最新版本号（替换为实际最新版本）
LATEST=$(curl -s https://api.github.com/repos/gohugoio/hugo/releases/latest | grep 'tag_name' | cut -d '"' -f 4)

# 2. 下载扩展版（64位系统）
wget https://github.com/gohugoio/hugo/releases/download/${LATEST}/hugo_extended_${LATEST#v}_linux-amd64.tar.gz

# 3. 解压安装
sudo tar -xvzf hugo_extended_${LATEST#v}_linux-amd64.tar.gz -C /usr/local/bin

# 4. 验证安装
hugo version
```

或者你直接从[https://github.com/gohugoio/hugo/releases/](https://github.com/gohugoio/hugo/releases/) 中把安装包下载下来，然后用 sftp 上传到服务器的指定位置，然后 cd 的相应的目录下面用本地安装：

```nginx
sudo dpkg -i hugo_extended_0.143.1_linux-amd64.deb
```

### 验证安装成功 
```bash
hugo version
```

应显示类似：

```plain
hugo v0.123.7-5d4eb5154e+extended linux/amd64 BuildDate=2023-11-06T12:32:09Z
```

### 创建测试站点（可选）
```bash
# 1. 创建新站点
hugo new site mysite
cd mysite

# 2. 添加主题（以ananke为例）
git init
git submodule add https://github.com/theNewDynamic/gohugo-theme-ananke.git themes/ananke
echo "theme = 'ananke'" >> hugo.toml

# 3. 创建测试页面
hugo new posts/my-first-post.md

# 4. 启动本地服务器（会在1313端口运行）
hugo server -D
```

### 与Caddy集成（可选）
1. 启动Hugo生成静态文件：

```bash
# 在Hugo站点目录执行
hugo  # 生成到public目录
```

2. 修改Caddyfile配置：

```nginx
www.xxx.cn {
    root * /path/to/mysite/public  # 指定Hugo生成的静态文件目录
    file_server
}
```

3. 重载Caddy：

```bash
sudo systemctl reload caddy
```

### 我的方法
我将[https://github.com/HugoBlox/theme-research-group](https://github.com/HugoBlox/theme-research-group) 这个提供的主题文件下载到本地，然后通过 sftp 上载到服务器中 root/web 这一目录下，然后在这一目录中执行

```nginx
hugo server -D
# 结果
# Web Server is available at http://localhost:1313/ (bind address 127.0.0.1)
#Rebuilt in 727 ms
```

然后输入如下，让服务器一直挂起。

```nginx
nohup hugo server -D > hugo.log 2>&1 &
```

这样就能查看网页了，而且还有一个好处，就是你在修改 hugoblox 文件时候，网页会随着你的修改实时刷新，你可以实时看到你修改的结果，很方便。

![](/img/建网站/web.png)
