'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createProviderFromEnv } from '../../services/ai';
import MarkdownRenderer from '../MarkdownRenderer';

interface ReAskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (item: { question: string; answer: string; feedback?: string }) => void;
  subject: string;
  topic: string;
  context: string; // Renamed from originalContent
  mode?: 'guide' | 'workshop';
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ReAskModal({ isOpen, onClose, onComplete, subject, topic, context, mode = 'guide' }: ReAskModalProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingAnswer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setQuestion('');
    setIsLoading(true);
    setStreamingAnswer('');

    try {
      const aiProvider = createProviderFromEnv();
      if (!aiProvider) {
        throw new Error('AI服务不可用');
      }
      
      const history = [
        {
          role: 'system' as const,
          content: mode === 'workshop'
            ? `你正在和用户共同完成“${subject} · ${topic}”这个真实任务。基于用户刚提供的信息，直接推进当前产出：给判断、修改模板或形成下一版内容；一次只推进一步，结尾最多问1个确实影响下一步的问题。不要出题考试，不要退回泛泛讲课。控制在300—500个汉字。\n\n当前共创内容：\n${context.slice(0, 2400)}`
            : `你正在解答“${subject} · ${topic}”学习过程中的追问。先直接回答，再解释原因或举一个例子；不要用另一个问题代替回答。控制在 300—500 个汉字。\n\n讲解摘录：\n${context.slice(0, 2400)}`,
        },
        ...messages.slice(-4).map((message) => ({ role: message.role, content: message.content })),
      ];

      let responseContent = '';
      
      // 设置消息处理器
      aiProvider.onMessage((message: string, isFinal: boolean) => {
        responseContent += message;
        if (message) setStreamingAnswer(responseContent);
        
        if (isFinal) {
          if (!responseContent.trim()) {
            setQuestion(userMessage.content);
            setMessages(prev => [...prev, {
              role: 'assistant',
              content: '这次没有收到有效回答，问题已保留，请直接重试。',
              timestamp: new Date(),
            }]);
            setIsLoading(false);
            return;
          }
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: responseContent,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, assistantMessage]);
          setStreamingAnswer('');
          setIsLoading(false);
          
          if (onComplete) {
            onComplete({
              question: userMessage.content,
              answer: responseContent
            });
          }
        }
      });

      // 设置错误处理器
      aiProvider.onError((error: string) => {
        console.error('AI回答失败:', error);
        const errorMessage: ChatMessage = {
          role: 'assistant',
          content: `回答失败：${error}。问题已保留，可以直接重试。`,
          timestamp: new Date()
        };
        setQuestion(userMessage.content);
        setMessages(prev => [...prev, errorMessage]);
        setStreamingAnswer('');
        setIsLoading(false);
      });

      // 发送消息
      await aiProvider.sendMessage(userMessage.content, history, {
        purpose: 'qa',
        maxTokens: 700,
        temperature: 0.35,
      });
      
    } catch (error) {
      console.error('AI回答失败:', error);
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: '回答请求没有完成，问题已保留，可以直接重试。',
        timestamp: new Date()
      };
      setQuestion(userMessage.content);
      setMessages(prev => [...prev, errorMessage]);
      setStreamingAnswer('');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">{mode === 'workshop' ? '继续和 AI 共创' : '继续问 AI'}</h2>
            <p className="text-sm text-gray-600">{subject} - {topic}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
            >
              清空对话
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* 对话区域 */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 mt-8">
              <p>{mode === 'workshop' ? '补充你的实际情况，我们继续推进。' : '哪里没讲明白，直接告诉我。'}</p>
              <p className="text-sm mt-2">{mode === 'workshop' ? 'AI 会根据你的信息继续修改和产出' : 'AI 会基于刚才的内容换种方式解释'}</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.role === 'user' ? (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  ) : (
                    <div className="max-w-none">
                      <MarkdownRenderer content={message.content} fontSize="sm" />
                    </div>
                  )}
                  <div
                    className={`text-xs mt-1 ${
                      message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))
          )}
          
          {streamingAnswer && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-lg bg-gray-100 p-3 text-gray-800">
                <MarkdownRenderer content={streamingAnswer} fontSize="sm" />
                <span className="ml-1 inline-block h-4 w-1 animate-pulse bg-blue-500 align-middle" />
              </div>
            </div>
          )}

          {isLoading && !streamingAnswer && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-800 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span>老师正在思考...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="border-t p-4">
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={mode === 'workshop' ? '补充信息、反馈或粘贴你的初稿…' : '输入你的问题…'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!question.trim() || isLoading}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              发送
            </button>
          </form>
          <p className="text-xs text-gray-500 mt-2">
            {mode === 'workshop'
              ? '可以直接说：这是我的用户反馈，请帮我提炼痛点并说明依据。'
              : '可以直接说：这个概念没懂，请换个例子讲。'}
          </p>
        </div>
      </div>
    </div>
  );
}
