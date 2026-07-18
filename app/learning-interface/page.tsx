'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ConversationService } from '../services/conversationService';
import { CreateConversationRequest } from '../types/conversation';
import { ChatMessage } from '../utils/chatTypes';
import { toast } from 'react-hot-toast';
import LearningProgressClient from '../services/learningProgressClient';
import { LearningState } from '../types/learning';
import RegionalCurriculumSelector from '../components/RegionalCurriculumSelector';
import { KnowledgeBaseService } from '../services/knowledgeBaseService';

type LearningMode = 'guide' | 'workshop' | 'quiz';

const LEARNING_MODES: Array<{ key: LearningMode; label: string; desc: string }> = [
  { key: 'guide', label: 'AI 带学', desc: '讲清楚、随时追问，不强制做题' },
  { key: 'workshop', label: '实战共创', desc: '围绕你的真实问题，一步步做出结果' },
  { key: 'quiz', label: '测验查漏', desc: '需要检验时再做 3 道题' },
];

function inferLearningMode(goal: string, topic: string, requestedMode: string | null): LearningMode {
  if (requestedMode === 'guide' || requestedMode === 'workshop' || requestedMode === 'quiz') {
    return requestedMode;
  }

  const practicalTopic = /(如何|怎么|怎样|痛点|方案|设计|规划|决策|分析|解决|改进|运营|创业|产品|实践|实操)/;
  return goal === 'apply' || practicalTopic.test(topic) ? 'workshop' : 'guide';
}

// 动态导入组件以避免SSR问题
const ExplainStep = dynamic(() => import('../components/LearningFlow/ExplainStep'), { ssr: false });
const QuizStep = dynamic(() => import('../components/LearningFlow/QuizStep'), { ssr: false });
const ResultStep = dynamic(() => import('../components/LearningFlow/ResultStep'), { ssr: false });
const ReviewStep = dynamic(() => import('../components/LearningFlow/ReviewStep'), { ssr: false });

