# 北海与中意 · 订婚纪念页

## 当前状态

用户已确认的发布版本。页面不展示日期、地点，只以“我们订婚啦！”为主题。

- 页面源码：`source/engagement/index.html`
- 样式与交互：`source/engagement/style.css`、`source/engagement/album.js`
- 预览：启动 Hexo 后访问 `/engagement/`
- 正式地址：`https://baikel.iamlgao.cn/engagement/`

## 设计与交互

奶油色纸张、酒红色标题、宋体与少量衬线英文、拍立得式相框、原创线条小狗风格贴纸。内容分为订婚宣告、一起的日常、16 张合影、写给以后。独立页面，不套博客文章模板，也没有改动博客导航。

照片可放大、前后循环翻阅，支持左右键、Esc 关闭与触摸滑动。关闭后恢复键盘焦点。祝福按钮仅播放本地爱心动画，没有服务器存储、统计、表单、广告或访客追踪。尊重系统“减少动态效果”设置。JavaScript 不可用时，图片链接仍可打开。

## 照片与隐私

- 原始相册保持不变；网页仅引用重新编码后的派生 JPG，长边上限 1800px，另备 720px 缩略图。
- 18 张原图选用 16 张：未选用与另一张场景近似的照片（编号 04）和一张非双人合影（编号 13），原图不删除。
- 文件名使用中性编号。派生图片不包含原图 EXIF 拍摄时间和 GPS 元数据。
- 相册中原本就可见的背景、人物、地标仍会出现在图片里；移除 EXIF 不等于内容匿名。
- 页面设有 `noindex, nofollow, noarchive`，但这不是访问控制；公开发布后，任何拿到地址的人都能查看、保存图片，公开 Git 仓库也可能保留历史副本。
- 本次不上传原图，不嵌入日期地点，不添加宾客报名、地图、联系方式、第三方字体或背景音乐。

## 后续发布

后续涉及新照片或个人信息的公开发布，仍需用户确认。发布采用已有 GitHub Actions：`hexo` 分支构建，部署到 `main`；不要同时运行本地 `hexo deploy`。当前 `_config.yml` 的 `skip_render` 已包含 `engagement/**`，以保留独立 HTML/CSS/JS，不让 Hexo 再套主题。

本地命令：

```powershell
npm.cmd run build
npm.cmd run server -- --port 4100 --ip 127.0.0.1
```

## 插画来源

使用内置图像生成工具（imagegen，非 API CLI）制作，并进行一轮简化。仅生成小狗装饰，没有向生成工具提供人物照片。选定插画的网页副本保存在 `source/engagement/images/puppies.png`（560×560，保留透明通道）；不是线条小狗官方素材。

初始提示词：

```text
Use case: illustration-story. Asset type: transparent PNG decorative sticker for a refined Chinese engagement photo-album webpage. Draw one charming pair of simple rounded line-art cartoon puppies sitting close and gently leaning their heads together: a little golden ochre retriever with floppy darker ears on the left, and a fluffy white Maltese with a tiny pink bow on the right. Very simple dark warm-brown uniform outlines, dot eyes, tiny bean noses, small smiling mouths, blush cheeks; soft compact chubby bodies, tiny rounded paws, subtly asymmetrical hand-drawn contours. The golden puppy wears a tiny muted burgundy bow tie; the white puppy holds one tiny blush-pink flower. One small burgundy heart floats between their heads. Contemporary minimal Korean line-dog sticker aesthetic, sweet and understated, a polished flat 2D doodle, no realism, no 3D, no shading, no texture, no background, no backdrop, no white sticker border, no ground shadow. The entire paired illustration fits one compact composition with generous transparent margins; puppies fully visible, crisp enough for website display at 230px wide. Restrained palette ivory white, warm gold, brown ink, dusty blush and wine red. No text, letters, logos, watermarks, extra characters, decorative scene or engagement rings.
```

简化提示词：

```text
Edit this puppy pair into an EXTREMELY SIMPLE, flat, two-dimensional line-dog cartoon sticker for a minimal elegant engagement website. Keep the idea of the golden puppy and the white puppy leaning together, tiny burgundy bow tie and pink hair bow, one tiny heart. Greatly simplify both silhouettes: smooth chubby rounded marshmallow bodies, very oversized smooth round heads, extremely short tiny paws, small floppy ears, dot eyes and a tiny rounded triangular nose. No realistic canine anatomy, no fur spikes, no hair strands, no elaborate face contours. Use ONE consistent thin dark-brown outline with imperfect hand-drawn charm, flat solid pale ochre and white fills, two pale pink cheek dots. Remove ALL gradients, glow, halo, shadows, texture, fur detail and three-dimensional shading, including the broad halo outside the puppies. Make the entire outside of the crisp outlines perfectly transparent. The result should look like a spare original Korean doodle / line-dog sticker, NOT a detailed children's storybook illustration. Enclose the complete pair in a tight square composition with small transparent margins. No text, no logo, no background or ground. Sweet, softly funny, minimal.
```
