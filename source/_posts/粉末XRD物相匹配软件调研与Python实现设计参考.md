---
title: 粉末 XRD 物相匹配软件调研与 Python 实现设计参考
tags: [PXRD, 科研, 凝聚态物理, Python, 晶体结构, GSAS-II]
date: 2026-06-14 15:00:00
categories: 凝聚态物理与人工智能
index_img: /img/default.png
---

**报告日期：2026-05-27**  
**目标：调研市面上可做粉末 XRD 物相匹配的软件、开源库与 Web App，并为 Python 实现一个类似 Jade 9 的 PDF 卡片匹配功能提供系统性设计参考。**

---

## 1. 背景与目标

本项目目标是设计一个 Python 系统，用于实现类似 **MDI JADE / Jade 9** 中基于 **PDF 卡片** 的粉末 XRD 物相匹配功能。

这里的 **PDF** 指 **Powder Diffraction File**，即粉末衍射数据库条目，而不是 PDF 文档。典型流程是：

```
导入实验 XRD 谱图
→ 预处理：平滑、背景扣除、Kα2 扣除、零点校正
→ 寻峰
→ 与数据库卡片峰表或理论谱图匹配
→ 输出候选物相卡片
→ 用户选择/排除物相
→ 多相组合匹配或 Rietveld 精修验证
```

商业软件如 JADE、HighScore、Match!、DIFFRAC.EVA 等已经形成成熟的 Search-Match 工作流；开源生态中则可以借助 COD、pymatgen、GSAS-II、Profex/BGMN、QualX2.0 等搭建自己的开放式原型。

---

## 2. 典型产品与系统分类

### 2.1 商业 XRD 分析软件

