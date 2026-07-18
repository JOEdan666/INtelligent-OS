'use client'

import React, { useState, useCallback, useRef, useEffect, KeyboardEvent } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable'
import DraggableBlock from './DraggableBlock'
import BlockMenu from './BlockMenu'
import { Block, BlockType, createBlock, generateBlockId } from '@/app/types/block'

interface BlockEditorProps {
  blocks: Block[]
  onChange: (blocks: Block[]) => void
  placeholder?: string
  autoFocus?: boolean
  readOnly?: boolean
}

export default function BlockEditor({
  blocks,
  onChange,
  placeholder = "输入 '/' 查看命令，或直接开始编辑...",
  autoFocus = false,
  readOnly = false
}: BlockEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [focusedBlockId, setFocusedBlockId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 })
  const [menuQuery, setMenuQuery] = useState('')
  const editorRef = useRef<HTMLDivElement>(null)

  // Initialize with empty block if no blocks
  useEffect(() => {
    if (blocks.length === 0 && !readOnly) {
      const initialBlock = createBlock('paragraph', '', 0)
      onChange([initialBlock])
      if (autoFocus) {
        setFocusedBlockId(initialBlock.id)
      }
    }
  }, [blocks.length, autoFocus, onChange, readOnly])

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  )

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = blocks.findIndex(b => b.id === active.id)
      const newIndex = blocks.findIndex(b => b.id === over.id)
      const newBlocks = arrayMove(blocks, oldIndex, newIndex).map((b, i) => ({
        ...b,
        order: i
      }))
      onChange(newBlocks)
    }
  }, [blocks, onChange])

  // Handle block content change
  const handleBlockChange = useCallback((blockId: string, content: string, properties?: Block['properties']) => {
    const newBlocks = blocks.map(b =>
      b.id === blockId
        ? { ...b, content, properties: properties ?? b.properties, updatedAt: Date.now() }
        : b
    )
    onChange(newBlocks)
  }, [blocks, onChange])

  // Handle block type change
  const handleBlockTypeChange = useCallback((blockId: string, type: BlockType) => {
    const newBlocks = blocks.map(b =>
      b.id === blockId
        ? { ...b, type, updatedAt: Date.now() }
        : b
    )
    onChange(newBlocks)
    setMenuOpen(false)
    setMenuQuery('')
  }, [blocks, onChange])

  // Add new block after specified block
  const handleAddBlock = useCallback((afterBlockId: string) => {
    const index = blocks.findIndex(b => b.id === afterBlockId)
    const newBlock = createBlock('paragraph', '', index + 1)
    const newBlocks = [
      ...blocks.slice(0, index + 1),
      newBlock,
      ...blocks.slice(index + 1).map(b => ({ ...b, order: b.order + 1 }))
    ]
    onChange(newBlocks)
    // Focus new block after render
    setTimeout(() => setFocusedBlockId(newBlock.id), 0)
  }, [blocks, onChange])

  // Delete block
  const handleDeleteBlock = useCallback((blockId: string) => {
    if (blocks.length <= 1) {
      // Don't delete the last block, just clear it
      handleBlockChange(blockId, '')
      return
    }

    const index = blocks.findIndex(b => b.id === blockId)
    const newBlocks = blocks.filter(b => b.id !== blockId).map((b, i) => ({ ...b, order: i }))
    onChange(newBlocks)

    // Focus previous block
    if (index > 0) {
      setTimeout(() => setFocusedBlockId(blocks[index - 1].id), 0)
    }
  }, [blocks, onChange, handleBlockChange])

  // Handle key events for navigation and menu
  const handleKeyDown = useCallback((blockId: string, e: KeyboardEvent<HTMLElement>) => {
    // Open menu on '/'
    if (e.key === '/' && !menuOpen) {
      e.preventDefault()
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        const rect = range.getBoundingClientRect()
        setMenuPosition({
          top: rect.bottom + 8,
          left: rect.left
        })
      }
      setMenuOpen(true)
      setMenuQuery('')
      return
    }

    // Arrow key navigation between blocks
    if (e.key === 'ArrowUp' && !menuOpen) {
      const index = blocks.findIndex(b => b.id === blockId)
      if (index > 0) {
        e.preventDefault()
        setFocusedBlockId(blocks[index - 1].id)
      }
    }

    if (e.key === 'ArrowDown' && !menuOpen) {
      const index = blocks.findIndex(b => b.id === blockId)
      if (index < blocks.length - 1) {
        e.preventDefault()
        setFocusedBlockId(blocks[index + 1].id)
      }
    }

    // Tab to indent (for lists)
    if (e.key === 'Tab') {
      e.preventDefault()
      // TODO: Handle list indentation
    }
  }, [blocks, menuOpen])

  // Handle menu selection
  const handleMenuSelect = useCallback((type: BlockType) => {
    if (focusedBlockId) {
      handleBlockTypeChange(focusedBlockId, type)
    }
    setMenuOpen(false)
    setMenuQuery('')
  }, [focusedBlockId, handleBlockTypeChange])

  if (readOnly) {
    return (
      <div className="notion-editor notion-page">
        {blocks.map(block => (
          <DraggableBlock
            key={block.id}
            block={block}
            isSelected={false}
            isFocused={false}
            onSelect={() => {}}
            onFocus={() => {}}
            onBlur={() => {}}
            onChange={() => {}}
            onKeyDown={() => {}}
            onAddBlock={() => {}}
            onDelete={() => {}}
            onTypeChange={() => {}}
          />
        ))}
      </div>
    )
  }

  return (
    <div ref={editorRef} className="notion-editor notion-page relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={blocks.map(b => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map(block => (
            <DraggableBlock
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              isFocused={focusedBlockId === block.id}
              onSelect={() => setSelectedBlockId(block.id)}
              onFocus={() => setFocusedBlockId(block.id)}
              onBlur={() => {
                if (focusedBlockId === block.id) {
                  // Don't immediately clear focus to allow menu interactions
                  setTimeout(() => {
                    if (!menuOpen) {
                      setFocusedBlockId(null)
                    }
                  }, 100)
                }
              }}
              onChange={(content, props) => handleBlockChange(block.id, content, props)}
              onKeyDown={(e) => handleKeyDown(block.id, e)}
              onAddBlock={() => handleAddBlock(block.id)}
              onDelete={() => handleDeleteBlock(block.id)}
              onTypeChange={(type) => handleBlockTypeChange(block.id, type)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {/* Empty state */}
      {blocks.length === 0 && (
        <div
          className="text-gray-400 cursor-text py-4"
          onClick={() => {
            const newBlock = createBlock('paragraph', '', 0)
            onChange([newBlock])
            setTimeout(() => setFocusedBlockId(newBlock.id), 0)
          }}
        >
          {placeholder}
        </div>
      )}

      {/* Block menu */}
      <BlockMenu
        isOpen={menuOpen}
        position={menuPosition}
        onSelect={handleMenuSelect}
        onClose={() => {
          setMenuOpen(false)
          setMenuQuery('')
        }}
        searchQuery={menuQuery}
      />
    </div>
  )
}
