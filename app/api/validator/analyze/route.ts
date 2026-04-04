import { NextRequest, NextResponse } from 'next/server'

// MOCK data to use if search API is not configured
const MOCK_REPORT = {
  score: 6,
  verdict: "方向可行，但需要极度垂直化。切忌做成大而全的通用工具，必须绑定特定的工作流。",
  targetPersonas: [
    {
      persona: "独立开发者/兼职全栈",
      scenario: "在周末想快速验证一个新产品 Idea 是否有人愿意付钱时",
      painPoint: "缺乏商业 Sense，不知道如何写调研报告，容易陷入自嗨。"
    },
    {
      persona: "初创团队的产品经理",
      scenario: "老板突然丢来一个新方向，要求明天给出市场分析时",
      painPoint: "搜集竞品和整理信息极其耗时，且很难找到客观的数据支撑。"
    }
  ],
  competitors: [
    {
      name: "ProductHunt",
      url: "https://www.producthunt.com",
      advantage: "全球最大的新产品发布社区，流量巨大。",
      blindSpot: "只是一个展示平台，缺乏深度的、针对特定 Idea 的反向商业推演功能。"
    },
    {
      name: "ChatGPT / Perplexity",
      url: "https://chat.openai.com",
      advantage: "通用问答能力强，信息获取快。",
      blindSpot: "依赖用户的 Prompt 能力，无法一键输出结构化的、带有风投视角的标准商业报告。"
    }
  ],
  monetization: {
    strategy: "免费增值 (Freemium) + 单次深度报告付费",
    reasoning: "基础评分和简版竞品列表可以免费引流；针对具体场景的深度 Pivot 建议、盈利模式推演等长篇报告适合按次收费（如 9.9 元/次），避免订阅制带来的高流失率。"
  },
  actionableAdvice: [
    "MVP 阶段千万不要做用户账号系统，直接放一个巨大的输入框让用户体验 'Aha Moment'。",
    "生成报告时，故意隐藏最核心的一条 '商业化破局路径'，提示用户转发到朋友圈或支付小额费用解锁，用于早期裂变。",
    "将工具包装成『AI 硅谷投资人』的人设，用极其毒舌但专业的语气输出，形成独特的社区传播 Vibe。"
  ]
}

