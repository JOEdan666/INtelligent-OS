# 学伴 (Learning Partner && Xue Ban) 【INtelligent OS】
**Developed by JOEdan**

**一个 AI 驱动的结构化自学系统，用可验证的学习闭环替代低效的一对一辅导。**

---

## 项目愿景

### 我们要解决的问题

传统辅导模式存在根本性缺陷：
- 学生被动听讲，无法验证是否真正掌握
- 辅导费用高昂，难以持续
- 学习过程不可追溯，家长无法了解真实进度

普通 AI 聊天机器人同样无法解决问题：
- 问答式交互缺乏学习结构
- 没有理解确认和掌握验证环节
- 无法形成完整的学习闭环

### 我们的方案

智学引擎将学习过程结构化为 **可验证的闭环流程**：

```
讲解 → 确认 → 测验 → 复习 → 结果分析
```

每个知识点都必须经过完整闭环，学生的掌握程度有据可查。

---

## 核心学习流程

### 30 分钟完成一个知识点的完整学习

| 步骤 | 名称 | 说明 |
|------|------|------|
| 1 | **讲解 (Explain)** | AI 针对学生薄弱点生成个性化讲解，支持苏格拉底式追问 |
| 2 | **确认 (Confirm)** | 学生确认理解后进入测验，或请求更多解释 |
| 3 | **测验 (Quiz)** | 3 道针对性诊断题，覆盖核心知识点和常见错误类型 |
| 4 | **复习 (Review)** | 变式题验证迁移能力，同一知识点、不同情境 |
| 5 | **结果 (Result)** | AI 分析错误类型、知识盲区，给出改进建议 |

---

## 核心功能 (MVP)

### 学生端体验

- **结构化学习流程**：不是自由聊天，而是有明确步骤的学习路径
- **数学公式渲染**：完整支持 LaTeX 数学公式 (KaTeX)
- **地区课程对齐**：题目难度和知识点匹配本地考试大纲
- **苏格拉底式追问**：讲解阶段支持"再问一下"深入理解

### 学习结果可见性

- **错题自动收集**：错误答案记录并关联知识点
- **学习会话记录**：每次学习过程完整保存
- **AI 分析报告**：识别错误类型、给出针对性建议

### 已实现的辅助功能

- **知识库管理**：上传 PDF、图片等学习资料
- **笔记系统**：支持知识点关联和双向链接
- **Chrome 扩展**：在任意网页上划词学习

---

## 系统架构

### 技术栈

| 层级 | 技术选型 |
|------|----------|
| 前端框架 | Next.js 14 + React 18 + TypeScript |
| 样式方案 | Tailwind CSS + Ant Design |
| 状态管理 | Zustand |
| 数据库 | PostgreSQL (Prisma ORM) |
| 用户认证 | Clerk (支持游客模式) |
| AI 模型 | DeepSeek (主) / 讯飞星火 (备) |
| 部署平台 | Vercel / 阿里云 ECS / Docker |

### 数据模型

```
LearningSession  ─── 学习会话，追踪单个知识点的学习路径
    │
    ├── QuizQuestion  ─── 测验题目
    │
    └── UserAnswer    ─── 学生答案

Conversation     ─── 对话历史
UserProfile      ─── 学生档案（年级、地区、学习目标）
WrongQuestion    ─── 错题本
```

### 关键设计

- **本地持久化降级**：开发环境默认使用本地 JSON 存储；若 PostgreSQL 不可用，会自动切换到本地持久化 fallback
- **会话去重**：同一用户、同一学科、同一知识点不会创建重复会话
- **流式响应**：AI 回答实时输出，提升交互体验
- **消息限制**：单次对话最多 32 条消息，防止 token 溢出

---

## 项目状态

### 当前能力

- ✅ 完整的 5 步学习闭环
- ✅ 数学公式和代码块渲染
- ✅ 用户认证 + 游客模式
- ✅ 学习会话持久化
- ✅ 错题收集和知识点关联
- ✅ Chrome 扩展集成
- ✅ 多平台部署支持

### 已知限制

- 变式题生成可能超时（当前限制 180 秒）
- 题目生成依赖 AI 实时调用，无本地题库缓存
- 向量相似度搜索尚未启用（RAG 功能受限）
- 学习数据分析仅限单次会话，无跨会话统计

---

## 路线图

### 短期目标（基于当前代码）

1. **启用 pgvector**：实现真正的知识点向量检索
2. **题库预生成**：减少实时生成延迟
3. **跨会话统计**：学习时长、正确率趋势、知识点覆盖
4. **错题复习调度**：基于间隔重复算法

### 中期目标

1. **家长端报告**：可视化学习进度和薄弱环节
2. **多学科支持**：扩展到语文、英语等学科
3. **移动端适配**：响应式优化 + PWA

---

## 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 14+ (可选，有内存降级)
- pnpm 或 npm

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/JOEdan666/Learning-System.git
cd Learning-System

# 安装依赖
pnpm install

# 配置环境变量
cp .env.example .env.local
# 编辑 .env.local，填入必要配置

# 数据库迁移（仅在需要连接真实 PostgreSQL 时）
npx prisma migrate dev

# 启动开发服务器
pnpm dev
```

### 必要环境变量

```bash
# AI 服务
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat

# 本地开发数据库模式（默认 local）
DEV_DATABASE_MODE=local

# 数据库（仅在 DEV_DATABASE_MODE=remote 或生产环境时需要）
DATABASE_URL=postgresql://...

# 认证（可选）
CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx

# 开发模式
ENABLE_MEMORY_DB_FALLBACK=true
```

---

## 适用人群

### 学生

- 希望自主掌控学习节奏
- 需要针对性练习和即时反馈
- 想要可追溯的学习记录

### 家长

- 关注孩子真实学习效果，而非"上了多少课"
- 希望了解具体薄弱环节
- 寻求高性价比的学习方案

### 开发者 / 协作者

- 对 AI + 教育交叉领域感兴趣
- 有 Next.js / React 开发经验
- 希望参与早期产品打磨

---

## 项目结构

```
├── app/
│   ├── api/                 # API 路由
│   │   ├── conversations/   # 会话管理
│   │   ├── openai-chat/     # AI 对话
│   │   ├── generate-question/ # 题目生成
│   │   └── partner/         # 学习伙伴
│   ├── components/          # React 组件
│   │   ├── LearningFlow/    # 学习流程组件
│   │   └── Dashboard/       # 仪表盘组件
│   ├── services/            # 业务逻辑
│   └── lib/                 # 工具函数
├── prisma/
│   └── schema.prisma        # 数据模型
├── chrome-extension/        # 浏览器扩展
└── public/                  # 静态资源
```

---

## 贡献

欢迎提交 Issue 和 Pull Request。

如果你对这个项目感兴趣，可以：
1. Star 这个仓库
2. 试用并反馈问题
3. 参与代码贡献

---

## 许可证

MIT License

---

### 网址：https://learning-system-inky-zeta.vercel.app
### 国内网址（中国大陆）xueban.org

> 这是一个正在积极开发的项目。我们相信，结构化的学习流程比无结构的问答更有效。如果你也认同这个理念，欢迎加入。
> ##我们推崇简约现代化的乔布斯式设计美学，这个可以在我们的网页中体现，哈哈##
