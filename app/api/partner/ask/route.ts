import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/app/lib/prisma';
import { partnerMemory, isDbUnavailable, markMemoryFallback, shouldUseMemory } from '@/app/api/partner/_memory';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function normalizeIntent(intent?: string) {
  const raw = (intent || 'clarify').toString().trim().toLowerCase();
  // Normalize common UI labels / whitespace / hyphen
  const compact = raw.replace(/[-\s]+/g, '_');

  // Map common variants to stable keys
  if (compact === 'next' || compact === 'nextstep' || compact === 'nextsteps' || compact === 'next_step' || compact === 'next_steps') {
    return 'next_steps';
  }
  if (compact === 'brainstorm' || compact === 'brain_storm' || compact === 'diverge') {
    return 'brainstorm';
  }
  if (compact === 'clarify' || compact === 'clarification') {
    return 'clarify';
  }
  if (compact === 'risk' || compact === 'risks') return 'risks';
  if (compact === 'constraint' || compact === 'constraints') return 'constraints';
  if (compact === 'compare' || compact === 'comparison') return 'compare';
  if (compact === 'action' || compact === 'actions' || compact === 'action_items') return 'action_items';

  return compact || 'clarify';
}

function clip(text: string, max = 80) {
  const cleaned = (text || '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

const MARKDOWN_INTENT_HINTS: Record<string, string> = {
  // 新认知透镜
  logic_deconstruct: '逐层拆解概念结构，指出核心逻辑、前提假设和推理链条。用"因为→所以"的方式呈现。明确指出隐含假设和可能的逻辑漏洞。',
  cross_domain_analogy: '用完全不同领域的类比来解释这个概念。比如用烹饪解释编程，用足球解释商业策略，用音乐解释数学。类比要新颖、贴切、易懂，避免常见的老套类比。',
  deep_dive: '深入挖掘这个话题的本质，追问"为什么"至少3层。揭示表面现象背后的根本原因和机制。不要停留在表面，要挖到底层原理。',
  // 原有
  clarify: '直接解释核心概念，指出常见误解，给出准确定义。',
  next_steps: '给出具体可执行的下一步，不要空泛建议。',
  brainstorm: '列出多个方向，标注每个方向的优缺点和可行性。',
  structured_summary: '提取关键信息，去掉废话，保留干货。',
  concept_relations: '说明概念之间的逻辑关系，用简洁语言。',
  key_points: '只保留最重要的信息，其他都删掉。',
  quiz: '出几道能检验理解的问题，附答案要点。',
  executive_summary: '一句话结论 + 关键支撑点，不要废话。',
  risks: '直接指出风险和问题，不要粉饰。',
  action_items: '列出具体要做的事，可以马上执行的那种。',
  compare: '给出明确的对比结论，说清楚选哪个、为什么。',
  diverge: '列出不同方向，标注可行性和成本。',
  constraints: '指出限制条件和边界，不要回避问题。',
  mvp_path: '最小可行方案是什么，先做什么后做什么。',
  counter_examples: '指出常见错误和误区。',
};

function buildMockResponse({ intent, worldState, userText }: any) {
  const topic = worldState?.topic || worldState?.context?.title || '当前内容';
  const goal = worldState?.goal || '明确关键点';
  const normalizedIntent = normalizeIntent(intent);
  const anchor = worldState?.context?.snippet || userText || topic;
  const anchorClip = clip(anchor, 90) || topic;

  const tldr = [
    `围绕「${topic}」，关键信息是：${anchorClip}`,
    `目标「${goal}」可以拆成：范围界定 → 关键对比 → 可操作结论。`,
    `建议先抓住 2-3 个核心概念，再用案例验证理解。`,
  ];

  const reasoning_points = [
    `先给出定义和边界，避免概念混淆。`,
    `再抽取机制或流程，建立结构化理解。`,
    `最后用应用场景验证结论是否成立。`,
  ];

  const action_items = [
    { text: `用一句话定义 ${topic} 并列出边界条件`, checked: false },
    { text: `列出 2-3 个与目标「${goal}」相关的对比维度`, checked: false },
  ];

  if (normalizedIntent === 'quiz') {
    tldr.splice(2, 1, `可以用小测验快速检验理解深度。`);
    reasoning_points.splice(1, 1, `用问题驱动能更快暴露理解盲区。`);
    action_items.splice(0, 2, { text: `生成 3 道关于 ${topic} 的自测题`, checked: false });
  }

  if (normalizedIntent === 'risks' || normalizedIntent === 'constraints') {
    tldr.splice(2, 1, `重点关注限制条件与潜在风险。`);
    reasoning_points.splice(2, 1, `风险通常来自假设不成立或资源不足。`);
    action_items.splice(1, 1, { text: `列出 3 个最可能影响目标「${goal}」的风险点`, checked: false });
  }

  if (normalizedIntent === 'brainstorm') {
    tldr.splice(1, 1, `可从用户、技术、商业三条线发散方向。`);
    reasoning_points.splice(0, 1, `先扩大选择面，再收敛到可行方案。`);
    action_items.splice(
      0,
      2,
      { text: `写下 5 个与 ${topic} 相关的发散方向`, checked: false },
      { text: `为每个方向标注潜在价值和风险`, checked: false }
    );
  }

  const citations = [] as any[];
  if (worldState?.context?.snippet || worldState?.context?.url) {
    citations.push({
      source: worldState?.context?.domain || 'snippet',
      quote: clip(worldState?.context?.snippet || userText || '', 120),
      ref: worldState?.context?.url || '',
    });
  }

  return { tldr, reasoning_points, action_items, citations };
}

function buildMarkdownPrompts({ intent, worldState, userText }: any) {
  const normalizedIntent = normalizeIntent(intent);
  const hint = MARKDOWN_INTENT_HINTS[normalizedIntent] || '清晰、有条理地回答问题。';

  const topic = (worldState?.topic || '').toString().trim();
  const goal = (worldState?.goal || '').toString().trim();
  const pageTitle = (worldState?.context?.title || '').toString().trim();
  const snippet = clip(worldState?.context?.snippet || '', 1600);
  const userTextClean = (userText || '').toString().trim();

  // 根据不同 intent 构建不同的系统提示词
  let systemPrompt = '你是一个专业的学习助手，帮助用户理解和掌握知识。使用 Markdown 格式输出。\n\n';

  if (normalizedIntent === 'logic_deconstruct') {
    systemPrompt += '任务：逻辑解构\n' +
      '- 分析核心概念和定义\n' +
      '- 梳理逻辑关系（因果、递进、对比）\n' +
      '- 指出关键假设和前提\n' +
      '- 用清晰的结构呈现';
  } else if (normalizedIntent === 'cross_domain_analogy') {
    systemPrompt += '任务：跨领域类比\n' +
      '- 用其他领域的概念来解释当前主题\n' +
      '- 类比要贴切、易懂、有启发性\n' +
      '- 可以用日常生活、自然现象、其他学科等来类比\n' +
      '- 说明类比的相似点和局限性';
  } else if (normalizedIntent === 'deep_dive') {
    systemPrompt += '任务：深度挖掘\n' +
      '- 追问"为什么"，挖掘深层原因\n' +
      '- 探索本质和底层原理\n' +
      '- 联系更广泛的知识背景\n' +
      '- 给出深入的洞察和思考';
  } else {
    systemPrompt += `任务：${hint}`;
  }

  // 构建用户提示词
  let userPrompt = '';

  if (topic || pageTitle) {
    userPrompt += `主题：${topic || pageTitle}\n`;
  }
  if (goal) {
    userPrompt += `学习目标：${goal}\n`;
  }
  if (snippet) {
    userPrompt += `\n参考内容：\n${snippet}\n`;
  }
  if (userTextClean) {
    userPrompt += `\n问题：${userTextClean}`;
  }

  if (!userPrompt.trim()) {
    userPrompt = '请根据上述任务要求，提供有价值的分析和见解。';
  }

  const temperature = normalizedIntent === 'brainstorm' || normalizedIntent === 'cross_domain_analogy' ? 0.7 : 0.5;

  return { systemPrompt, userPrompt, temperature, maxTokens: 2000 };
}

async function streamMarkdownAI(
  { systemPrompt, userPrompt, temperature, maxTokens }: { systemPrompt: string; userPrompt: string; temperature: number; maxTokens: number },
  onChunk: (chunk: string) => void
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn('Partner AI: OPENAI_API_KEY not configured');
    return { ok: false, hasChunk: false };
  }

  const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.OPENAI_MODEL || 'deepseek-chat';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 100000); // 100s timeout
  let hasChunk = false;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });

    if (!response.ok || !response.body) {
      const errorText = await response.text().catch(() => 'unknown');
      console.warn('Partner AI response error:', response.status, errorText);
      return { ok: false, hasChunk };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      let sepIndex: number;
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const eventChunk = buffer.slice(0, sepIndex);
        buffer = buffer.slice(sepIndex + 2);

        const lines = eventChunk.split('\n').map((line) => line.trim());
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const data = line.slice(5).trim();
          if (!data || data === '[DONE]') continue;

          try {
            const json = JSON.parse(data);
            const delta =
              json?.choices?.[0]?.delta?.content ||
              json?.choices?.[0]?.message?.content ||
              '';
            if (delta) {
              hasChunk = true;
              onChunk(delta);
            }
          } catch {
            // ignore bad chunks
          }
        }
      }
    }

    return { ok: true, hasChunk };
  } catch (error: any) {
    console.warn('Partner markdown stream error:', error?.message || error);
    return { ok: false, hasChunk };
  } finally {
    clearTimeout(timeout);
  }
}

