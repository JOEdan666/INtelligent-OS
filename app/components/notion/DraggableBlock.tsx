'use client'

import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import Block from './Block'
import type { Block as BlockType, BlockType as BlockTypeEnum } from '@/app/types/block'
import { KeyboardEvent } from 'react'

interface DraggableBlockProps {
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
}

export default function DraggableBlock({
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
  onTypeChange
}: DraggableBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as const
  }

  return (
    <div ref={setNodeRef} style={style}>
      <Block
        block={block}
        isSelected={isSelected}
        isFocused={isFocused}
        onSelect={onSelect}
        onFocus={onFocus}
        onBlur={onBlur}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onAddBlock={onAddBlock}
        onDelete={onDelete}
        onTypeChange={onTypeChange}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  )
}
