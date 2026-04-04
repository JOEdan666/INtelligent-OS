# 产品方向重塑与 Idea 验证器实施计划 (Idea Validator Plan)

## 一、 产品定位与核心判断 (Product Strategy)

基于你提供的设想，我作为产品经理给出最直接的判断：

1. **“找学习资源”是伪需求（红海）**：Google、Perplexity 已经做得足够好，用户没有理由专门来你的网站找资源。
2. **“验证 Idea（Idea Validator）”是强痛点真需求（蓝海）**：独立开发者和创业者最怕“闭门造车一个月，发现市面上早就有 10 个一模一样的竞品”。手动去 ProductHunt、Reddit、Google 搜集信息需要几个小时，而通过 AI + 实时搜索，可以把这个过程压缩到 30 秒。
3. **核心差异化（为什么不用 ChatGPT）**：ChatGPT 是通用聊天，需要用户懂 Prompt 并反复追问。我们的产品是**工作流自动化（Workflow）**，用户输入一句话，系统自动执行“搜索 -> 抓取 -> 分析 -> 结构化输出”，直接交付一份极具专业度的\*\*“残酷真相报告 (Harsh Reality Check)”\*\*。

> **关于你说的“还想要更多”**：
> 别急。MVP（最小可行性产品）阶段，最大的忌讳就是“什么都想要”。我们现在的唯一目标是打造 **Aha Moment（顿悟时刻）**：当用户输入一个自以为绝妙的 Idea，系统立刻甩出 3 个他闻所未闻的真实竞品 URL，并指出他的逻辑漏洞时，他就会彻底被折服。其他的功能（历史记录、导出 PDF、团队协作）全部延后。

***

## 二、 信息架构与体验设计 (Information Architecture)

根据你的选择，我们将**把 Idea 验证器作为新模块接入现有系统**，并在首页强曝光。

### 1. 首页 (app/page.tsx) 改造

* **Hero Section**：修改文案，主标题改为：“不要盲目写代码。30秒验证你的产品 Idea。”

* **CTA（行动召唤）按钮**：主按钮改为“💡 立即验证 Idea”，点击跳转至 `/validator` 路由。

* **Bento Grid 调整**：将现有的“学习”相关卡片，替换为“全网竞品扫描”、“SWOT 市场分析”、“Pivot 商业建议”等。

### 2. 全新路由：Idea 验证器 (`/validator`)

* **第一幕（3秒内）**：屏幕中央一个巨大的极简输入框。Placeholder：“描述你的产品想法，例如：一个用 AI 帮程序员自动写周报的浏览器插件...”

* **第二幕（Loading Vibe）**：点击验证后，展示极具极客感的动态加载步骤：

  * `[✓] 提取核心关键词...`

  * `[ ] 正在扫描 ProductHunt 与全网竞品...`

  * `[ ] 正在分析市场痛点与 Reddit 讨论...`

* **第三幕（交付与追问）**：

  * **上半部分（结构化报告）**：展示“市场拥挤度评分 (0-10)”、“直接竞品列表 (带真实 URL)”、“SWOT 分析”。

  * **下半部分（持续对话）**：一个 Chat 界面，基于刚刚生成的报告，用户可以继续追问：“如果我把目标用户改成牙医，竞争会不会小一点？”。

***

## 三、 技术实现方案 (Technical Implementation)

采用 **Vibe Coding** 的思路，最快速度拼装出可用版本，不搞复杂架构。

### 1. 技术栈

* **前端**：Next.js App Router + Tailwind CSS + Framer Motion (现有环境完美支持)。

* **后端 API**：Next.js Route Handlers。

* **LLM**：使用现有的 OpenAI 接口（如 GPT-4o 或 DeepSeek），要求其强制输出 JSON。

* **搜索引擎 API**：预留第三方搜索 API（如 **Tavily API** 或 **Serper**）的接入点。为了保证你今天就能看到效果，如果环境变量中没有配置 Search API Key，我会写一个 **Mock 搜索机制**，先用逼真的假数据跑通整个全链路交互。

### 2. 核心难点与解决：控制 AI 的“幻觉”

如果直接让 AI 评价 Idea，它会瞎编竞品 URL。
**解决方案（双步 Prompting）**：

1. 前端提交 Idea 到 `/api/validator/search`。
2. 后端调用 Search API 获取真实网页 Snippets。
3. 把真实的网页内容塞进 LLM 的 Context 中，强制要求：“你必须**只基于**以下搜索结果进行分析，引用其中的真实竞品名称和链接，严禁编造”。
4. 将结构化 JSON 返回给前端渲染。

***

## 四、 执行步骤 (Execution Steps)

一旦你确认此计划，我将立即按照以下步骤执行代码修改（无需你再动手）：

* **Step 1: 搭建基础架构与 API**

  * 创建 `/app/api/validator/analyze/route.ts`：处理 Idea 分析逻辑，集成 Search API 调用与 LLM 结构化输出（JSON）。

  * 创建 `/app/api/validator/chat/route.ts`：处理基于报告的后续追问流式对话。

* **Step 2: 构建** **`/validator`** **前端页面**

  * 创建大输入框与沉浸式的 Loading 动画组件。

  * 创建“分析报告”展示组件（仪表盘风格：评分、竞品卡片、SWOT 列表）。

  * 创建底部的追问 Chat 组件。

* **Step 3: 改造首页 (`HeroSection.tsx`)**

  * 重写核心文案，使其聚焦于“Idea 验证与商业分析”。

  * 将 CTA 按钮指向 `/validator`。

  * 更新 Bento Grid 以反映新的产品价值。

* **Step 4: 测试与联调**

  * 使用 Mock 数据测试 UI 交互是否顺畅。

  * 确保深色模式下所有新组件视觉统一、高级。