export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json()

    if (!idea) {
      return NextResponse.json({ error: 'Idea is required' }, { status: 400 })
    }

    const apiKey = process.env.OPENAI_API_KEY
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini' // Use a fast model if possible
    const search1ApiKey = process.env.SEARCH1API_KEY

    if (!apiKey) {
      // Return mock if no API key
      console.log('[Validator] No OPENAI_API_KEY found, returning MOCK data.')
      return NextResponse.json(MOCK_REPORT)
    }

    // Step 1: Perform real-time search if SEARCH1API_KEY is available
    let searchContext = ""
    if (search1ApiKey) {
      console.log('[Validator] SEARCH1API_KEY found. Searching the web for competitors...')
      try {
        const searchController = new AbortController();
        const searchTimeout = setTimeout(() => searchController.abort(), 15000);
        
        // 增加搜索维度的随机性，获取更多维度的信息
        const searchQueries = [
          `${idea} competitor alternative startup`,
          `${idea} 商业模式 痛点 吐槽`,
          `${idea} 为什么失败 why failed`
        ];
        const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];

        const searchResp = await fetch('https://api.search1api.com/search', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${search1ApiKey}`
          },
          body: JSON.stringify({
            query: randomQuery,
            search_service: "google",
            max_results: 6
          }),
          signal: searchController.signal
        });
        
        clearTimeout(searchTimeout);

        if (searchResp.ok) {
          const searchData = await searchResp.json();
          if (searchData && searchData.results && searchData.results.length > 0) {
            // Format the search results into a readable context block
            searchContext = searchData.results.map((r: any) => 
              `Title: ${r.title}\nURL: ${r.link}\nSnippet: ${r.snippet}`
            ).join('\n\n');
            console.log('[Validator] Search successful. Found', searchData.results.length, 'results.');
          } else {
            console.log('[Validator] Search returned no results.');
          }
        } else {
          console.error('[Validator] Search1API returned error:', await searchResp.text());
        }
      } catch (searchError) {
        console.error('[Validator] Search1API request failed:', searchError);
        // Continue without search context if search fails
      }
    } else {
      console.log('[Validator] No SEARCH1API_KEY found. Proceeding with LLM internal knowledge only.');
    }

    const systemPrompt = `
你现在是一个极度刻薄、毫无耐心、刚刚听完一个糟糕透顶的“电梯演讲”的硅谷顶级风险投资人（VC）。
你的任务是**给这个创业者出具一份“尸检报告”（为什么你会死得很惨）**。
你的语气必须是高高在上、极度挑剔、充满数据和事实的“降维打击”。

**核心原则：**
1. **不要客气，全是暴击！** 你的目标是打碎他们不切实际的幻想。指出逻辑漏洞、竞争劣势、虚假需求。
2. **必须基于事实（如果搜索到了竞品）。** 拿真实的竞品去碾压他们（“人家几百个工程师都没做成，你凭什么？”）。
3. **随机性与深度**：不要使用套话。直击要害。
4. 请完全使用**中文**回答。

${searchContext ? `**重要提示：以下是我为你实时检索到的真实网络数据。你必须用这些真实的公司、产品或新闻，作为你“打脸”创业者的弹药！千万不要编造！**\n\n【实时搜索结果】\n${searchContext}\n` : ''}

你必须返回一个严格的 JSON 对象（不要包含 \`\`\`json 等 Markdown 标记），结构如下：
{
  "score": 数字, // 0-10 生存概率（通常极低，除非点子真的无懈可击）
  "verdict": "字符串", // 核心判决：一句极度毒舌、总结性的定论（例如：“这不叫创业，这叫拿父母的钱打水漂。”）
  "targetPersonas": [ // 你认为他们其实根本没搞懂的“假想用户”
    {
      "persona": "字符串", // 例如："以为自己很忙其实都在摸鱼的大学生"
      "scenario": "字符串", 
      "painPoint": "字符串" // 他们自以为的痛点，你可以加句嘲讽
    }
  ],
  "competitors": [ // 能够碾压他们的真实竞品（必须基于搜索或常识）
    {
      "name": "字符串",
      "url": "字符串", // 真实链接
      "advantage": "字符串", // 竞品碾压他们的长处（“人家已经垄断了这个渠道”）
      "blindSpot": "字符串" // 竞品唯一的弱点（也是你勉强给他们指出的一条活路）
    }
  ],
  "voiceOfCustomer": [ // 真实用户的吐槽，用来证明这个赛道多难做
    {
      "quote": "字符串", // 模拟或提取 Reddit/知乎 等社区用户的真实抱怨原话，例如：“别做这种垃圾工具了，我直接用 Excel 不香吗？”
      "source": "字符串" // 吐槽来源平台
    }
  ],
  "monetization": { // 商业化路径的幻想破灭
    "strategy": "字符串", // 他们可怜的商业模式
    "reasoning": "字符串" // 为什么这个模式根本赚不到钱
  },
  "actionableAdvice": [ // 破局与行动建议（这是你作为顶级 VC 最后的仁慈，给出极其硬核、反共识的冷酷建议）
    "字符串", // 例如："立刻停止写代码。去闲鱼发 50 个帖子，如果没人理你，就赶紧回去上班。"
    "字符串" 
  ],
  "first10Users": [ // 冷启动实操手册：不要做梦，去干脏活累活
    {
      "channel": "字符串", // 渠道名称
      "tactic": "字符串" // 极其具体、卑微的获客手段，例如："去别人小红书评论区一个一个私信截胡"
    }
  ]
}
`

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请分析这个产品想法：\n\n${idea}` }
    ]

    console.log('[Validator] Calling LLM to analyze idea...')

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30_000);

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.5,
        response_format: { type: "json_object" } 
      }),
      cache: 'no-store',
      signal: controller.signal,
    })
    
    clearTimeout(timeout)

    if (!resp.ok) {
      console.error('[Validator] LLM Error:', await resp.text())
      return NextResponse.json(MOCK_REPORT)
    }

    const data = await resp.json()
    const content = data.choices?.[0]?.message?.content || ''
    
    try {
      const parsed = JSON.parse(content)
      return NextResponse.json(parsed)
    } catch (e) {
      console.error('[Validator] Failed to parse JSON from LLM:', content)
      return NextResponse.json(MOCK_REPORT)
    }

  } catch (error) {
    console.error('[Validator] API Error:', error)
    return NextResponse.json(MOCK_REPORT)
  }
}