function buildMockMarkdown({ intent, worldState, userText }: any) {
  const topic = worldState?.topic || worldState?.context?.title || '当前主题';
  const goal = worldState?.goal || '澄清要点';
  const normalized = normalizeIntent(intent);
  const snippet = clip(worldState?.context?.snippet || '', 220);

  const lines: string[] = [];
  lines.push(`# ${topic}`);
  if (goal) lines.push(`> 目标：${goal}`);

  if (snippet) {
    lines.push(`\n> ${snippet}`);
    lines.push(`\n（当前为降级回答：AI 请求失败或超时；补充更具体目标/问题会显著提升质量。）\n`);
  } else {
    lines.push(`\n（页面正文摘录为空，只能基于标题/域名做暂定判断；提供一段摘录或明确问题会更好。）\n`);
  }

  if (normalized === 'brainstorm') {
    lines.push('🧠 直觉判断：你要的不是“解释器”，而是“持续维护状态并能随时协作”的伙伴。');
    lines.push('\n💡 发散方向：');
    lines.push('- 信息层：把页面内容沉淀成可复用的“洞见卡片”。（价值：可积累；风险：过泛）');
    lines.push('- 协作层：围绕目标生成对比框架，推动决策更快完成。（价值：能推进；风险：目标不清时易跑偏）');
    lines.push('- 记忆层：把会话沉淀到 Workspace，形成可搜索资产。（价值：复利；风险：先做最小闭环）');
    lines.push('\n🔧 可尝试的切口：先跑通“保存到网页端 = session + 一张卡片”。');
  } else if (normalized === 'risks' || normalized === 'constraints') {
    lines.push('⚠️ 最大风险：不是技术，而是“误采集/误理解”引发信任崩塌。');
    lines.push('- 信息不足却强行下判断 → 用户觉得你在编。');
    lines.push('- 采集过多引发隐私不适 → 用户不敢用。');
    lines.push('🧯 缓解思路：默认轻量 signals，所有推断可见可改可清空。');
  } else if (normalized === 'compare') {
    lines.push('🔍 对比视角：别比功能堆叠，要比“谁能更快推进到结果”。');
    lines.push('建议维度：闭环速度 / 上下文获取摩擦 / 可沉淀资产 / 可控性与可撤销。');
  } else if (normalized === 'next_steps' || normalized === 'action_items') {
    lines.push('🧩 推进方向：先让系统“能持续记住你在推进什么”，再优化回答质量。');
    lines.push('- 先写出 3 个常见任务场景（产出：场景表）');
    lines.push('- 为每个场景定义输出约束（产出：简版规范）');
    lines.push('- 让 Save 到网页端可搜索可追溯（产出：workspace 页面）');
  } else {
    lines.push('✨ 直觉判断：把“页面上下文 + 你的目标”变成稳定输入，才会产出稳定的高质量协作。');
    lines.push('更好的输入：明确你要推进到什么结果 + 提供 1-2 段关键摘录。');
  }

  if (worldState?.context?.domain || worldState?.context?.url) {
    lines.push(`\n🔗 信息来源：${worldState?.context?.domain || 'source'} ${worldState?.context?.url ? `(${worldState.context.url})` : ''}`);
  }

  return lines.join('\n');
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, intent, userText, worldState } = body;

    if (!sessionId) {
      return NextResponse.json({ error: '缺少 sessionId' }, { status: 400, headers: corsHeaders });
    }

    let session: any = null;
    let useMemory = shouldUseMemory();
    console.log(`[PartnerAsk] storage=${useMemory ? 'memory' : 'prisma'}`);

    if (!useMemory) {
      try {
        session = await prisma.partnerSession.findUnique({ where: { id: sessionId } });
      } catch (error) {
        if (isDbUnavailable(error)) {
          markMemoryFallback();
          useMemory = true;
        } else {
          throw error;
        }
      }
    }

    if (useMemory) {
      session = partnerMemory.getSession(sessionId);
    }

    if (!session) {
      return NextResponse.json({ error: 'Session 不存在' }, { status: 404, headers: corsHeaders });
    }

    const prompts = buildMarkdownPrompts({ intent, worldState, userText });

    const updatePayload = {
      mode: worldState?.mode || session.mode,
      topic: worldState?.topic || session.topic,
      goal: worldState?.goal || session.goal,
      pageUrl: worldState?.context?.url || session.pageUrl,
      pageTitle: worldState?.context?.title || session.pageTitle,
      pageDomain: worldState?.context?.domain || session.pageDomain,
      contextSnippet: worldState?.context?.snippet || session.contextSnippet,
      recentSignalsJson: worldState?.recentSignals ? JSON.stringify(worldState.recentSignals) : session.recentSignalsJson,
    };

    if (useMemory) {
      partnerMemory.updateSession(sessionId, updatePayload);
    } else {
      await prisma.partnerSession.update({
        where: { id: sessionId },
        data: updatePayload,
      });
    }

    if (userText) {
      if (useMemory) {
        partnerMemory.addMessage({
          sessionId,
          role: 'user',
          content: userText,
        });
      } else {
        await prisma.partnerMessage.create({
          data: {
            sessionId,
            role: 'user',
            content: userText,
          },
        });
      }
    }

    const encoder = new TextEncoder();
    let fullText = '';
    let fallbackText = '';

    const readable = new ReadableStream({
      async start(controller) {
        const pushChunk = (chunk: string) => {
          if (!chunk) return;
          fullText += chunk;
          controller.enqueue(encoder.encode(chunk));
        };

        try {
          const { ok, hasChunk } = await streamMarkdownAI(prompts, pushChunk);
          if (!ok && !hasChunk) {
            fallbackText = buildMockMarkdown({ intent, worldState, userText });
            pushChunk(fallbackText);
          }

          const finalText = fullText || fallbackText;
          const assistantPayload = {
            sessionId,
            role: 'assistant',
            content: finalText,
            contentJson: null,
            citationsJson: null,
          };

          if (useMemory) {
            partnerMemory.addMessage(assistantPayload);
          } else {
            await prisma.partnerMessage.create({ data: assistantPayload });
          }
        } catch (streamError) {
          console.error('Partner ask stream error:', streamError);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('Partner ask error:', error);
    return NextResponse.json({ error: '请求失败' }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}