| 产品 | 厂商/组织 | 类型 | 核心能力 | 对本项目的参考价值 |
| --- | --- | --- | --- | --- |
| **MDI JADE / JADE Pro** | ICDD / MDI | 商业桌面软件 | XRD pattern processing、whole pattern fitting、Rietveld、minor phase identification 等 | 最接近 Jade 9 目标形态，应重点参考其"实验谱图 + 候选卡片 + 棒图叠加 + 接受/排除相"的交互模式。[ICDD](https://www.icdd.com/mdi-jade/) |
| **ICDD SIeve / SIeve+** | ICDD | 商业 Search-Match 工具 | 支持 Hanawalt、Fink、Long8 等传统峰表检索算法，并以 Goodness of Match 排序 | 适合参考传统 d-I 峰表匹配算法和 GOM 评分体系。[ICDD](https://www.icdd.com/pdf-support-software/) |
| **HighScore / HighScore Plus** | Malvern Panalytical | 商业桌面软件 | 支持同时使用多个参考数据库，覆盖 ICDD、CSD、COD-derived 等数据库 | 适合参考多数据库管理、数据库过滤、用户自建库管理。[Malvern Panalytical](https://www.malvernpanalytical.com/en/products/category/software/x-ray-diffraction-software/highscore) |
| **Match!** | Crystal Impact | 商业桌面软件 | 面向 powder diffraction phase analysis | 适合参考轻量级物相识别产品形态，尤其是"快速导入、快速匹配、候选排序"。[Crystal Impact](https://www.crystalimpact.com/match/) |
| **DIFFRAC.EVA** | Bruker | 商业桌面软件 | 用于 1D/2D XRD 数据分析，覆盖 visualization、data reduction、phase identification、quantification | 适合参考从原始谱图处理到物相识别、定量分析的一体化流程。[Bruker](https://www.bruker.com/en/products-and-solutions/diffractometers-and-x-ray-microscopes/x-ray-diffractometers/diffrac-suite-software/diffrac-eva.html) |
| **DIFFRAC.TOPAS** | Bruker | 商业精修软件 | 基于 profile fitting，用于 quantitative phase analysis、whole powder pattern fitting、Rietveld 等 | 适合参考高级模块：全谱拟合、Rietveld 精修、定量相分析。[Bruker](https://www.bruker.com/en/products-and-solutions/diffractometers-and-x-ray-microscopes/x-ray-diffractometers/diffrac-suite-software/diffrac-topas.html) |
| **SmartLab Studio II** | Rigaku | 商业仪器软件 | 集成测量、分析、可视化和报告；其 AI 插件支持 phase identification | 适合参考实时分析、AI 辅助识别、仪器工作流集成。[Rigaku](https://rigaku.com/products/x-ray-diffraction-and-scattering/xrd/smartlab-studio-ii/ai) |

### 2.2 开源软件、免费软件与 Python 库

| 名称 | 类型 | 核心能力 | 对 Python 实现的参考价值 |
| --- | --- | --- | --- |
| **QualX2.0** | 免费软件 | 用于 powder diffraction qualitative phase analysis；可查询 PDF-2 商业库，也可使用基于 COD 的 POW_COD | 非常适合作为传统 Search-Match 流程参考。[CNR](https://www.ba.ic.cnr.it/softwareic/qualxweb/) |
| **Profex + BGMN** | 开源 GUI + 精修内核 | 用于 Rietveld refinement、phase identification、phase quantification | 可作为后续 Rietveld 验证和定量分析参考。[Profex](https://www.profex-xrd.org/) |
| **GSAS-II** | 开源 Python 项目 | 面向晶体结构解析和 diffraction-based characterization | Python 生态中最重要的重型衍射分析后端之一。[GSAS-II Tutorials](https://advancedphotonsource.github.io/GSAS-II-tutorials/) |
| **pymatgen XRDCalculator** | Python 库 | 可根据晶体结构计算粉末 XRD pattern | 最适合用来从 CIF / COD / Materials Project 结构生成"开放式 PDF 卡片"。[pymatgen](https://pymatgen.org/pymatgen.analysis.diffraction.html) |
| **COD / POW_COD** | 开放晶体结构数据库 / 计算谱库 | COD 官方新闻称其在 2023 年达到 500,000 records | 最适合作为 MVP 阶段的开放数据源。[COD](https://qiserver.ugr.es/cod/new.html) |
| **Crystal Toolkit** | Python Web 框架 | Materials Project 生态中的材料科学 Web App 框架 | 可参考其材料结构可视化、Web 交互和 pymatgen 集成方式。[Crystal Toolkit](https://docs.crystaltoolkit.org/) |
| **CSD Python API** | 商业数据库 API | 用于程序化访问 CSD 结构化学数据 | 若目标领域包括药物晶型、有机晶体，可作为商业数据库/API 参考。[CCDC](https://www.ccdc.cam.ac.uk/solutions/software/csd-python/) |
| **Momentum Transfer Search Match** | Web App | 免费粉末衍射 phase identification 工具，支持上传 pattern，并在 COD 500,000+ structures 中匹配 | 非常适合作为 Web 产品形态参考。[Momentum Transfer](https://momentum-transfer.com/tools/search-match) |

---

## 3. 产品能力对比矩阵

| 维度 | JADE / SIeve+ | HighScore | Match! | DIFFRAC.EVA / TOPAS | QualX2.0 | Python 自研建议 |
| --- | --- | --- | --- | --- | --- | --- |
| 峰表匹配 | 强 | 强 | 强 | 强 | 强 | 第一阶段必须实现 |
| 全谱匹配 | 强 | 强 | 中-强 | 强 | 中 | 第二阶段实现 |
| 多相识别 | 强 | 强 | 强 | 强 | 中 | MVP 后重点实现 |
| Rietveld 精修 | JADE Pro 支持 | HighScore Plus 支持 | 可结合 FullProf | TOPAS 强 | 弱/非核心 | 可接 GSAS-II / BGMN |
| 数据库 | ICDD PDF 为主 | ICDD / CSD / COD 等 | COD / ICDD 等 | ICDD / 用户库等 | PDF-2 / POW_COD | COD + CIF + 用户库 |
| API / 可编程性 | 有限 | 有限 | 有限 | 有限 | 有限 | Python 原生优势 |
| Web 化 | 弱 | 弱 | 弱 | 弱 | 弱 | 推荐做成 Web App |
| 授权成本 | 高 | 高 | 中-高 | 高 | 免费 | 取决于数据库来源 |

---

## 4. 关键设计启发

### 4.1 数据库不是简单峰表，而是"物相卡片系统"

Jade 这类软件的核心体验不是单纯返回一个相名，而是返回一组 **候选物相卡片**。每张卡片应包含：

```yaml
phase_id: "COD-xxxxxxx"
source: "COD / ICDD / MP / User"
name: "Quartz"
formula: "SiO2"
elements: ["Si", "O"]
space_group: "P3121"
cell:
  a: ...
  b: ...
  c: ...
  alpha: ...
  beta: ...
  gamma: ...
reference: "..."
quality_flag: "experimental / calculated / user-imported"
peaks:
  - two_theta: 26.64
    d_spacing: 3.34
    rel_intensity: 100
    hkl: [1, 0, 1]
  - ...
pattern_grid:
  two_theta: [...]
  intensity: [...]
cif_path: "..."
```

Malvern Panalytical 对参考数据库的说明中特别区分了 **measured reference patterns** 和 **calculated reference patterns**：实测参考谱通常更适合 phase identification，而计算谱依赖结构数据，适合和 Rietveld/结构分析结合。

因此，自研系统中应区分：

```
1. 实测参考卡片：更接近商业 PDF 数据库体验
2. 理论计算卡片：由 CIF 通过 pymatgen / Dans_Diffraction 等生成
3. 用户自建卡片：实验室内部材料、标准样、历史样品
```

### 4.2 传统 Search-Match 仍然是 MVP 的核心

SIeve+ 明确支持 Hanawalt、Fink、Long8 等传统检索方法，并通过 Goodness of Match 排序。

对 Python MVP 来说，不需要一开始做复杂深度学习或全自动 Rietveld。更合理的路线是：

```
实验谱图 → 寻峰 → d/I 峰表 → 数据库候选筛选 → 打分排序 → 卡片展示
```

可优先实现如下评分项：

```
position_score     峰位匹配程度
intensity_score    相对强度相似度
coverage_score     实验强峰被解释比例
missing_penalty    候选卡片强峰缺失惩罚
chemistry_score    元素/化学约束匹配
background_score   弱峰可信度修正
```

### 4.3 全谱匹配是提高鲁棒性的关键

传统峰表匹配容易受以下因素影响：

```
弱峰漏检
峰重叠
择优取向
仪器零点偏移
样品晶粒尺寸/应变导致峰宽变化
背景扣除误差
```

因此第二阶段应增加 **full-pattern similarity**：

```
候选 stick pattern
→ 卷积为 pseudo-Voigt / Gaussian / Lorentzian profile
→ 与实验谱图做全谱相似度比较
→ 输出 pattern similarity score
```

Bruker TOPAS、JADE Pro、HighScore Plus 等商业工具的高级能力都强调 whole-pattern fitting 或 profile fitting。

### 4.4 多相匹配不能只做 Top-1 搜索

真实样品通常是多相体系。推荐采用分层搜索：

```
Step 1: 单相 Top-N 候选
Step 2: 选择一个候选相，解释部分实验峰
Step 3: 对 residual peaks / residual pattern 再次搜索
Step 4: 生成二相、三相组合
Step 5: 用 NNLS / least squares 拟合相比例
Step 6: 按整体残差和物理合理性排序
```

可以使用：

```python
scipy.optimize.nnls
sklearn.metrics.pairwise.cosine_similarity
scipy.signal.find_peaks
scipy.optimize.least_squares
```

---

## 5. 推荐系统架构

### 5.1 总体架构

```
┌────────────────────────────┐
│        Web / Desktop UI     │
│  谱图显示、卡片、棒图叠加   │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│        API Service          │
│ FastAPI / Flask / Streamlit │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│      XRD Processing Core    │
│ 背景扣除、平滑、寻峰、校正  │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│      Search-Match Engine    │
│ 峰表匹配、全谱匹配、多相搜索│
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│       Phase Card DB         │
│ COD / CIF / User / Licensed │
└─────────────┬──────────────┘
              │
┌─────────────▼──────────────┐
│   Optional Refinement Core  │
│ GSAS-II / BGMN / 自研拟合   │
└────────────────────────────┘
```

### 5.2 模块划分

| 模块 | 功能 | 推荐技术 |
| --- | --- | --- |
| 文件导入 | 读取 `.xy`、`.csv`、`.txt`、`.xrdml`、`.ras` 等 | pandas、自写 parser、后续接 xylib |
| 谱图预处理 | 平滑、背景扣除、归一化、Kα2 扣除、零点校正 | scipy、pybaselines |
| 寻峰 | 峰位、峰高、峰宽、峰面积提取 | scipy.signal.find_peaks |
| 晶体结构解析 | 读取 CIF、提取结构信息 | pymatgen、spglib |
| 理论谱生成 | 从结构计算 XRD pattern | pymatgen XRDCalculator |
| 卡片数据库 | 存储峰表、结构、元数据、索引 | SQLite、DuckDB、Parquet |
| 匹配引擎 | 峰表匹配、全谱相似度、多相搜索 | numpy、scipy、sklearn |
| 可视化 | 实验谱、候选棒图、残差图 | Plotly、ECharts、matplotlib |
| Web/API | 上传、搜索、结果展示 | FastAPI + React / Dash / Streamlit |
| 精修扩展 | Rietveld、定量相分析 | GSAS-II、Profex/BGMN |

---

## 6. MVP 功能建议

第一版不建议直接追求商业软件完整能力，而应实现一个"可用的 Jade-like Search-Match 原型"。

### 6.1 MVP 用户流程

```
1. 用户上传 XRD 谱图
2. 系统自动识别 2θ / intensity 数据
3. 自动背景扣除、平滑和归一化
4. 自动寻峰
5. 用户可输入元素约束：
   - 必须包含元素
   - 排除元素
   - 样品类型：氧化物 / 金属 / 矿物 / 有机物
6. 系统从数据库搜索 Top-N 候选物相
7. 以 PDF 卡片形式展示候选结果
8. 用户点击卡片，叠加理论棒图
9. 用户勾选已确认物相
10. 系统计算 residual peaks，并推荐下一相
```

### 6.2 MVP 输出卡片设计

```
┌─────────────────────────────────────────────┐
│ Quartz / SiO2                               │
│ Source: COD                                 │
│ Space group: P3121                          │
│ Match Score: 86.4                           │
│ Coverage: 8 / 10 strong peaks               │
│ Main peaks:                                 │
│   26.64°  d=3.34 Å  I=100                   │
│   20.86°  d=4.26 Å  I=35                    │
│   50.13°  d=1.82 Å  I=22                    │
│ Actions: [Overlay] [Accept] [Reject] [CIF]  │
└─────────────────────────────────────────────┘
```

卡片应支持：

```
- 候选物相名称
- 化学式
- 数据库来源
- 空间群
- 晶胞参数
- 主峰列表
- 匹配分数
- 被解释峰数量
- 缺失强峰提示
- 棒图叠加
- CIF 查看/下载
- Accept / Reject / Lock
```

---

## 7. 匹配算法设计

### 7.1 峰位匹配

实验峰与卡片峰之间允许一定容差：

```
Δ2θ tolerance: 0.05° ~ 0.20°
或
Δd / d tolerance: 0.1% ~ 0.5%
```

推荐优先使用 `d-spacing` 做匹配，因为 d 值比 2θ 更接近晶体学本质；但 UI 中仍显示 2θ。

示例评分：

```python
position_score = exp(-((delta_two_theta / tolerance) ** 2))
```

### 7.2 强度匹配

相对强度受择优取向、吸收、晶粒尺寸影响较大，因此强度不应作为硬约束，而应作为软评分：

```python
intensity_score = cosine_similarity(exp_intensity_vector, ref_intensity_vector)
```

建议权重：

```
峰位匹配：50%
强峰覆盖：25%
强度相似：15%
化学约束：10%
```

### 7.3 缺失峰惩罚

如果候选相的最强峰在实验谱中完全不存在，应显著扣分：

```python
missing_penalty = sum(weight_i for each strong reference peak not found)
```

但要考虑：

```
- 多相重叠
- 背景噪声
- 实验扫描范围不足
- 弱峰低于检测限
- 择优取向导致部分峰异常
```

### 7.4 多相组合搜索

推荐使用 beam search：

```
初始化：Top 50 单相候选
beam width = 10
max phases = 3 或 4

for depth in 1..max_phases:
    对每个候选组合：
        生成组合理论谱
        用 NNLS 拟合各相比例
        计算 residual score
        保留 top beam_width 组合
```

组合评分：

```
combo_score =
    pattern_similarity
  + explained_peak_ratio
  - residual_peak_penalty
  - too_many_phases_penalty
  - missing_strong_peak_penalty
```

---

## 8. 数据库方案

### 8.1 推荐数据源优先级

| 优先级 | 数据源 | 说明 |
| --- | --- | --- |
| P0 | 用户上传 CIF / 标准样 | 最容易控制授权，适合实验室内部使用 |
| P1 | COD | 开放结构数据库，适合生成理论卡片 |
| P1 | POW_COD | QualX2.0 使用的 COD-derived 粉末库思路值得参考 |
| P2 | Materials Project | 适合补充无机材料结构和计算数据 |
| P2 | RRUFF / AMCSD | 适合矿物方向 |
| P3 | ICDD PDF | 商业授权数据库，不建议直接内置，除非用户持有合法授权 |
| P3 | CSD | 有机晶体、药物晶型方向可考虑商业 API |

### 8.2 推荐数据库表结构

```sql
CREATE TABLE phases (
    phase_id TEXT PRIMARY KEY,
    source TEXT,
    name TEXT,
    formula TEXT,
    elements TEXT,
    space_group TEXT,
    crystal_system TEXT,
    a REAL,
    b REAL,
    c REAL,
    alpha REAL,
    beta REAL,
    gamma REAL,
    reference TEXT,
    quality_flag TEXT,
    cif_path TEXT
);

CREATE TABLE peaks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phase_id TEXT,
    two_theta REAL,
    d_spacing REAL,
    rel_intensity REAL,
    h INTEGER,
    k INTEGER,
    l INTEGER,
    FOREIGN KEY (phase_id) REFERENCES phases(phase_id)
);

CREATE INDEX idx_peaks_d ON peaks(d_spacing);
CREATE INDEX idx_peaks_two_theta ON peaks(two_theta);
CREATE INDEX idx_phases_formula ON phases(formula);
```

---

## 9. Python 技术选型建议

### 9.1 核心依赖

```
numpy
scipy
pandas
scikit-learn
pymatgen
spglib
pybaselines
plotly
fastapi
sqlite / duckdb
```

### 9.2 可选增强

```
GSAS-II           Rietveld refinement / 结构分析
Profex / BGMN     定量相分析参考
Dans_Diffraction  理论谱生成备选
pyFAI             2D detector 数据积分
fabio             衍射图像格式读取
xylib             多厂商谱图格式读取
```

---

## 10. 产品路线图

### Phase 0：调研与数据准备

```
- 确定支持的输入格式：xy、csv、txt
- 下载或导入 COD/CIF 数据
- 使用 pymatgen 批量生成理论 XRD 卡片
- 建立 SQLite / DuckDB 卡片数据库
```

### Phase 1：单相 Search-Match MVP

```
- 谱图导入
- 背景扣除
- 寻峰
- d/I 峰表匹配
- Top-N 候选物相卡片展示
- 实验谱 + 候选棒图叠加
```

### Phase 2：多相识别

```
- residual peaks 分析
- 二相 / 三相组合搜索
- NNLS 相比例估计
- 组合候选排序
```

### Phase 3：全谱拟合

```
- 理论棒图卷积成连续谱
- Gaussian / Lorentzian / pseudo-Voigt 峰型
- 零点偏移修正
- 峰宽参数拟合
- 全谱 similarity / residual score
```

### Phase 4：精修与定量

```
- 接入 GSAS-II 或 BGMN
- Rietveld refinement
- 晶胞参数微调
- 定量相分析
- 报告导出
```

### Phase 5：AI 辅助

```
- 用模拟 XRD 数据训练候选排序模型
- 用历史样品训练实验室专用分类器
- minor phase detection
- pattern decomposition
```

Rigaku 的 AI phase identification 插件使用神经网络和模拟 XRD 数据训练，用于识别主相和微量相，这说明 AI 可作为后期增强模块，但不建议作为 MVP 核心。

---

## 11. 推荐参考对象优先级

| 优先级 | 参考对象 | 参考原因 |
| --- | --- | --- |
| 1 | **JADE / JADE Pro** | 最接近目标产品形态，尤其是卡片式候选展示和 Search-Match 工作流。 |
| 2 | **SIeve+** | 传统 Hanawalt / Fink / Long8 算法和 GOM 评分值得复刻。 |
| 3 | **QualX2.0** | 免费软件中最接近传统物相 Search-Match，且使用 PDF-2 / POW_COD 思路。 |
| 4 | **pymatgen + COD** | 最适合 Python 自研开放卡片库。 |
| 5 | **HighScore / Match!** | 适合参考数据库管理、用户库、半定量分析和交互体验。 |
| 6 | **GSAS-II / Profex-BGMN** | 适合后续精修和定量验证。 |
| 7 | **Momentum Transfer Search Match** | 适合参考 Web App 形态和上传即匹配体验。 |
| 8 | **Rigaku AI Phase Identification** | 适合作为 AI 后处理或候选排序模块参考。 |

---

## 12. 总结

若目标是用 Python 实现一个类似 Jade 9 的 PDF 卡片物相匹配系统，建议采用以下路线：

```
第一步：
COD / 用户 CIF → pymatgen 生成理论 XRD 卡片库

第二步：
实验谱图 → 背景扣除 → 寻峰 → d/I 峰表匹配

第三步：
输出候选物相卡片 → 棒图叠加 → 用户交互确认

第四步：
Residual peaks → 多相组合搜索 → NNLS 半定量

第五步：
接入 GSAS-II / BGMN 做 Rietveld 精修和定量验证
```

最终系统的核心竞争力不只是"能匹配相"，而是：

```
- 数据库卡片质量
- 峰表匹配算法鲁棒性
- 多相组合搜索能力
- 谱图可视化交互体验
- 用户确认/排除物相的工作流
- 后续 Rietveld 验证和报告输出能力
```

因此，推荐先做 **开放数据库 + 传统 Search-Match + 卡片式 UI** 的 MVP，再逐步扩展到 **全谱拟合、多相搜索、Rietveld 精修和 AI 辅助识别**。
