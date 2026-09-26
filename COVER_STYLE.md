# 网站封面风格

采用古典、简约、大方、优雅的学院风，以科学书籍图版和论文插图的构图为参考。

## 视觉约定

- 横版接近 16:9；浅米白纸底、石墨黑细线、低饱和灰蓝，暗红仅作少量点缀。
- 每张突出一个主题，保留宽裕留白；缩小为首页卡片后仍应能辨识主体。
- 使用克制的线描、几何关系与少量排线。避免霓虹、发光、塑料感 3D、过度装饰和密集图标。
- 封面是主题插画，不是实验数据、论文原图或精确方法示意。正文中的科学图保留其真实来源和准确标注。
- 力扣刷题文章继续使用 /img/code.jpg；Karpathy 文章与生日文章保留各自专属封面。
- 新封面文件在 source/img/covers/，本次版本以 -academic.jpg 结尾。保留旧版文件供历史引用，当前文章不再引用旧版系列。
- 新封面通过 source/css/academic-covers.css 保持原始宽高比，避免主题在手机和平板上裁掉科学图形；不改变其他封面的样式。

## 制作与发布

2026-09-27 使用内置图像生成工具创作，检查构图后压缩为 JPEG（质量 88，1672×941）。排障图另做一轮去除花饰的修改。原始 PNG 保留在生成目录，网站使用仓库中的 JPEG。

后续更新先检查 git diff、本地构建和桌面/移动端显示，然后推送 hexo。GitHub Actions 会构建并发布到 main；自动部署存在时不要同时执行本地 hexo deploy。

## 图版主题

- AI 工程与协作：`source/img/covers/ai-engineering-academic.jpg`
- 算法与数据结构：`source/img/covers/algorithms-academic.jpg`
- XRD 与材料表征：`source/img/covers/xrd-materials-academic.jpg`
- 晶体与磁性：`source/img/covers/crystal-ai-academic.jpg`
- AI 工具排障：`source/img/covers/ai-debugging-academic.jpg`
- 图像分割：`source/img/covers/computer-vision-academic.jpg`
- 强化学习：`source/img/covers/reinforcement-learning-academic.jpg`
- 网络与网站基础设施：`source/img/covers/web-infrastructure-academic.jpg`

## 可复用的生成提示词

以下为本次完整提示词，方便后续维护和定向调整。

### AI 工程与协作

```text
Use case: stylized-concept.
Create a finished horizontal 16:9 blog cover illustration for AI software engineering and human-AI collaboration. Visual direction: an elegant, austere scientific plate in a modern university press monograph, classical academic taste, calm and generous negative space. Warm ivory paper (#f5f2ea) with barely perceptible paper tooth; fine graphite-black and muted slate-blue linework, only one small oxblood-red accent. Main subject: three quietly arranged geometric modules with finely drawn internal network structures, connected by one deliberate thin line forming a measured feedback circuit, like a carefully composed systems illustration in a research paper. Use open outlined rectangular modules, small circles and restrained hatching. Diagrammatic flat ink drawing, subtle engraved print character, immaculate alignment, balanced asymmetry, broad 20% margins. One focused composition; visually intelligible when reduced to a small blog thumbnail. No text, no letters, no numbers, no invented data, no logos, no robots, no brain icons, no glow, no gradients, no 3D rendering, no drop shadows, no ornate frame, no aged yellow stains. Artwork fills about 60% of the canvas, with purposeful whitespace. Scholarly, modest, refined, timeless.
```

### 算法与数据结构

```text
Use case: stylized-concept. Finished horizontal 16:9 editorial cover for algorithms and data structures, designed like a refined scientific plate from a modern university press monograph. Warm off-white ivory paper (#f5f2ea), very subtle paper texture. Finely engraved graphite-black linework with muted slate blue and one small oxblood-red accent. A single graceful binary tree centered on the canvas, connected round nodes with clear branching, transitioning quietly at its base into one horizontal ordered array of seven outlined square cells. Deliberate precise geometry, classical mathematical diagram, elegant fine ink strokes, restrained hatch shading, broad whitespace at all sides. The structure occupies 60 percent of the canvas, dark enough for a thumbnail, without filling the frame. Scholarly, classical, minimal, calm and generous. No text, no numerals, no formula, no plot with invented results, no human figures, no decorative book props, no ornamental border, no neon, no glow, no gradient, no 3D rendering, no shadow, no saturated colors, no logo. A real-looking mathematics monograph plate composed with contemporary editorial care.
```

### XRD 与材料表征

```text
Use case: stylized-concept. Create a sophisticated horizontal 16:9 cover for a personal academic blog about powder X-ray diffraction and materials characterization. It should resemble an elegant physics monograph plate, with generous warm ivory (#f5f2ea) empty paper and very faint paper grain. Fine graphite-black engraving and muted slate-blue ink with a tiny oxblood highlight. Composition: on the left-center, a simple precisely drawn faceted mineral crystal with one set of thin parallel crystallographic planes; on the right-center, three clean concentric diffraction rings rendered as delicate arcs, and a single small unlabelled diffraction peak silhouette beneath them. The forms are balanced and spacious, occupy about 60% of the canvas. Extremely restrained scholarly editorial illustration, flat ink, consistent thin strokes with a few stronger contours, no faux machinery. An evocative conceptual cover, not empirical measurement data. No words, symbols, labels, numbers or equations; no multi-panel dashboard; no glows, gradients, shiny 3D spheres, drop shadows, heavy border, floral decoration, yellowed parchment, photographic objects, or corporate stock imagery. Classical, minimal, quiet, precise, generous.
```