function LearningInterfaceContent() {
  const searchParams = useSearchParams();
  const subject = searchParams.get('subject') || '';
  const topic = searchParams.get('topic') || '';
  const region = searchParams.get('region') || '';
  const grade = searchParams.get('grade') || '';
  const semester = searchParams.get('semester') || ''; // 读取学期参数
  const topicId = searchParams.get('topicId') || '';
  const learningGoal = searchParams.get('goal') || 'understand';
  const learningContext = searchParams.get('context') || '';
  const existingConversationId = searchParams.get('conversationId');
  const initialLearningMode = inferLearningMode(learningGoal, topic, searchParams.get('mode'));
  
  const [learningContent, setLearningContent] = useState(''); // 基础学习内容
  const [aiExplanation, setAiExplanation] = useState(''); // AI讲解内容
  const [isLoading, setIsLoading] = useState(false); // 默认为 false，因为我们直接开始
  const [learningMode, setLearningMode] = useState<LearningMode>(initialLearningMode);
  const [currentStep, setCurrentStep] = useState<LearningState>(initialLearningMode === 'quiz' ? 'DIAGNOSE' : 'REMEDY');
  const [conversationId, setConversationId] = useState<string | null>(existingConversationId);
  const [hasManualSave, setHasManualSave] = useState(false);
  const [isRestoredSession, setIsRestoredSession] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number>(0);
  
  // 地区考纲选择状态
  const [selectedRegion, setSelectedRegion] = useState(region || '全国');
  const [selectedCurriculum, setSelectedCurriculum] = useState('');
  
  // 学习流程相关状态
  const [stepContent, setStepContent] = useState('');
  const [stepData, setStepData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [aiSummary, setAiSummary] = useState(''); // AI学习总结
  const [showSummaryModal, setShowSummaryModal] = useState(false); // 控制总结弹窗显示
  const initializationKeyRef = useRef('');
  
  // 苏格拉底对话状态
  const [socraticDialogue, setSocraticDialogue] = useState<Array<{
    question: string;
    answer: string;
    feedback?: string;
  }>>([]);
  const conversationService = ConversationService.getInstance();

  // 更新苏格拉底对话
  const updateSocraticDialogue = async (newDialogue: Array<{question: string; answer: string; feedback?: string}>) => {
    setSocraticDialogue(newDialogue);
    
    // 如果有对话ID，自动保存到数据库
    if (conversationId) {
      try {
        await LearningProgressClient.updateSocraticDialogue(conversationId, newDialogue);
      } catch (error) {
        console.error('保存苏格拉底对话失败:', error);
      }
    }
  };

  useEffect(() => {
    if (subject && topic) {
      const initializationKey = `${existingConversationId || 'new'}|${subject}|${topic}`;
      if (initializationKeyRef.current === initializationKey) return;
      initializationKeyRef.current = initializationKey;
      void initializeLearningSession();
    } else {
      setIsLoading(false);
    }
  }, [subject, topic]);

  // 初始化学习会话
  const initializeLearningSession = async () => {
    try {
      setIsLoading(true);
      
      // 如果有现有的对话ID，尝试恢复会话
      if (existingConversationId) {
        try {
          const conversation = await conversationService.getConversation(existingConversationId);
          if (conversation) {
            setConversationId(existingConversationId);
            setIsRestoredSession(true);
            
            // 尝试从学习进度数据库恢复内容
            try {
              const learningProgress = await LearningProgressClient.getLearningProgress(existingConversationId);
              if (learningProgress && learningProgress.aiExplanation) {
                setAiExplanation(learningProgress.aiExplanation);
                setLearningContent(learningProgress.aiExplanation);
                console.log('从学习进度数据库恢复AI讲解内容');
                
                // 恢复苏格拉底对话
                if (learningProgress.socraticDialogue) {
                  setSocraticDialogue(learningProgress.socraticDialogue);
                }
                
                // 恢复AI总结
                if (learningProgress.aiSummary) {
                  console.log('恢复AI总结:', learningProgress.aiSummary);
                  setAiSummary(learningProgress.aiSummary);
                } else {
                  console.log('学习进度中没有AI总结');
                }
                
                setIsLoading(false);
                return;
              }
            } catch (error) {
              console.error('从学习进度数据库恢复内容失败:', error);
            }
            
            // 如果学习进度数据库没有内容，尝试从对话历史恢复
            try {
              const messages = conversation.messages || [];
              const aiMessages = messages.filter(msg => msg.role === 'assistant');
              if (aiMessages.length > 0) {
                const lastAiMessage = aiMessages[aiMessages.length - 1];
                setAiExplanation(lastAiMessage.content);
                setLearningContent(lastAiMessage.content);
                console.log('从对话历史恢复AI讲解内容');
                setIsLoading(false);
                return;
              }
            } catch (error) {
              console.error('从对话历史恢复内容失败:', error);
            }
          }
        } catch (error) {
          console.error('恢复会话失败:', error);
        }
      }
      
      // 如果没有现有会话或恢复失败，查找或创建学习会话（避免重复创建）
       if (!conversationId) {
         const newConversationRequest: CreateConversationRequest = {
           title: `${subject} - ${topic}`,
           type: 'learning' as const,
           subject,
           topic
         };
         
         const conversation = await conversationService.findOrCreateLearningConversation(newConversationRequest);
         setConversationId(conversation.id);
         
         // 如果是现有对话，尝试恢复学习状态
         if (conversation.learningSession) {
           try {
             // 从LearningSession恢复基本状态
             if (initialLearningMode === 'quiz') {
               setCurrentStep((conversation.learningSession.state as LearningState) || 'DIAGNOSE');
             }
             
             // 尝试从学习进度数据库恢复完整学习数据
             try {
               const completeLearningData = await LearningProgressClient.getComplete(conversation.id);
               if (completeLearningData && completeLearningData.session) {
                 const learningProgress = completeLearningData.session;
                 const stats = completeLearningData.stats;
                 
                 // 设置当前步骤
                 if (initialLearningMode === 'quiz' && learningProgress.currentStep) {
                   setCurrentStep(learningProgress.currentStep as LearningState);
                 }
                 
                 // 恢复AI讲解内容
                 if (learningProgress.aiExplanation) {
                   setAiExplanation(learningProgress.aiExplanation);
                   setLearningContent(learningProgress.aiExplanation);
                 }
                 
                 // 恢复苏格拉底对话
                 if (learningProgress.socraticDialogue) {
                   setSocraticDialogue(learningProgress.socraticDialogue);
                 }
                 
                 // 恢复练习题结果
                if (learningProgress.quizQuestions && learningProgress.userAnswers) {
                  const answersArr = learningProgress.userAnswers.map(ans => ans.userAnswer || '');
                  setQuizResults({
                    questions: learningProgress.quizQuestions,
                    answers: answersArr,
                    score: learningProgress.finalScore ?? stats?.totalScore ?? 0,
                  });
                }
                 
                 // 恢复其他学习数据
                 if (learningProgress.finalScore !== undefined) {
                   // 可以在这里设置最终分数相关的状态
                 }
                 
                 if (learningProgress.feedback) {
                   // 可以在这里设置反馈相关的状态
                 }
                 
                 console.log('从PostgreSQL数据库恢复完整学习状态', {
                   currentStep: learningProgress.currentStep,
                   hasAiExplanation: !!learningProgress.aiExplanation,
                   hasSocraticDialogue: !!learningProgress.socraticDialogue,
                   hasQuizData: !!(learningProgress.quizQuestions && learningProgress.userAnswers),
                   hasStats: !!stats
                 });
                 
                 setIsLoading(false);
                 return;
               }
             } catch (error) {
               console.error('从学习进度数据库恢复内容失败:', error);
             }
             
             // 如果没有数据库记录，尝试从对话记录恢复基本内容
             if (conversation.aiExplanation) {
               setAiExplanation(conversation.aiExplanation);
               setLearningContent(conversation.aiExplanation);
               setIsLoading(false);
               return;
             }
           } catch (error) {
             console.error('恢复学习状态失败:', error);
           }
         }
       }
      
      // 生成AI学习内容
      // await generateLearningContent(); 
      // 改为按需生成，如果是 REMEDY 阶段才生成
      if (currentStep === 'REMEDY') {
        await generateLearningContent();
      } else {
        setIsLoading(false);
      }
      
    } catch (error) {
      console.error('初始化学习会话失败:', error);
      toast.error('初始化学习会话失败，请稍后重试');
      setIsLoading(false);
    }
  };

  // 生成AI学习内容
  const generateLearningContent = async (modeOverride: LearningMode = learningMode) => {
    try {
      setIsLoading(true);
      let knowledgeReference = '';
      // 优先把相关资料作为依据，但仍由 AI 组织成针对性微课
      try {
        const kb = new KnowledgeBaseService();
        const items = await kb.getItems();
        const keyword = (topic || '').slice(0, 20);
        const matched = items.filter(it => (it.text || '').includes(keyword) || (it.name || '').includes(keyword));
        if (matched.length > 0) {
          knowledgeReference = matched
            .slice(0, 2)
            .map(it => `${it.name}：${(it.text || '').slice(0, 500)}`)
            .join('\n\n');
        }
      } catch (e) {
        console.warn('知识库内容不可用，降级使用AI生成:', e);
      }
      const { createProviderFromEnv } = await import('../services/ai');
      const aiProvider = createProviderFromEnv();
      if (!aiProvider) throw new Error('AI服务不可用');

      const goalInstruction = {
        understand: '优先建立清晰心智模型，并要求学习者能用自己的话解释。',
        remember: '优先提炼关键事实，并设计主动回忆线索帮助长期记忆。',
        apply: '优先连接真实任务，给出可执行练习和下一步行动。',
      }[learningGoal] || '优先建立清晰心智模型，并要求学习者能用自己的话解释。';

      const diagnosticSummary = quizResults?.questions?.slice(0, 3).map((question: any, index: number) => {
        const userAnswer = quizResults.answers?.[index] || '未作答';
        return `${index + 1}. ${String(question.question).slice(0, 180)}\n用户答案：${userAnswer}\n参考答案：${question.correctAnswer || '开放题'}`;
      }).join('\n\n') || '暂无诊断结果，请围绕主题最常见的理解障碍讲解。';

      const prompt = modeOverride === 'workshop'
        ? `你是我的 AI 共创教练。不要把“${topic}”讲成一篇课程，也不要出题考试；和我一起解决真实问题并产出可使用的结果。

主题：${topic}
领域：${subject || '通用'}
我想达到的目标：${goalInstruction}
我的背景或材料：${(learningContext || '暂未提供').slice(0, 1200)}
${knowledgeReference ? `可参考的个人资料：\n${knowledgeReference}` : ''}

请这样开始：
1. 用一句话复述我们要解决的真实问题，并明确本轮产出。
2. 给出最多 3 步的推进方法，但本轮只展开第 1 步。
3. 直接提供一个可填写的模板、判断标准或初稿，让我能马上补充和修改。
4. 最后只问 1 个决定下一步的具体问题，等待我回答后再继续。
5. 不要考试、不要空泛讲理论、不要一次性给出大而全的方案。控制在 300—500 个汉字。`
        : `请直接为我讲一节短而有效的微课。

主题：${topic}
领域：${subject || '通用'}
学习目标：${goalInstruction}
当前背景：${(learningContext || '未提供').slice(0, 500)}
诊断结果：
${diagnosticSummary}
${knowledgeReference ? `\n可参考的个人资料：\n${knowledgeReference}` : ''}

要求：
1. 先用两句话给出核心结论，不要先反问。
2. 只讲 3 个最关键的概念或步骤，优先纠正诊断中暴露的问题。
3. 给 1 个贴近真实使用场景的例子，并展示推理过程。
4. 指出 1 个最容易混淆的点。
5. 最后给 1 个主动回忆问题，不要附答案。
6. 使用清晰的 Markdown，控制在 350—550 个汉字，不写历史沿革、空泛鼓励或大而全的知识目录。`;

      // 流式获取AI内容，首段即显示，加速体感
      const content = await new Promise<string>((resolve, reject) => {
        let fullResponse = '';
        let gotFirstChunk = false;
        aiProvider.onMessage((message: string, isFinal: boolean) => {
          fullResponse += message;
          if (!gotFirstChunk && fullResponse.trim()) {
            setLearningContent(fullResponse);
            gotFirstChunk = true;
            setIsLoading(false);
          }
          if (isFinal) {
            resolve(fullResponse);
          } else {
            setLearningContent(fullResponse);
          }
        });
        aiProvider.onError((error: string) => reject(new Error(error)));
        void aiProvider.sendMessage(prompt, undefined, {
          purpose: modeOverride === 'workshop' ? 'qa' : 'lecture',
          maxTokens: 750,
          temperature: modeOverride === 'workshop' ? 0.45 : 0.4,
        });
      });

      if (!content || !content.trim()) throw new Error('AI返回空内容');

      setLearningContent(content);
      setAiExplanation(content);
      toast.success('AI学习内容生成成功！');

      if (conversationId) {
        try {
          await LearningProgressClient.saveLearningProgress({
            conversationId,
            subject,
            topic,
            aiExplanation: content,
            socraticDialogue: socraticDialogue,
            currentStep: 'EXPLAIN'
          });
          console.log('AI学习内容已自动保存');
        } catch (error) {
          console.error('自动保存AI学习内容失败:', error);
        }
      }
    } catch (error) {
      console.error('生成AI学习内容失败:', error);
      toast.error('生成学习内容失败，请稍后重试');
      
      // 使用fallback内容
      const fallbackContent = `## ${subject} - ${topic}

### 📚 学习内容生成中...

抱歉，AI内容生成暂时不可用。请稍后重试或点击"重新生成"按钮。

### 💡 学习建议
在等待期间，您可以：
1. 回顾相关的基础知识
2. 准备学习笔记
3. 思考与"${topic}"相关的问题

*注：这是临时内容，实际学习内容将由AI根据您的具体主题生成。*`;
      
      setLearningContent(fallbackContent);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModeChange = async (nextMode: LearningMode) => {
    setLearningMode(nextMode);

    if (nextMode === 'quiz') {
      setCurrentStep('DIAGNOSE');
      return;
    }

    setCurrentStep('REMEDY');
    if (nextMode !== learningMode || !learningContent) {
      setLearningContent('');
      await generateLearningContent(nextMode);
    }
  };

  const handleFinishLearning = async () => {
    setCurrentStep('DONE');
    toast.success('已保存这次学习，不需要跑完固定流程');

    if (!conversationId) return;
    try {
      await LearningProgressClient.saveLearningProgress({
        conversationId,
        subject,
        topic,
        aiExplanation,
        socraticDialogue,
        currentStep: 'DONE',
        isCompleted: true,
      });
    } catch (error) {
      console.error('保存学习完成状态失败:', error);
    }
  };

  const handleNext = async () => {
    console.log('进入下一步学习，当前步骤:', currentStep);
    
    // 根据当前步骤决定下一步
    switch (currentStep) {
      case 'DIAGNOSE':
        setCurrentStep('ANALYSIS');
        toast.success('查看测验结果');
        break;
      case 'ANALYSIS':
        setLearningMode('guide');
        setCurrentStep('REMEDY');
        if (!learningContent) {
          generateLearningContent('guide');
        }
        toast.success('切换到 AI 带学');
        break;
      case 'REMEDY':
        setLearningMode('quiz');
        setCurrentStep('DIAGNOSE');
        toast.success('按你的选择进入测验');
        break;
      case 'VERIFY':
        toast.success('学习完成！');
        // 可以跳转到其他页面或重新开始
        break;
      default:
        console.log('未知的学习步骤:', currentStep);
    }
    
    // 保存学习进度到对话
    if (conversationId) {
      try {
        const message: ChatMessage = {
          role: 'user',
          content: `完成了${topic}的${currentStep}阶段，准备进入下一步学习`
        };
        await conversationService.addMessage(conversationId, message);
        
        const responseMessage: ChatMessage = {
          role: 'assistant',
          content: `很好！你已经完成了${topic}的${currentStep}阶段。继续加油！`
        };
        await conversationService.addMessage(conversationId, responseMessage);
      } catch (error) {
        console.error('保存学习进度失败:', error);
      }
    }
  };

  const handleAskQuestion = async (question: string) => {
    console.log('用户提问:', question);
    
    // 保存到对话记录
    if (conversationId) {
      try {
        const userMessage: ChatMessage = {
          role: 'user',
          content: `在学习${topic}时提问：${question}`
        };
        await conversationService.addMessage(conversationId, userMessage);
        
        // 这里可以调用AI API获取回答
        const aiResponse = `关于"${question}"的问题，这是一个很好的思考。在${subject}的${topic}学习中...`;
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse
        };
        await conversationService.addMessage(conversationId, assistantMessage);
      } catch (error) {
        console.error('保存问题失败:', error);
      }
    }
  };

  // 处理确认理解步骤的回调
  const handleConfirmNext = async () => {
    console.log('确认理解步骤完成');
    setCurrentStep('DIAGNOSE');
    toast.success('进入测验阶段');
  };

  // 处理测验完成
  const handleQuizComplete = async (results: any) => {
    console.log('测验完成，结果:', results);
    const normalized = {
      answers: results.answers || [],
      questions: results.questions || [],
      score: results.score || 0,
    };
    setQuizResults(normalized);
    setCurrentStep('ANALYSIS');
    toast.success('测验完成，查看结果');

    // 保存测验数据
    if (conversationId) {
      try {
        const userAnswers = normalized.questions.map((q: any, idx: number) => {
          const ua = normalized.answers[idx] || '';
          const isCorrect = ua === q.correctAnswer;
          return {
            questionId: q.id ?? idx,
            userAnswer: ua,
            isCorrect,
            score: isCorrect ? (q.points || 10) : 0,
          };
        });
        await LearningProgressClient.saveLearningProgress({
          conversationId,
          subject,
          topic,
          aiExplanation,
          socraticDialogue,
          currentStep: 'ANALYSIS',
          quizQuestions: normalized.questions,
          userAnswers,
          finalScore: normalized.score,
          stats: {
            conversationId,
            accuracy: normalized.score,
            totalQuestions: normalized.questions.length,
            correctAnswers: userAnswers.filter((a: any) => a.isCorrect).length,
          },
        });
      } catch (error) {
        console.error('保存测验数据失败:', error);
      }
    }
  };

  // 处理结果查看完成
  const handleResultNext = async () => {
    console.log('结果查看完成');
    setLearningMode('guide');
    setCurrentStep('REMEDY');
    if (!learningContent) {
      generateLearningContent('guide');
    }
    toast.success('根据结果继续 AI 带学');
  };

  // 处理复习完成
  const handleReviewComplete = async () => {
    console.log('复习完成');
    toast.success('学习完成！恭喜你完成了整个学习流程！');
    if (conversationId && quizResults) {
      try {
        const userAnswers = quizResults.questions.map((q: any, idx: number) => {
          const ua = quizResults.answers?.[idx] || '';
          const isCorrect = ua === q.correctAnswer;
          return {
            questionId: q.id ?? idx,
            userAnswer: ua,
            isCorrect,
            score: isCorrect ? (q.points || 10) : 0,
          };
        });
        await LearningProgressClient.saveLearningProgress({
          conversationId,
          subject,
          topic,
          aiExplanation,
          socraticDialogue,
          currentStep: 'DONE',
          isCompleted: true,
          quizQuestions: quizResults.questions,
          userAnswers,
          finalScore: quizResults.score,
          stats: {
            conversationId,
            accuracy: quizResults.score,
            totalQuestions: quizResults.questions.length,
            correctAnswers: userAnswers.filter((a: any) => a.isCorrect).length,
          },
        });
      } catch (error) {
        console.error('保存复习数据失败:', error);
      }
    }
  };

  const handleManualSave = async () => {
    if (!conversationId) {
      toast.error('没有活动的学习会话');
      return;
    }

    try {
       setIsSaving(true);
       
       await LearningProgressClient.saveLearningProgress({
         conversationId,
         subject,
         topic,
         aiExplanation,
         socraticDialogue,
         currentStep,
         aiSummary, // 包含AI总结
         quizQuestions: quizResults?.questions,
         userAnswers: quizResults
          ? quizResults.questions.map((q: any, idx: number) => {
              const ua = quizResults.answers?.[idx] || '';
              const isCorrect = ua === q.correctAnswer;
              return {
                questionId: q.id ?? idx,
                userAnswer: ua,
                isCorrect,
                score: isCorrect ? (q.points || 10) : 0,
              };
            })
          : undefined,
         finalScore: quizResults?.score,
       });
       
       setHasManualSave(true);
       setLastSaveTime(Date.now());
       toast.success('学习进度已保存');
     } catch (error) {
       console.error('手动保存失败:', error);
       toast.error('保存失败，请稍后重试');
     } finally {
       setIsSaving(false);
     }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-sky-200 border-t-sky-500"></div>
          <p className="mt-5 text-slate-800 text-lg font-medium">正在准备学习内容</p>
          <p className="mt-1.5 text-slate-500 text-sm">请稍候，系统正在初始化会话</p>
        </div>
      </div>
    );
  }

  if (!subject || !topic) {
    return (
      <div className="min-h-screen bg-slate-100 text-slate-900 flex items-center justify-center px-4">
        <div className="zen-panel p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">请选择学习内容</h2>
          <p className="text-sm text-slate-600 mb-4">进入系统学习前，请先选择学科与主题。</p>
          <button onClick={() => window.location.href = '/learning-setup'} className="zen-button px-4 py-2 text-sm">
            去选择内容
          </button>
        </div>
      </div>
    )
  }
  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-sky-100">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sky-700 hover:text-sky-800 text-sm flex items-center gap-1">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-100 text-sky-700">←</span>
              返回首页
            </Link>
            <div className="flex flex-col">
              <span className="text-sm font-semibold">{subject || '未选择学科'} · {topic || '未选择主题'}</span>
              <span className="text-xs text-slate-500">{selectedRegion} · {grade || '年级未设定'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {aiSummary && (
              <button
                onClick={() => setShowSummaryModal(true)}
                className="px-3 py-2 rounded-lg border border-sky-100 text-sm hover:bg-sky-50"
              >
                查看总结
              </button>
            )}
            {learningMode !== 'quiz' && (
              <button
                onClick={async () => {
                  setIsLoading(true);
                  try {
                    await generateLearningContent(learningMode);
                    toast.success(learningMode === 'workshop' ? '共创起点已重新生成' : 'AI 讲解已重新生成');
                  } catch (error) {
                    console.error('重新生成失败:', error);
                    toast.error('重新生成失败，请稍后重试');
                  }
                }}
                className="px-3 py-2 rounded-lg border border-sky-100 bg-white text-sky-700 text-sm font-semibold hover:bg-sky-50 shadow-sm"
              >
                重新生成
              </button>
            )}
            <button
              onClick={handleManualSave}
              disabled={isSaving}
              className="px-3 py-2 rounded-lg bg-gradient-to-r from-sky-500 to-blue-600 text-white text-sm font-semibold hover:from-sky-500 hover:to-blue-700 shadow-sm disabled:opacity-60"
            >
              {isSaving ? '保存中...' : '保存进度'}
            </button>
          </div>
        </div>
      </div>

      {/* 主要内容区域 */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* 概览卡 */}
        <div className="zen-panel p-5 flex flex-wrap gap-4 items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs text-sky-700 font-semibold uppercase tracking-wide">自适应学习</p>
            <h1 className="text-2xl font-bold">按问题学习，不跑固定流程</h1>
            <p className="text-sm text-slate-600">AI 会根据主题带学或共创；测验只是需要时使用的工具。</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="px-3 py-2 rounded-xl bg-slate-100">
              <div className="text-xs text-slate-500">当前模式</div>
              <div className="font-semibold">{LEARNING_MODES.find(mode => mode.key === learningMode)?.label}</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-100">
              <div className="text-xs text-slate-500">进度保存</div>
              <div className="font-semibold">{hasManualSave ? '已手动保存' : '自动保存中'}</div>
            </div>
            <div className="px-3 py-2 rounded-xl bg-slate-100">
              <div className="text-xs text-slate-500">会话状态</div>
              <div className="font-semibold">{isRestoredSession ? '已恢复' : '新会话'}</div>
            </div>
          </div>
        </div>

        {/* 学习模式切换 */}
        <div className="zen-panel p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-slate-900">选择现在最有用的学习方式</div>
              <div className="text-xs text-slate-500">可以随时切换，也可以随时结束。</div>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
          {LEARNING_MODES.map((mode) => {
            const active = learningMode === mode.key;
            return (
              <button
                key={mode.key}
                type="button"
                aria-pressed={active}
                onClick={() => void handleModeChange(mode.key)}
                className={`rounded-xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? 'border-sky-500 bg-sky-50 text-sky-900 ring-2 ring-sky-100'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50/50'
                }`}
              >
                <div className="font-semibold">{mode.label}</div>
                <div className="mt-1 text-xs leading-5 opacity-80">{mode.desc}</div>
              </button>
            );
          })}
          </div>
        </div>

        {/* 考纲选择器 */}
        {grade && subject !== '个人学习' && <div className="zen-panel p-4">
          <RegionalCurriculumSelector
            selectedRegion={selectedRegion}
            selectedCurriculum={selectedCurriculum}
            onCurriculumSelect={(region, curriculum) => {
              setSelectedRegion(region);
              setSelectedCurriculum(curriculum);
              if (learningContent) {
                toast.success(`已选择${region} - ${curriculum}，点击重新生成获取对应内容`);
              }
            }}
            onRegionChange={(region) => {
              setSelectedRegion(region);
              if (region !== selectedRegion && learningContent) {
                toast.success(`已切换到${region}考纲，点击重新生成获取对应内容`);
              }
            }}
            onCurriculumChange={setSelectedCurriculum}
            subject={subject}
            grade={grade}
          />
        </div>}

        {/* 学习流程内容 */}
      <div className="zen-panel shadow-lg overflow-hidden">
        <div className="p-6 md:p-8">
          {currentStep === 'REMEDY' && (
              <ExplainStep 
                content={learningContent}
                initialAiExplanation={aiExplanation}
                onNext={handleNext}
                onPractice={() => void handleModeChange('quiz')}
                onFinish={() => void handleFinishLearning()}
                learningMode={learningMode === 'workshop' ? 'workshop' : 'guide'}
                onAskQuestion={handleAskQuestion}
                step="REMEDY"
                socraticDialogue={socraticDialogue}
                onSocraticDialogueUpdate={updateSocraticDialogue}
                subject={subject}
                topic={topic}
                selectedRegion={selectedRegion}
                selectedCurriculum={selectedCurriculum}
                grade={grade}
                semester={semester}
                onAiExplanationUpdate={async (content: string) => {
                  setAiExplanation(content);
                  if (conversationId) {
                    try {
                      await LearningProgressClient.saveLearningProgress({
                        conversationId,
                        subject,
                        topic,
                        aiExplanation: content,
                        socraticDialogue,
                        currentStep
                      });
                    } catch (error) {
                      console.error('自动保存AI讲解失败:', error);
                    }
                  }
                }}
              />
            )}

            {currentStep === 'DIAGNOSE' && (
              <QuizStep
                knowledgeContent={learningContent}
                region={region}
                grade={grade}
                semester={semester}
                subject={subject}
                topic={topic}
                topicId={topicId}
                onComplete={handleQuizComplete}
                onBack={() => {}}
              />
            )}

            {currentStep === 'ANALYSIS' && quizResults && (
              <ResultStep
                answers={quizResults.answers || []}
                questions={quizResults.questions || []}
                knowledgeContent={learningContent}
                onRestart={() => setCurrentStep('DIAGNOSE')}
                onContinue={handleResultNext}
              />
            )}

            {currentStep === 'VERIFY' && (
              <ReviewStep
                content={learningContent}
                score={quizResults?.score || 0}
                totalQuestions={quizResults?.questions?.length || 0}
                understandingLevel={80}
                onContinue={handleReviewComplete}
                onRestart={() => setCurrentStep('REMEDY')}
                session={{
                  topic: topic || '',
                  subject: subject || '',
                  createdAt: new Date(),
                  steps: []
                }}
                quizQuestions={quizResults?.questions || []}
                learningDuration={Math.floor((Date.now() - (lastSaveTime || Date.now())) / 60000) || 25}
                onAiSummaryGenerated={(summary) => setAiSummary(summary)}
                conversationId={conversationId || undefined}
                grade={grade}
              />
            )}

            {currentStep === 'DONE' && (
              <div className="mx-auto max-w-2xl py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div>
                <h2 className="mt-5 text-2xl font-bold text-slate-900">这次先学到这里</h2>
                <p className="mt-2 text-slate-600">内容和对话已经保存。学习不需要为了完成流程而继续。</p>
                <div className="mt-7 flex flex-wrap justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleModeChange(learningMode === 'quiz' ? 'guide' : learningMode)}
                    className="zen-button px-5 py-3"
                  >
                    继续这个主题
                  </button>
                  <Link href="/learning-setup" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-medium text-slate-700 hover:bg-slate-50">
                    学另一个问题
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 学习总结弹窗 */}
      {showSummaryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[80vh] overflow-hidden">
            {/* 弹窗头部 */}
            <div className="border-b border-sky-100 bg-gradient-to-r from-sky-500 to-blue-600 text-white p-6 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h2 className="text-2xl font-bold">上一次课程总结</h2>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 弹窗内容 */}
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {aiSummary ? (
                <div className="prose prose-lg max-w-none">
                  <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
                    <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                      {aiSummary}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-500 text-lg">暂无课程总结</p>
                  <p className="text-gray-400 text-sm mt-2">完成学习流程后将自动生成课程总结</p>
                </div>
              )}
            </div>

            {/* 弹窗底部 */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-sky-500 to-blue-600 text-white rounded-lg hover:from-sky-500 hover:to-blue-700 transition-colors duration-200 shadow-md"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LearningInterfacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-200 border-t-sky-500 mx-auto mb-4"></div>
          <p className="text-slate-600">正在加载学习界面...</p>
        </div>
      </div>
    }>
      <LearningInterfaceContent />
    </Suspense>
  );
}
