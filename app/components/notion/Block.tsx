'use client'

import React, { useRef, useEffect, KeyboardEvent } from 'react'
import { Block as BlockType, BlockType as BlockTypeEnum, parseMarkdownShortcut } from '@/app/types/block'
import { GripVertical, Plus } from 'lucide-react'

interface BlockProps {
  block: BlockType
  isSelected: boolean
  isFocused: boolean
  onSelect: () => void
  onFocus: () => void
  onBlur: () => void
  onChange: (content: string, properties?: BlockType['properties']) => void
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void
  onAddBlock: () => void
  onDelete: () => void
  onTypeChange: (type: BlockTypeEnum) => void
  dragHandleProps?: Record<string, unknown>
}

const PLACEHOLDER_MAP: Record<BlockTypeEnum, string> = {
  paragraph: "输入 '/' 查看命令...",
  heading1: '标题 1',
  heading2: '标题 2',
  heading3: '标题 3',
  bulleted_list: '列表项',
  numbered_list: '列表项',
  todo_list: '待办事项',
  code: '// 代码',
  math: '数学公式',
  image: '',
  table: '',
  callout: '提示内容',
  toggle: '折叠标题',
  quote: '引用内容',
  divider: ''
}

export default function Block({
  block,
  isSelected,
  isFocused,
  onSelect,
  onFocus,
  onBlur,
  onChange,
  onKeyDown,
  onAddBlock,
  onDelete,
  onTypeChange,
  dragHandleProps
}: BlockProps) {
  const contentRef = useRef<HTMLDivElement>(null)

  // Focus management
  useEffect(() => {
    if (isFocused && contentRef.current) {
      contentRef.current.focus()
      // Move cursor to end
      const selection = window.getSelection()
      const range = document.createRange()
      range.selectNodeContents(contentRef.current)
      range.collapse(false)
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [isFocused])

  // Sync content from block data
  useEffect(() => {
    if (contentRef.current && contentRef.current.innerText !== block.content) {
      contentRef.current.innerText = block.content
    }
  }, [block.id]) // Only on block change, not content change

  const handleInput = () => {
    if (!contentRef.current) return
    const text = contentRef.current.innerText

    // Check for markdown shortcuts at the start
    const shortcut = parseMarkdownShortcut(text)
    if (shortcut && shortcut.type !== block.type) {
      onTypeChange(shortcut.type)
      onChange(shortcut.content)
      // Update DOM content
      setTimeout(() => {
        if (contentRef.current) {
          contentRef.current.innerText = shortcut.content
        }
      }, 0)
      return
    }

    onChange(text)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onAddBlock()
      return
    }

    if (e.key === 'Backspace' && contentRef.current?.innerText === '') {
      e.preventDefault()
      onDelete()
      return
    }

    onKeyDown(e)
  }

  const handleTodoToggle = () => {
    if (block.type === 'todo_list') {
      onChange(block.content, {
        ...block.properties,
        checked: !block.properties?.checked
      })
    }
  }

  const handleToggleCollapse = () => {
    if (block.type === 'toggle') {
      onChange(block.content, {
        ...block.properties,
        collapsed: !block.properties?.collapsed
      })
    }
  }

  const renderBlockContent = () => {
    switch (block.type) {
      case 'heading1':
        return (
          <div
            ref={contentRef}
            className="notion-heading1 notion-block-content"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={PLACEHOLDER_MAP.heading1}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )

      case 'heading2':
        return (
          <div
            ref={contentRef}
            className="notion-heading2 notion-block-content"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={PLACEHOLDER_MAP.heading2}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )

      case 'heading3':
        return (
          <div
            ref={contentRef}
            className="notion-heading3 notion-block-content"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={PLACEHOLDER_MAP.heading3}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )

      case 'bulleted_list':
        return (
          <div className="notion-list">
            <li className="notion-bulleted-item">
              <div
                ref={contentRef}
                className="notion-block-content"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={PLACEHOLDER_MAP.bulleted_list}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </li>
          </div>
        )

      case 'numbered_list':
        return (
          <div className="notion-list">
            <li className="notion-numbered-item">
              <div
                ref={contentRef}
                className="notion-block-content"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={PLACEHOLDER_MAP.numbered_list}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </li>
          </div>
        )

      case 'todo_list':
        return (
          <div className="notion-todo">
            <div
              className={`notion-todo-checkbox ${block.properties?.checked ? 'checked' : ''}`}
              onClick={handleTodoToggle}
            >
              {block.properties?.checked && (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
            </div>
            <div
              ref={contentRef}
              className={`notion-block-content flex-1 ${block.properties?.checked ? 'notion-todo-text completed' : ''}`}
              contentEditable
              suppressContentEditableWarning
              data-placeholder={PLACEHOLDER_MAP.todo_list}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        )

      case 'quote':
        return (
          <div
            ref={contentRef}
            className="notion-quote notion-block-content"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={PLACEHOLDER_MAP.quote}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )

      case 'code':
        return (
          <div className="notion-code">
            <div className="notion-code-header">
              <span className="notion-code-language">{block.properties?.language || 'javascript'}</span>
            </div>
            <pre>
              <code
                ref={contentRef}
                className="notion-block-content"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={PLACEHOLDER_MAP.code}
                onInput={handleInput}
                onKeyDown={(e) => {
                  // Allow Enter in code blocks
                  if (e.key === 'Enter') {
                    document.execCommand('insertLineBreak')
                    e.preventDefault()
                    return
                  }
                  handleKeyDown(e)
                }}
                onFocus={onFocus}
                onBlur={onBlur}
              />
            </pre>
          </div>
        )

      case 'callout':
        const calloutType = block.properties?.calloutType || 'info'
        return (
          <div className={`notion-callout ${calloutType}`}>
            <div className="notion-callout-icon">
              {calloutType === 'info' && '💡'}
              {calloutType === 'warning' && '⚠️'}
              {calloutType === 'success' && '✅'}
              {calloutType === 'error' && '❌'}
              {calloutType === 'note' && '📝'}
            </div>
            <div
              ref={contentRef}
              className="notion-callout-content notion-block-content"
              contentEditable
              suppressContentEditableWarning
              data-placeholder={PLACEHOLDER_MAP.callout}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        )

      case 'toggle':
        return (
          <div className="notion-toggle">
            <div className="notion-toggle-header" onClick={handleToggleCollapse}>
              <span className={`notion-toggle-icon ${block.properties?.collapsed ? '' : 'expanded'}`}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                  <path d="M4 2L8 6L4 10" />
                </svg>
              </span>
              <div
                ref={contentRef}
                className="notion-block-content flex-1"
                contentEditable
                suppressContentEditableWarning
                data-placeholder={PLACEHOLDER_MAP.toggle}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className={`notion-toggle-content ${block.properties?.collapsed ? 'collapsed' : ''}`}>
              {/* Children would go here */}
            </div>
          </div>
        )

      case 'divider':
        return <hr className="notion-divider" />

      case 'image':
        return (
          <div className="notion-image">
            {block.properties?.url ? (
              <>
                <img src={block.properties.url} alt={block.properties.caption || ''} />
                {block.properties.caption && (
                  <div className="notion-image-caption">{block.properties.caption}</div>
                )}
              </>
            ) : (
              <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg text-center text-gray-400 cursor-pointer hover:border-gray-300">
                点击添加图片
              </div>
            )}
          </div>
        )

      case 'math':
        return (
          <div className="notion-math">
            <div
              ref={contentRef}
              className="notion-block-content font-mono"
              contentEditable
              suppressContentEditableWarning
              data-placeholder={PLACEHOLDER_MAP.math}
              onInput={handleInput}
              onKeyDown={handleKeyDown}
              onFocus={onFocus}
              onBlur={onBlur}
            />
          </div>
        )

      case 'table':
        const headers = block.properties?.headers || ['列1', '列2']
        const rows = block.properties?.rows || [['', '']]
        return (
          <table className="notion-table">
            <thead>
              <tr>
                {headers.map((header, i) => (
                  <th key={i}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )

      default:
        return (
          <div
            ref={contentRef}
            className="notion-paragraph notion-block-content"
            contentEditable
            suppressContentEditableWarning
            data-placeholder={PLACEHOLDER_MAP.paragraph}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        )
    }
  }

  return (
    <div
      className={`notion-block group ${isSelected ? 'selected' : ''}`}
      onClick={onSelect}
    >
      {/* Block handle */}
      <div className="notion-block-handle">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAddBlock()
          }}
          title="添加块"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          {...dragHandleProps}
          title="拖动排序"
        >
          <GripVertical size={14} />
        </button>
      </div>

      {/* Block content */}
      {renderBlockContent()}
    </div>
  )
}