### 晶体与磁性

```text
Use case: stylized-concept. A horizontal 16:9 academic editorial cover for crystal structure learning and magnetism. Warm ivory paper (#f5f2ea), slight paper tooth, graphite-black fine engraved lines, muted slate blue, and only a small oxblood-red accent. Main subject a single beautifully drawn crystallographic unit cell floating as a flat ink axonometric drawing on the otherwise empty paper, a restrained network of small circles at lattice sites and thin bonds, a few subtle parallel upward arrows next to selected sites indicating magnetic moments. A faint geometric projection of the cell lies beside it as a second small line diagram, with generous separation. Clean university press scientific monograph aesthetic, mathematically ordered, precise minimalist composition, generous 20% margins. The drawing occupies 60% of the canvas and remains distinct at thumbnail size. Pure line art with very light cross-hatching only; no glossy spheres, no lighting, no 3D-render materials, no labels, words, numerals, equations, fake data, frame, ornaments, gradients or futuristic visual effects. Classical scholarly elegance, quiet and intellectually serious.
```

### AI 工具排障

```text
Use case: stylized-concept. Create a finished horizontal 16:9 scholarly editorial cover for AI tool troubleshooting and debugging. The illustration should feel like a spare technical plate printed in a beautiful university press book. Warm off-white ivory paper (#f5f2ea) with slight grain; fine graphite-black and muted slate-blue ink, a single oxblood-red accent. Center a delicately drawn open magnifying lens above a simple horizontal signal path of five small geometric modules. Under the lens one interrupted connection is isolated in red, with a tiny precise bridge reconnecting the two sides; one thin unlabelled trace line echoes the path below. A visual metaphor for diagnosis and repair, lucid and quiet. Flat pen-and-ink engraving, uniform slender lines, sparse hatching, generous balanced empty space and wide margins, legible small-scale composition. No labels, no words, letters, digits or code, no fake charts, no brain, no person, no glossy laptop, no neon, no glow, no drop shadows, no gradient or 3D renderer. Classic, understated, elegant and restrained.
```

### 排障封面去花饰修订

```text
Edit this cover illustration. Remove all botanical branches at the lower left and lower right, remove the entire ornamental footer including the horizontal bottom rules and the central fleur-de-lis. Replace those areas with the same blank warm ivory paper. Preserve the magnifying glass, red repaired connection, and row of five geometric nodes, but scale this remaining entire composition down slightly to provide generous clean margins on every side. Preserve the exact fine ink engraving medium and muted colors. Absolutely no new decoration or text. It should be a minimalist technical book illustration.
```

### 图像分割

```text
Use case: stylized-concept. Horizontal 16:9 minimalist academic cover for computer vision and image segmentation. Fine scientific pen-and-ink illustration on very lightly textured warm ivory paper (#f5f2ea), as in a carefully typeset modern university press monograph. Center one simple botanical leaf, realistically drawn in delicate graphite-black engraving, alongside a second matching leaf whose outline and vein regions have been quietly separated into three muted flat regions: ivory, slate blue, and small oxblood red. Between them, a modest U-shaped sequence of six thin outlined squares of changing sizes evokes encoder-decoder feature maps. Composition is open, balanced and restrained, clear distinction between the engraved input specimen and its abstract segmented counterpart. Broad margins; illustration occupies the central 65% of the canvas. Fine crisp outlines, sparing hatching, no lettering, numbers, labels, equations, data, arrows over everything, photographs, decorative foliage, border, flourish, gradients, neon, glow or 3D rendering. Scholarly, classical, minimal and elegant.
```

### 强化学习

```text
Use case: stylized-concept. Horizontal 16:9 scholarly illustration for a reinforcement-learning pendulum-control article. Visual language of a classical mechanics monograph with contemporary restraint. Warm ivory paper (#f5f2ea), faint fine paper grain, graphite-black linework, muted slate blue and a very small oxblood-red accent. Main subject at center-left: a precisely ink-drawn pendulum with a simple pivot, slender rigid rod and small circular bob, three faint alternative positions describing its swing, one fine curved arc. At center-right: a small sparse closed feedback loop with two outlined rectangular modules and restrained directional arrows. Keep ample blank space and clear balance, illustration occupies only central 60 percent. Ink engraving with minimal hatching, two-dimensional scientific plate, calm and elegant, sharp enough at small thumbnail scale. No chart claiming experimental data, no text, labels, numbers, formulas, laurel leaves, ornamental borders or footer rules. No glowing gradients, glossy 3D, dashboard, clipart trophy, plastic robot or saturated color.
```

### 网络与网站基础设施

```text
Use case: stylized-concept. Finished 16:9 horizontal academic editorial cover for web networking, DNS and reverse proxy infrastructure. A very spare scientific network plate on warm ivory paper (#f5f2ea) with faint texture. Graphite-black and muted slate-blue fine ink, one tiny oxblood node. Center-left a small armillary-like wireframe globe, drawn simply as latitude and longitude circles without continents or ornament. Center a restrained layered network of six small circular nodes and straight connecting lines, with one selected route in muted blue. Center-right three simple outlined server rectangles like a minimal systems diagram. All three forms connected by a single horizontal path, broad comfortable spacing and generous empty top and bottom margins. Fine precise engraved linework, minimal hatching, flat two-dimensional book illustration. The total composition uses middle 65 percent of the canvas. Quiet classical university-press aesthetic, scholarly, dignified, clean. No text, letters, labels, numbers, ornaments, laurel, frame, footer, glowing paths, clouds, shield clipart, glossy 3D, shadows, gradients or futuristic look.
```
