'use client';

import { useState, useEffect } from 'react';

interface Session {
  id: string;
  worldState: {
    mode: string;
    topic: string;
    goal: string;
    context: {
      url: string;
      title: string;
      domain: string;
    };
  };
  userInput: string;
  intent: string;
  result: {
    content?: string;
    conclusion?: string;
    reasoning?: string;
    actions?: string[];
    citations?: { quote: string; source: string }[];
  };
  timestamp: number;
}

export default function TodayPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
    // Poll every 10 seconds for new data
    const interval = setInterval(fetchSessions, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      const res = await fetch('/api/extension/save-session');
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch (e) {
      console.error('Failed to fetch sessions:', e);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const latestState = sessions[0]?.worldState;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">🧠 Today</h1>
          <p className="text-gray-500 mt-1">Intelligent Partner 协作记录</p>
        </header>

        {/* Current State Card */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Current State
          </h2>
          {latestState ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  latestState.mode === 'Study' ? 'bg-blue-100 text-blue-700' :
                  latestState.mode === 'Work' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {latestState.mode}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{latestState.context?.domain || '未知'}</span>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">TOPIC</div>
                <div className="text-gray-900 font-medium">{latestState.topic || '未设定'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">GOAL</div>
                <div className="text-gray-900">{latestState.goal || '未设定'}</div>
              </div>
            </div>
          ) : (
            <p className="text-gray-400">尚无状态记录，在插件中开始协作后这里会显示</p>
          )}
        </section>

        {/* Recent Sessions */}
        <section className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            Recent Sessions
          </h2>

          {loading ? (
            <div className="text-center py-8 text-gray-400">加载中...</div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>暂无协作记录</p>
              <p className="text-sm mt-2">在 Chrome 插件中点击 Save to Web 保存协作结果</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="border border-gray-100 rounded-lg p-4 hover:border-gray-200 transition-colors"
                >
                  {/* Session Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        session.intent === 'clarify' ? 'bg-blue-50 text-blue-600' :
                        session.intent === 'next-steps' ? 'bg-green-50 text-green-600' :
                        session.intent === 'brainstorm' ? 'bg-purple-50 text-purple-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {session.intent === 'clarify' ? '🔍 Clarify' :
                         session.intent === 'next-steps' ? '➡️ Next Steps' :
                         session.intent === 'brainstorm' ? '💡 Brainstorm' :
                         '💬 Custom'}
                      </span>
                      <span className="text-xs text-gray-400">
                        {formatDate(session.timestamp)} {formatTime(session.timestamp)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">{session.worldState?.mode}</span>
                  </div>

                  {/* Context */}
                  {session.worldState?.context?.title && (
                    <div className="text-xs text-gray-400 mb-2 truncate">
                      📄 {session.worldState.context.title}
                    </div>
                  )}

                  {/* User Input */}
                  {session.userInput && (
                    <div className="text-sm text-gray-600 mb-3 bg-gray-50 p-2 rounded">
                      “{session.userInput}”
                    </div>
                  )}

                  {/* Content - 支持新格式（纯文本）和旧格式（结构化） */}
                  <div className="text-gray-900 mb-3 whitespace-pre-wrap text-sm leading-relaxed">
                    {session.result?.content || session.result?.conclusion || '无内容'}
                  </div>

                  {/* Actions (旧格式兼容) */}
                  {session.result?.actions && session.result.actions.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {session.result.actions.map((action, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                          <span className="text-blue-500">→</span>
                          <span>{action}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
