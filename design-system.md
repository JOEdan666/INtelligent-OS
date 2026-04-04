# Apple Minimalist Dark Mode Design System

## 1. 颜色系统 (Color Scheme)

我们制定了一套基于苹果设计理念的深色模式配色方案，确保高对比度和深邃的高级感。

### 核心调色板
- **Main Background (`var(--bg-main)`)**: `#000000` ~ `#121212` 的深邃渐变，提供无尽的空间感。
- **Card Background (`var(--bg-card)`)**: `#1E1E1E`，用于层级划分，与主背景形成微妙对比。
- **Glass Panel (`var(--bg-glass)`)**: `rgba(30, 30, 30, 0.4)`，结合 20px 高斯模糊，用于浮动面板和底部工具栏。
- **Accent Color (`var(--accent)`)**: `#0A84FF`，经典的 Apple 蓝色，用于核心可交互元素和强调。
- **Primary Text (`var(--text-primary)`)**: `#FFFFFF`，纯白高亮，确保 WCAG 2.2 AA 对比度。
- **Secondary Text (`var(--text-secondary)`)**: `#A1A1A6`，优雅的浅灰色，用于辅助信息。
- **Border (`var(--border-color)`)**: `rgba(255, 255, 255, 0.08)`，极细边框，提供结构而不喧宾夺主。

---

## 2. 排版系统 (Typography)

优先使用 Apple 的系统字体栈，打造原生的阅读体验。

- **Font Family**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "Helvetica Neue", Arial, sans-serif`
- **Font Weights**: 400 (Regular), 500 (Medium), 600 (Semibold)
- **Line Height**: 1.4 ~ 1.6，优化长文本阅读。
- **Font Scale**:
  - `Title 1`: 34px, Weight 600, Tracking -0.02em
  - `Title 2`: 28px, Weight 600, Tracking -0.02em
  - `Headline`: 22px, Weight 600, Tracking -0.01em
  - `Body`: 17px, Weight 400, Line Height 1.5
  - `Callout`: 16px, Weight 500
  - `Subhead`: 15px, Weight 400
  - `Footnote`: 13px, Weight 400
  - `Caption 1`: 12px, Weight 400

---

## 3. 核心组件库 (Core Components)

### 按钮 (Buttons)
- **Primary Button (`.apple-btn`)**: 
  - 无边框，圆角 8px
  - 背景：`#0A84FF`
  - 交互：Hover 放大 `scale(1.02)`，亮度提升 10%；Active 缩小 `scale(0.98)`，透明度 90%。
  - 过渡：`200ms ease-out`
  - 阴影：`0 2px 8px rgba(10, 132, 255, 0.2)`
- **Secondary Button (`.apple-btn-secondary`)**:
  - 1px 极细边框 (`rgba(255,255,255,0.08)`)，背景 `#1E1E1E`
  - 交互：Hover 背景变为 `rgba(255,255,255,0.06)`，Active 变为 `rgba(255,255,255,0.08)`。

### 输入框 (Inputs)
- **Text Input (`.apple-input`)**:
  - 圆角 8px，背景 `rgba(255,255,255,0.04)`
  - 交互：Focus 状态边框变为 `#0A84FF`，外发光 `0 0 0 3px rgba(10, 132, 255, 0.3)`。

### 卡片与面板 (Cards & Panels)
- **Standard Card (`.apple-card`)**: 圆角 12px，背景 `#1E1E1E`，1px 极细边框，微弱阴影 `0 8px 32px rgba(0,0,0,0.4)`。
- **Glass Panel (`.apple-glass`)**: 引入玻璃拟态效果（backdrop-filter blur 20px、半透明填充 40%、1px 内阴影 `inset 0 1px 0 rgba(255,255,255,0.06)`）。

### 列表与选项 (List Items)
- **List Item (`.apple-list-item`)**: 
  - 圆角 8px，悬浮/点击状态有 4–8% 透明度变化。
  - Hover `scale(1.01)`，Active `scale(0.99)`。

### 开关 (Toggle Switch)
- **Toggle (`.apple-toggle`)**: 
  - 150ms 缓动动画，选中时背景平滑过渡为 `#0A84FF`，滑块阴影增加立体感。

---

## 4. 交互走查文档 (Interaction Walkthrough)

### 状态变化
- **Hover 态**: 所有可交互元素均响应鼠标悬浮，产生 2% 的物理放大（`scale: 1.02`）和微弱的背景增亮，暗示可点击性。
- **Click 态**: 鼠标按下时，元素产生向下的物理按压感（`scale: 0.98`），并带有 200ms `ease-out` 的平滑过渡。
- **Loading 态**: 采用极简的细线 Spinner，配合呼吸感的流式文字呈现。
- **转场动画**: 卡片切换采用 Framer Motion 的 `AnimatePresence`，透明度渐变配合 10px 的 Y 轴位移（`y: 10 -> 0`），呈现轻盈的弹出效果。

### 玻璃拟态应用场景
- 底部固定工具栏
- 悬浮提示框 (Toast)
- 模态弹窗 (Modal) 的背景板
- 顶部导航栏 (Navbar) 下滑时的毛玻璃吸顶效果

---

## 5. 响应式与可访问性 (Responsiveness & A11y)

- **断点适配**:
  - Mobile (320px - 767px): 卡片内边距缩小，字体层级下调，按钮满宽。
  - Tablet (768px - 1023px): 适中的网格布局，卡片呈现悬浮感。
  - Desktop (1024px - 1440px+): 最大宽度限制（`max-w-3xl` 等），大面积留白（Whitespace），凸显高级感。
- **对比度**: 确保主文本与背景的对比度 ≥ 4.5:1，次要文本 ≥ 3:1，完全符合 **WCAG 2.2 AA** 标准。

---

## 6. 用户可用性测试计划 (Usability Testing Plan)

### 测试目标
验证重新设计的暗色模式界面在目标用户群体中的可用性、视觉满意度和操作效率。

### 参与者
招募 5 名符合产品目标画像的用户（年龄 18-35 岁，有在线学习习惯，日常使用暗色模式）。

### 核心指标 (KPIs)
1. **满意度评分 (CSAT)**: 目标 ≥ 85%（1-5分制，平均分需达到 4.25 以上）。
2. **Lighthouse 可访问性得分**: 目标 ≥ 95。
3. **任务完成率**: 100%。

### 测试任务
1. **任务 1**: 在暗色模式下阅读一段 500 字的学习内容，评价阅读舒适度。
2. **任务 2**: 完成一组 3 道题的诊断测验，体验选项点击、填空输入和提交反馈的交互。
3. **任务 3**: 在移动端和桌面端设备上进行操作，评价多端体验一致性。

### 预期结果
- 用户能够清晰分辨卡片层级和可点击元素。
- 微动画和玻璃拟态不造成视觉干扰，反而提升了产品的高级感。
- 长时间阅读不产生视觉疲劳。