---
title: Uni-3DAR：统一跨尺度 3D 生成与理解的自回归框架
tags: [科研, 凝聚态物理, DeepLearning, Uni-3DAR, MP, PXRD, CSP]
date: 2026-06-14 11:00:00
categories: 凝聚态物理与人工智能
index_img: /img/default.png
---

> **论文标题**: Uni-3DAR: Unified 3D Generation and Understanding via Autoregression on Compressed Spatial Tokens  
> **论文链接**: [arXiv:2503.16278](https://arxiv.org/abs/2503.16278)  
> **代码仓库**: [github.com/dptech-corp/Uni-3DAR](https://github.com/dptech-corp/Uni-3DAR)（本地：`Uni-3DAR-study/code/Uni-3DAR/`）  
> **作者**: Shuqi Lu, Haowei Lin, Lin Yao, Zhifeng Gao, Xiaohong Ji, Yitao Liang, Weinan E, Linfeng Zhang, Guolin Ke  
> **机构**: 深势科技（DP Technology）/ 北京科学智能研究院（AISI）/ 北京大学  
> **开源协议**: MIT License

---

## 📋 目录

1. [背景与动机](#1-背景与动机)
2. [核心思想：3D 即 1D 序列](#2-核心思想3d-即-1d-序列)
3. [方法架构](#3-方法架构)
4. [关键技术细节](#4-关键技术细节)
5. [输入与输出：每个任务的 I/O 规格](#5-输入与输出每个任务的-io-规格)
6. [支持的任务与数据类型](#6-支持的任务与数据类型)
7. [性能表现](#7-性能表现)
8. [代码与复现指南（含可运行示例）](#8-代码与复现指南含可运行示例)
9. [数据管线源码走读](#9-数据管线源码走读)
10. [与晶体性质预测研究方向的相关性](#10-与晶体性质预测研究方向的相关性)
11. [常见问题（FAQ）](#11-常见问题faq)
12. [引用](#12-引用)

---

## 1. 背景与动机

### 1.1 当前 3D 结构建模的困境

3D 结构建模在多个科学尺度上都至关重要——从小分子药物设计、蛋白质折叠、聚合物模拟，到晶体结构预测和宏观 3D 物体重建。尽管不同尺度的 3D 结构都共享**空间稀疏性**和**层级几何模式**，现有方法却高度碎片化：

- **领域专用**：模型针对小分子/蛋白质/晶体单独设计，权重和表征不能复用；
- **任务隔离**：生成（de novo 设计）和理解（性质回归、结合预测）通常用不同架构；
- **跨尺度泛化弱**：同一模型很难同时处理 Å 级原子结构与 m 级宏观物体。

更具体的工程痛点在于**表示**：

- 直接用稠密体素（voxel grid），即便仅 32³ 也要 ~3 万 token，序列开销巨大；
- 直接用全连接图/点云，对自回归建模不友好，也很难做"由粗到细"的分层条件；
- 扩散模型虽强，但每步 denoise 都要前向整张图，**推理慢**。

### 1.2 Uni-3DAR 的目标

Uni-3DAR 提出一个**统一的、跨尺度的自回归框架**，用单一 Transformer 同时支持多种 3D 数据和多类任务，核心理念是：

> **将 3D 结构压缩为短的离散 token 序列，再用因果自回归 Transformer 建模。**

---

## 2. 核心思想：3D 即 1D 序列

> **"将多样的 3D 结构通过八叉树（Octree）数据结构，先做粗到细的层次压缩，再用两级子树压缩进一步降到 8× 短，最终用自回归方式建模。"**

这一范式带来三大优势：

1. **统一表示**：分子、蛋白、晶体、宏观物体都可写成同一种 token 序列；
2. **统一学习目标**：因果 Transformer 既能"采样下一 token"做生成，也能在 `[EoS]` 或叶级 token 上接预测头做理解；
3. **高效压缩**：仅需**数百个 token**即可表征完整 3D 空间，对比稠密体素（数万 token）和扩散模型（多步迭代），推理可达 **~21.8×** 加速。

---

## 3. 方法架构

### 3.1 整体框架

```
         3D 结构（分子 / 蛋白 / 晶体 / 宏观物体）
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │ ① Coarse-to-Fine 八叉树 Tokenizer    │
        │   （只对非空格细分，剪枝空区域）      │
        └──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │ ② 两级子树压缩（最高 8× 压缩）        │
        │   把"父节点 + 8 子格占据"合并为一个   │
        │   256 类（2^8）单 token              │
        └──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │ ③ 叶级"3D Patch" 细粒度 token        │
        │   原子任务: (atom_type, Δxyz)         │
        │   宏观形状: VQ-VAE patch code         │
        └──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────────┐
        │ ④ Masked Next-Token Prediction       │
        │   (位置已知 + 内容预测) 的因果 Transformer │
        └──────────────────────────────────────┘
                       │
              ┌────────┴─────────┐
              ▼                  ▼
         生成任务            理解任务
       (de-novo/CSP/PXRD) (HOMO/LUMO/binding…)
```

### 3.2 核心组件详解

#### ① Coarse-to-Fine 八叉树 Tokenizer

- 把整个结构装入一个根立方体；如果某个立方体内部"非空"，就一分为 8 递归细分，深度至 L 层；
- **空分支直接剪枝**，所以序列只编码"有几何信息"的部分；
- 每个 token 同时携带**层级 ℓ**、**体素中心坐标**等位置元数据，下层位置可由上一层已生成的占据状态推断。

代码侧入口：`uni3dar/data/grid_dataset.py` 的 `GridDataset` 把单个样本转成 octree token；任务级开关：

| CLI 参数 | 含义 | 典型值 |
| --- | --- | --- |
| `--grid-len` | 最细级体素的物理边长（Å 或一般长度单位） | QM9: `0.24`，蛋白 binding: `0.48` |
| `--xyz-resolution` | 叶级原子坐标量化精度 | `0.01` |
| `--merge-level` | 子树合并/压缩深度（影响序列长度与模型大小） | QM9: `6`，MP20-PXRD: `8`，binding: `10` |
| `--recycle` | 序列循环展开次数 | QM9: `1`，MP20: `2` |

#### ② 两级子树压缩（Two-Level Subtree Compression）

**这是 Uni-3DAR 的关键工程创新之一。**

- 原始 octree 每细分一次需要 8 个二元 token（每个子格"空/非空"）。
- Uni-3DAR 把这 8 个二元位**合并为一个 8-bit 整数**，即一次预测 2⁸ = 256 类。
- 序列长度因此**降为原来的约 1/8**；位置仍然由父节点中心 + 层级隐式给出。

直觉地：原本"读 8 个 0/1 才知道一格内部哪几块非空"，现在**一个 256 类 token 一次性给出**。这与 BPE/字节合并的思想异曲同工。

#### ③ 叶级 3D Patch 细粒度 token

- 微观体系（分子/晶体/蛋白）：每个非空叶视为一个含若干原子的 patch，进一步用 `(atom_type, Δxyz, …)` 描述。论文中常将 patch 设到**单原子粒度**，从而把"原子类型 + 精确局部坐标"作为分支目标；
- 宏观体系（3D 形状）：可用 VQ-VAE 把 patch 几何离散化为补丁 code（论文附录 B）。

训练损失因此是**多路加权交叉熵**，对应仓库里 `uni3dar/losses/ar_loss.py`：

```
loss = λ_tree  · CE(树占据 256 类)
     + λ_atom  · CE(原子类型)
     + λ_xyz   · CE(坐标量化 token)
     + λ_count · CE(原子计数, 仅晶体)
     + ...
# CLI 中对应 --loss-ratio-tree / --loss-ratio-atom / --loss-ratio-xyz / --loss-ratio-count
```

#### ④ Masked Next-Token Prediction（MNTP）

**问题**：八叉树剪枝后，"下一个非空 token"的物理位置**不均匀**——既不是文本中的 +1 字符，也不是稠密体素中的下一个格。如果把"下一位置"硬塞进当前 token，论文实验显示会引入显著噪声。

**Uni-3DAR 的做法**（直观地）：

1. 把每个 token 在序列里**复制成两份**：
   - 第一份：**内容置为 `[MASK]`**，但**位置嵌入是真实的下一格位置**；
   - 第二份：**位置同上**、**内容是真实 token**。
2. 因果注意力照常前向；模型在 `[MASK]` 位置上学**预测紧随其后的真实内容**。

效果：

- 等价于把"动态位置上的 next-token 预测"，转化为"已知位置上的 masked content 填空"；
- **不引入双向注意力**，仍是一条因果链，可流式采样；
- 代价是序列**约翻倍**，但通过实现优化，推理延迟仅相对标准 next-token +15%~30%，精度收益显著。

---

## 4. 关键技术细节

| 技术 | 工程对应 (CLI / 文件) | 作用 |
| --- | --- | --- |
| **八叉树编码** | `--grid-len` / `GridDataset` | 高效表示稀疏 3D 结构 |
| **两级子树压缩** | `--merge-level` / 256 类树头 | 序列长度最高降低 **8×** |
| **MNTP** | `uni3dar/models/uni3dar.py` 中的 `DecoderInputFeat` / `DecoderGenTargetFeat` | 解决动态位置的下一 token 预测 |
| **多任务多头** | `--loss ar` + 多个 `--loss-ratio-*` | 单一模型联合优化树/原子/坐标/计数 |
| **几何增广** | `--tree-delete-ratio`、`--random-rotation-prob`、`--crystal-random-shift-prob` | 抗过拟合，提高 OOD 稳健性 |
| **EMA + bf16** | `--ema-decay 0.999 --validate-with-ema --bf16` | 训练稳定性 + 显存友好 |

---

## 5. 输入与输出：每个任务的 I/O 规格

Uni-3DAR 训练阶段统一吃 LMDB 数据库，推理阶段按任务输出标准结构文件。

### 5.1 训练输入：LMDB

- 路径形如 `data_path/train.lmdb`、`data_path/valid.lmdb`，可叠加 `.gz`；
- 每条记录是一个 Python 字典，常见字段：

```python
{
  "atom_type":      [int, ...],         # 原子序数 / 元素索引
  "atom_pos":       [[x, y, z], ...],   # 笛卡尔坐标，单位 Å
  "lattice_matrix": [[ax,ay,az], ...],  # 仅晶体；3×3 晶格矩阵
  "pxrd":           [intensity, ...],   # 仅 PXRD-CSP；衍射谱向量
  "target":         [float, ...],       # 仅性质回归；多目标向量
  "pocket_label":   [0/1, ...],         # 仅蛋白 binding；每原子标签
}
```

通过 `--atom-type-key`、`--atom-pos-key`、`--lattice-matrix-key`、`--mol-target-key`、`--atom-target-key` 指定字段名，因此**自定义数据集只需把字段映射到这套 key 即可**。

### 5.2 推理输出

| 任务 | 输出文件 | 内容 |
| --- | --- | --- |
| QM9 / DRUG 分子生成 | `*.xyz` | 多分子拼接：每段先一行原子数 `N`，一行注释，后接 N 行 `element x y z` |
| MP20 晶体生成 / CSP / PXRD-CSP | `*.cif` | 多晶体拼接；每段以 `data_<id>` 起头，含晶格、原子分数坐标 |
| 评估指标 | `*.xyz.json` / `*.cif.json` | 由 `evaluation_scripts/{qm9,crystal}/` 下的脚本生成 |

> ⚠️ 推理脚本会**自动调用**对应评测：
>
> - QM9: `evaluation_scripts/qm9/molecule_metrics.py`（有效性、稳定性、唯一性等）；
> - 晶体: `evaluation_scripts/crystal/crystal_metrics.py`（match rate、RMSE、validity 等）。

---

## 6. 支持的任务与数据类型

### 6.1 支持的 3D 数据类型

| 类型 | 尺度 | 数据集示例 | `--data-type` |
| --- | --- | --- | --- |
| 🧪 **小分子** | Å | QM9, GEOM-DRUG | `molecule` |
| 🧬 **蛋白质** | nm | 蛋白结合位点（binding） | `protein` |
| 🔗 **聚合物** | nm-µm | 聚合物结构建模 | `molecule` (扩展) |
| 💎 **晶体** | nm | MP20 | `crystal` |
| 🏗️ **宏观 3D 物体** | m | 论文附录 | `mesh/voxel` (扩展) |

### 6.2 支持的任务

| 任务类别 | 具体任务 | 仓库内对应脚本 |
| --- | --- | --- |
| 🎨 **生成** | de-novo 分子生成 | `scripts/inference_qm9.sh`, `inference_drug.sh` |
| 🎨 **生成** | de-novo 晶体生成 | `scripts/inference_mp20.sh` |
| 🔬 **结构预测** | 晶体结构预测 (CSP) | `scripts/inference_mp20_csp.sh` |
| 🔬 **结构预测** | PXRD 引导 CSP | `scripts/inference_mp20_pxrd.sh` |
| 📊 **性质预测** | HOMO/LUMO/GAP, E1-CC2…, 偶极矩, aIP, D3 disp | `scripts/train_rep_downstream.sh` |
| 🧩 **结合预测** | 蛋白口袋 binding | `scripts/train_rep_downstream.sh task=binding` |

---

## 7. 性能表现

### 7.1 与扩散模型的对比

| 维度 | 相对 SOTA 扩散基线 |
| --- | --- |
| **生成质量** | 多个数据集上最高 **+256%** 相对提升 |
| **推理速度** | 最高 **21.8×** 加速 |
| **序列长度** | 数百 token vs. 数万 token（稠密体素） |

### 7.2 主要优势总结

1. **统一性**：单一架构覆盖分子/蛋白/晶体/宏观物体；
2. **高效率**：因果一遍前向 + 短序列，推理远快于扩散模型；
3. **高精度**：细粒度 patch token 保留原子坐标级细节；
4. **可扩展性**：从 Å 级分子到 m 级形状的同一框架。

---

## 8. 代码与复现指南（含可运行示例）

### 8.1 代码与权重

- **GitHub**：[dptech-corp/Uni-3DAR](https://github.com/dptech-corp/Uni-3DAR)（本地：`Uni-3DAR-study/code/Uni-3DAR/`）
- **预训练权重 + 数据**：[huggingface.co/dptech/Uni-3DAR](https://huggingface.co/dptech/Uni-3DAR/tree/main)
- **官方主页**：[uni-3dar.github.io](https://uni-3dar.github.io)

### 8.2 环境

推荐直接用官方镜像（含 [Uni-Core](https://github.com/dptech-corp/Uni-Core) 训练栈）：

```bash
docker pull dptechnology/unicore:2407-pytorch2.4.0-cuda12.5-rdma
```

进入容器后，确认：

```bash
which unicore-train     # 应输出 /opt/conda/bin/unicore-train 类路径
nvidia-smi
```

> 大陆网络下载 HF 权重可设：
>
> ```bash
> export HF_ENDPOINT=https://hf-mirror.com
> ```
>
> 然后参考 `Uni-3DAR-study/scripts/download_hf_all.sh`。

### 8.3 已发布权重一览

| 数据集 | 类型 | 权重文件 | 说明 |
| --- | --- | --- | --- |
| QM9 | 小分子生成 | `qm9.pt` | 4×16=64 batch, 12 层, 768 维, `merge_level=6` |
| GEOM-DRUG | 类药分子生成 | `drug.pt` | 8×16=128 batch |
| MP20 | 晶体 de-novo | `mp20.pt` | `data-type=crystal` |
| MP20 CSP | 晶体结构预测 | `mp20_csp.pt` | 给定组分预测结构 |
| MP20 PXRD-CSP | PXRD 引导 CSP | `mp20_pxrd.pt` | 24 层 / 1024 维, 大模型 |
| 分子下游预训练 | 性质回归 backbone | `mol_pretrain_weight.pt` | finetune 入口 |
| 蛋白下游预训练 | binding backbone | `protein_pretrain_weight.pt` | finetune 入口 |

### 8.4 推理示例（一行命令出结构）

> 以下命令的工作目录均假定为 `Uni-3DAR-study/code/Uni-3DAR/`。

#### (a) QM9 分子生成

```bash
# 输入: qm9.pt 预训练权重（无需任何输入数据，纯采样）
# 输出: ./qm9.pt_res_s1_tt0.9_at0.3_xt0.3_ct1.0_ns10000_rr0.1_rbatom.xyz
#       同名 .json 评测结果
bash scripts/inference_qm9.sh /path/to/qm9.pt
```

可调环境变量（直接 `KEY=VAL bash ...`）：

- `num_samples=10000`：生成分子数；
- `tree_temperature=0.9 / atom_temperature=0.3 / xyz_temperature=0.3`：分别控制几何骨架/元素类型/坐标的随机性，越大越多样；
- `rank_by="atom"`、`rank_ratio=0.1`：按原子数对生成结果排序并保留前 10%。

#### (b) MP20 晶体 de-novo 生成

```bash
# 输入: mp20.pt + ./mp20_data/test.csv（提供组分模板，可替换）
# 输出: *.cif（多晶体）+ *.cif.json（match rate 等）
bash scripts/inference_mp20.sh /path/to/mp20.pt ./mp20_data/test.csv
```

#### (c) MP20 晶体结构预测 (CSP)

```bash
# 输入: 已知化学组分 → 预测原子摆放与晶格
data_path=./mp20_data/ \
  bash scripts/inference_mp20_csp.sh /path/to/mp20_csp.pt
```

#### (d) PXRD 引导的晶体结构预测

```bash
# 输入: PXRD 谱 + 化学组分 → 预测晶体结构
data_path=./mp20_data/ \
  bash scripts/inference_mp20_pxrd.sh /path/to/mp20_pxrd.pt
```

### 8.5 训练示例（从零或继续训练）

#### (a) QM9 训练

```bash
# 假定数据已解压到 ./qm9_data，输出落在 ./results/my_qm9_exp
base_dir=./results batch_size=16 \
  bash scripts/train_qm9.sh ./qm9_data/ my_qm9_exp
```

脚本默认 4 卡，每卡 batch 16 → 总 batch 64；通过环境变量 `n_gpu=1 batch_size=8` 等可单卡跑通。日志在 `results/my_qm9_exp/log_0.txt`，checkpoint 在 `results/my_qm9_exp/ckpt/`。

#### (b) MP20 三种晶体任务训练

```bash
# de-novo 生成
base_dir=./results batch_size=16 \
  bash scripts/train_mp20.sh ./mp20_data/ mp20_gen_exp

# CSP
base_dir=./results batch_size=8 \
  bash scripts/train_mp20_csp.sh ./mp20_data/ mp20_csp_exp

# PXRD-CSP（更大模型: 24 层 / 1024 维）
base_dir=./results batch_size=8 \
  bash scripts/train_mp20_pxrd.sh ./mp20_data/ mp20_pxrd_exp
```

#### (c) 性质回归微调（以 HOMO 为例）

```bash
task=homo   # 也可 lumo / gap / E1_CC2 / Dipmom_Debye / aIP_eV / D3_disp_corr_eV
bash scripts/train_rep_downstream.sh \
    ./mol_downstream/scaffold_ood_qm9 \
    ./results/finetune \
    $task \
    /path/to/mol_pretrain_weight.pt \
    "5e-5 1e-4"     # lr 网格
    "32 64"         # batch_size 网格
    "200"           # epoch
    "0.0"           # pooler_dropout
    "0.06"          # warmup ratio
    "0 1 2"         # 三个随机种子
```

脚本内部会**自动遍历**这五个超参网格 ×3 个 seed，并把结果记在 `./results/finetune/<task>_lr*_bsz*_epoch*_dropout*_warmup*_seed*/log.txt`，方便做小型 grid search。

#### (d) 蛋白结合位点预测微调

```bash
task=binding
bash scripts/train_rep_downstream.sh \
    ./protein_downstream/binding \
    ./results/finetune \
    $task \
    /path/to/protein_pretrain_weight.pt \
    "5e-5 1e-4" "32 64" "100" "0.1" "0.06" "0"
```

### 8.6 采样温度的工程含义（一图看懂）

| 参数 | 影响的 token 类别 | 调大 → | 调小 → |
| --- | --- | --- | --- |
| `tree_temperature` | 树占据 256 类 | 拓扑更多样 | 容易塌缩到训练分布 |
| `atom_temperature` | 元素类型 | 元素更杂 | 偏好高频元素 |
| `xyz_temperature` | 坐标量化 token | 局部位置更随机 | 局部更"干净"但易卡模 |
| `count_temperature` | 原子计数（晶体特有） | 体系大小更分散 | 趋于高频晶胞规模 |
| `rank_by` / `rank_ratio` | 后处理筛选 | — | 取前 N% 结构作为最终结果 |

---

## 9. 数据管线源码走读

下面这段示意来自仓库 `uni3dar/tasks/uni3dar.py` 与 `uni3dar/data/`，便于理解一条记录是如何被切成 token 的：

```python
# 概念示意（简化自 uni3dar/tasks/uni3dar.py）
from uni3dar.data import (
    LMDBDataset,
    DataTypeDataset,
    ConformationSampleDataset,
    GridDataset,
    NestedDictionaryDataset,
)

raw   = LMDBDataset(f"{data_path}/train.lmdb", gzip=True)
typed = DataTypeDataset(raw, data_type="crystal")        # molecule/protein/crystal
conf  = ConformationSampleDataset(typed, seed=1)         # 多构象时随机采一帧
grid  = GridDataset(                                     # 八叉树 + 子树压缩
    conf,
    grid_len=0.24,
    merge_level=8,
    xyz_resolution=0.01,
    atom_type_key="atom_type",
    atom_pos_key="atom_pos",
    lattice_matrix_key="lattice_matrix",
)
batch = NestedDictionaryDataset(grid)                    # → 喂给 unicore-train

# 每条 batch 里关键字段：
#   tree_tokens    : (B, L_tree)        # octree+子树压缩后的 256 类标签
#   atom_tokens    : (B, L_atom)        # 元素 id
#   xyz_tokens     : (B, L_atom, 3)     # 量化后的局部坐标
#   pos_emb_meta   : (B, L_total, ...)  # MNTP 用的层级/中心坐标
#   target_*       : 训练时多路 CE 的标签
```

模型侧 (`uni3dar/models/uni3dar.py`) 把上述多路输入拼接成因果 1D 序列，喂给 `transformer_encoder.py` 中的因果 Transformer，输出多个 head：

```
hidden = CausalTransformer( concat(tree, atom, xyz, [MASK twins], cond) )
└── head_tree (256 类)            ──→ 下一格占据
└── head_atom (|elements| 类)     ──→ 元素
└── head_xyz  (R 类 × 3)          ──→ 坐标量化 bin
└── head_count (晶体)             ──→ 原子总数
└── head_global ([EoS] 上)        ──→ 性质回归 / 分类
└── head_local  (叶 token 上)     ──→ 每原子标签（如 binding）
```

---

## 10. 与晶体性质预测研究方向的相关性

> 王逸轩同学的方向：**用于高通量筛选的晶体性质预测并推理站点贡献**。

### 10.1 直接关联点

| 你的需求 | Uni-3DAR 的对应支持 | 落地路径 |
| --- | --- | --- |
| 🔬 晶体结构生成 | `--data-type crystal` + MP20 de-novo 流程 | `train_mp20.sh` / `inference_mp20.sh` |
| 📊 晶体性质预测 | 分子性质 finetune 框架可平移到晶体 | 复用 `train_rep_downstream.sh` 的 `--mol-target-*` 改为 `--atom-target-*` 形式 |
| 💎 给定组分预测结构 (CSP) | 专门的 CSP 通道 | `train_mp20_csp.sh` / `inference_mp20_csp.sh` |
| 🔄 高通量筛选 | 推理 ~21.8× 快于扩散 | 一次 `inference_mp20.sh` 产 10k+ 候选 |
| 🎯 推理站点贡献 | 叶级 token 上有局部 head（如 binding 通道演示） | 仿照 `task=binding` 在晶体上加 site-level head |
| 🧪 PXRD 引导反演 | 已开放完整 PXRD-CSP 流程 | `train_mp20_pxrd.sh` / `inference_mp20_pxrd.sh` |

### 10.2 对你的潜在工作流建议

1. **预训练表征复用**：先用 `mol_pretrain_weight.pt` 风格的方式在 MP20 / Alex / OQMD 上预训练一个晶体 backbone，再 finetune 到具体性质（formation energy、bandgap 等）；
2. **高通量虚拟筛选**：`inference_mp20.sh num_samples=100000` 一次出 10 万候选 → 性质模型打分 → 取 top-K；
3. **逆向设计**：把目标性质做条件向量（与 PXRD 同样的 cond 注入方式），用条件自回归直接采样满足约束的晶体；
4. **站点贡献**：复用 `binding` 头部在晶体叶级 token 上的设计，做"每原子贡献"回归，结合 attention/IG 即可输出位点级解释。

---

## 11. 常见问题（FAQ）

1. **`unicore-train` 找不到** — 没装 [Uni-Core](https://github.com/dptech-corp/Uni-Core) 或没进 Docker。`which unicore-train` 应有输出。
2. **显存不足** — 调小 `batch_size`、`emb_dim`、`layer`；如要继续加载预训练权重，宽度/深度需匹配 checkpoint。
3. **数据路径报错** — 确认 `train.lmdb`/`valid.lmdb` 在 `data_path` 下，且与 `--gzip` 一致。
4. **HF 下载慢** — `export HF_ENDPOINT=https://hf-mirror.com` 后再用 `Uni-3DAR-study/scripts/download_hf_all.sh`。
5. **采样产物全是噪声** — 先确认 `--grid-len`、`--merge-level`、`--xyz-resolution` 与训练时一致；推理脚本里的这三个值一旦改动，必须重训对应权重。
6. **想做新数据集** — 把样本写成 `{atom_type, atom_pos[, lattice_matrix][, target]}` 的 LMDB，复用 `train_qm9.sh` 或 `train_mp20.sh` 修改 `--data-type` 与若干 `*-key` 即可。

---

## 12. 引用

```
@article{lu2025uni3dar,
  author  = {Shuqi Lu and Haowei Lin and Lin Yao and Zhifeng Gao and
             Xiaohong Ji and Yitao Liang and Weinan E and
             Linfeng Zhang and Guolin Ke},
  title   = {Uni-3DAR: Unified 3D Generation and Understanding via
             Autoregression on Compressed Spatial Tokens},
  journal = {arXiv preprint arXiv:2503.16278},
  year    = {2025},
}
```

---

## 📚 参考资料

- [arXiv 论文](https://arxiv.org/abs/2503.16278)
- [GitHub 仓库](https://github.com/dptech-corp/Uni-3DAR)
- [Hugging Face 模型与数据](https://huggingface.co/dptech/Uni-3DAR)
- [项目主页](https://uni-3dar.github.io)
- 本地参考资料：
  - `Uni-3DAR-study/论文阅读报告_Uni-3DAR.md`
  - `Uni-3DAR-study/使用说明_Uni-3DAR.md`
  - `Uni-3DAR-study/code/Uni-3DAR/scripts/`

---

> 📝 _本文整合 arXiv:2503.16278 v3、GitHub `code/Uni-3DAR/` 当前 main 分支脚本与本项目本地使用经验整理；CLI 默认值若上游更新，以仓库最新 `scripts/*.sh` 为准。_
