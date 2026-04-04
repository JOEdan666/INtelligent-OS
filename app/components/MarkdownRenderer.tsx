'use client';

import React, { Component, ErrorInfo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useMarkdownRenderer } from './markdown/useMarkdownRenderer';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  fontSize?: 'sm' | 'base' | 'lg';
}

class ErrorBoundary extends Component<{ children: React.ReactNode, fallback: React.ReactNode }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Markdown rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ 
  content, 
  className = '',
  fontSize = 'base'
}) => {
  const proseSize = {
    sm: 'prose-sm',
    base: 'prose-base',
    lg: 'prose-lg'
  }[fontSize];

  const { processedContent, remarkPlugins, rehypePlugins, components } = useMarkdownRenderer(content);

  return (
    <ErrorBoundary fallback={<div className="text-red-500 p-2 border border-red-200 rounded bg-red-50 text-sm">渲染内容出错，请查看控制台</div>}>
      <div className={`markdown-wrapper ${className} prose ${proseSize} prose-slate dark:prose-invert max-w-none break-words
          prose-headings:scroll-mt-24
          prose-headings:font-semibold prose-headings:tracking-tight
          prose-strong:font-semibold prose-strong:text-current
          prose-em:italic prose-em:text-current prose-em:font-serif
          prose-p:leading-relaxed prose-p:my-4
          prose-pre:p-0
          prose-li:my-1.5
          prose-ul:my-4 prose-ol:my-4
          [&_.katex-display]:overflow-x-auto [&_.katex-display]:overflow-y-hidden [&_.katex-display]:py-2
          [&_ul]:list-disc [&_ul_ul]:list-circle [&_ul_ul_ul]:list-square
          [&_li]:leading-relaxed`}>
        <ReactMarkdown
          remarkPlugins={remarkPlugins}
          rehypePlugins={rehypePlugins}
          components={components}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(MarkdownRenderer);
