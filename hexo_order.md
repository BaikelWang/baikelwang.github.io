# Hexo 常用命令

## 本地预览

```bash
hexo clean && hexo g && hexo s
```

浏览器访问 `http://localhost:4000`。

## 自动部署（推荐）

仓库已配置 GitHub Actions。只需把源码推送到 `hexo` 分支，Actions 会自动：

1. 安装依赖
2. 执行 `hexo generate`
3. 将生成的静态文件部署到 `main` 分支

```bash
# 写文章 / 改配置后
git add .
git commit -m "新增文章：xxx"
git push origin hexo
```

推送后可在 GitHub 仓库的 **Actions** 标签页查看部署进度。部署成功后，网站会自动更新。

## 手动部署（可选）

如果本机已安装 Hexo 环境，也可以手动部署：

```bash
hexo clean && hexo g && hexo d
```

`hexo d` 会把 `public/` 推送到 `main` 分支，效果与 GitHub Actions 相同。

## 首次本地开发

```bash
git checkout hexo
npm install
```
