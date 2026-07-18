import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { memoryDB } from '@/app/lib/memory-db'
import { clearDbUnavailable, noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback'
import { getAuthenticatedUserId, unauthorizedResponse } from '@/app/lib/auth-user'

// 笔记响应类型
interface NoteResponse {
  id: string
  title: string
  icon?: string | null
  cover?: string | null
  color: string
  tags: string[]
  isFavorite: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  blocks: {
    id: string
    type: string
    content: string
    properties: Record<string, unknown> | null
    order: number
    parentId?: string | null
  }[]
}

// GET - 获取所有笔记
export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('archived') === 'true'
    const tag = searchParams.get('tag')
    const search = searchParams.get('search')

    if (shouldUseLocalDb()) {
      const notes = await memoryDB.getNotes({ userId, includeArchived, tag, search })
      const response: NoteResponse[] = notes.map(note => ({
        id: note.id,
        title: note.title,
        icon: note.icon,
        cover: note.cover,
        color: note.color,
        tags: note.tags,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        blocks: note.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          properties: block.properties as Record<string, unknown> | null,
          order: block.order,
          parentId: block.parentId
        }))
      }))

      return NextResponse.json({ success: true, data: response, source: 'local' })
    }

    const where: Record<string, unknown> = { userId }

    if (!includeArchived) {
      where.isArchived = false
    }

    if (tag) {
      where.tags = { has: tag }
    }

    const notes = await prisma.note.findMany({
      where,
      include: {
        blocks: {
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { updatedAt: 'desc' }
    })
    clearDbUnavailable()

    // 如果有搜索词，在内存中过滤
    let filteredNotes = notes
    if (search) {
      const searchLower = search.toLowerCase()
      filteredNotes = notes.filter(note => {
        const titleMatch = note.title.toLowerCase().includes(searchLower)
        const contentMatch = note.blocks.some(block =>
          block.content.toLowerCase().includes(searchLower)
        )
        return titleMatch || contentMatch
      })
    }

    const response: NoteResponse[] = filteredNotes.map(note => ({
      id: note.id,
      title: note.title,
      icon: note.icon,
      cover: note.cover,
      color: note.color,
      tags: note.tags,
      isFavorite: note.isFavorite,
      isArchived: note.isArchived,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      blocks: note.blocks.map(block => ({
        id: block.id,
        type: block.type,
        content: block.content,
        properties: block.properties as Record<string, unknown> | null,
        order: block.order,
        parentId: block.parentId
      }))
    }))

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    if (noteDbUnavailable(error)) {
      const { searchParams } = new URL(request.url)
      const includeArchived = searchParams.get('archived') === 'true'
      const tag = searchParams.get('tag')
      const search = searchParams.get('search')
      const userId = await getAuthenticatedUserId()
      if (!userId) return unauthorizedResponse()
      const notes = await memoryDB.getNotes({ userId, includeArchived, tag, search })
      const response: NoteResponse[] = notes.map(note => ({
        id: note.id,
        title: note.title,
        icon: note.icon,
        cover: note.cover,
        color: note.color,
        tags: note.tags,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        blocks: note.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          properties: block.properties as Record<string, unknown> | null,
          order: block.order,
          parentId: block.parentId
        }))
      }))

      return NextResponse.json({ success: true, data: response, source: 'local' })
    }

    console.error('获取笔记失败:', error)
    return NextResponse.json(
      { success: false, error: '获取笔记失败' },
      { status: 500 }
    )
  }
}

// POST - 创建新笔记
export async function POST(request: NextRequest) {
  let body: any = null
  let ownerId = ''

  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return unauthorizedResponse()
    ownerId = userId

    body = await request.json()
    const { title, content, color, tags, icon, cover, blocks } = body

    if (shouldUseLocalDb()) {
      const note = await memoryDB.createNote({ userId, title, content, color, tags, icon, cover, blocks })
      const response: NoteResponse = {
        id: note.id,
        title: note.title,
        icon: note.icon,
        cover: note.cover,
        color: note.color,
        tags: note.tags,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        blocks: note.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          properties: block.properties as Record<string, unknown> | null,
          order: block.order,
          parentId: block.parentId
        }))
      }

      return NextResponse.json({ success: true, data: response, source: 'local' })
    }

    // 创建笔记
    const note = await prisma.note.create({
      data: {
        userId,
        title: title || '未命名',
        icon: icon || null,
        cover: cover || null,
        color: color || '#3b82f6',
        tags: tags || [],
        isFavorite: false,
        isArchived: false,
        blocks: {
          create: blocks?.length > 0
            ? blocks.map((block: { type: string; content: string; properties?: Record<string, unknown>; order: number; parentId?: string }) => ({
                type: block.type || 'paragraph',
                content: block.content || '',
                properties: block.properties || null,
                order: block.order || 0,
                parentId: block.parentId || null
              }))
            : [{
                type: 'paragraph',
                content: content || '',
                properties: null,
                order: 0,
                parentId: null
              }]
        }
      },
      include: {
        blocks: {
          orderBy: { order: 'asc' }
        }
      }
    })
    clearDbUnavailable()

    const response: NoteResponse = {
      id: note.id,
      title: note.title,
      icon: note.icon,
      cover: note.cover,
      color: note.color,
      tags: note.tags,
      isFavorite: note.isFavorite,
      isArchived: note.isArchived,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      blocks: note.blocks.map(block => ({
        id: block.id,
        type: block.type,
        content: block.content,
        properties: block.properties as Record<string, unknown> | null,
        order: block.order,
        parentId: block.parentId
      }))
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    if (noteDbUnavailable(error) && body) {
      const note = await memoryDB.createNote({ ...body, userId: ownerId })
      const response: NoteResponse = {
        id: note.id,
        title: note.title,
        icon: note.icon,
        cover: note.cover,
        color: note.color,
        tags: note.tags,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        blocks: note.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          properties: block.properties as Record<string, unknown> | null,
          order: block.order,
          parentId: block.parentId
        }))
      }

      return NextResponse.json({ success: true, data: response, source: 'local' })
    }

    console.error('创建笔记失败:', error)
    return NextResponse.json(
      { success: false, error: '创建笔记失败' },
      { status: 500 }
    )
  }
}

// PUT - 更新笔记
export async function PUT(request: NextRequest) {
  let body: any = null
  let ownerId = ''

  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return unauthorizedResponse()
    ownerId = userId

    body = await request.json()
    const { id, title, content, color, tags, icon, cover, blocks, isFavorite, isArchived } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少笔记 ID' },
        { status: 400 }
      )
    }

    if (shouldUseLocalDb()) {
      const note = await memoryDB.updateNote({ ...body, userId })
      const response: NoteResponse = {
        id: note.id,
        title: note.title,
        icon: note.icon,
        cover: note.cover,
        color: note.color,
        tags: note.tags,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        blocks: note.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          properties: block.properties as Record<string, unknown> | null,
          order: block.order,
          parentId: block.parentId
        }))
      }

      return NextResponse.json({ success: true, data: response, source: 'local' })
    }

    // 构建更新数据
    const updateData: Record<string, unknown> = {}
    if (title !== undefined) updateData.title = title
    if (color !== undefined) updateData.color = color
    if (tags !== undefined) updateData.tags = tags
    if (icon !== undefined) updateData.icon = icon
    if (cover !== undefined) updateData.cover = cover
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite
    if (isArchived !== undefined) updateData.isArchived = isArchived

    const ownedNote = await prisma.note.findFirst({ where: { id, userId }, select: { id: true } })
    if (!ownedNote) {
      return NextResponse.json({ success: false, error: '笔记不存在' }, { status: 404 })
    }

    // 如果有 blocks，先删除旧的再创建新的
    if (blocks !== undefined) {
      await prisma.noteBlock.deleteMany({
        where: { noteId: id }
      })

      await prisma.noteBlock.createMany({
        data: blocks.map((block: { type: string; content: string; properties?: Record<string, unknown>; order: number; parentId?: string }) => ({
          noteId: id,
          type: block.type || 'paragraph',
          content: block.content || '',
          properties: block.properties || null,
          order: block.order || 0,
          parentId: block.parentId || null
        }))
      })
    } else if (content !== undefined) {
      // 兼容旧的 content 字段：更新第一个 block 或创建新的
      const existingBlocks = await prisma.noteBlock.findMany({
        where: { noteId: id },
        orderBy: { order: 'asc' }
      })

      if (existingBlocks.length > 0) {
        await prisma.noteBlock.update({
          where: { id: existingBlocks[0].id },
          data: { content }
        })
      } else {
        await prisma.noteBlock.create({
          data: {
            noteId: id,
            type: 'paragraph',
            content,
            order: 0
          }
        })
      }
    }

    // 更新笔记主体
    const note = await prisma.note.update({
      where: { id, userId },
      data: updateData,
      include: {
        blocks: {
          orderBy: { order: 'asc' }
        }
      }
    })
    clearDbUnavailable()

    const response: NoteResponse = {
      id: note.id,
      title: note.title,
      icon: note.icon,
      cover: note.cover,
      color: note.color,
      tags: note.tags,
      isFavorite: note.isFavorite,
      isArchived: note.isArchived,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      blocks: note.blocks.map(block => ({
        id: block.id,
        type: block.type,
        content: block.content,
        properties: block.properties as Record<string, unknown> | null,
        order: block.order,
        parentId: block.parentId
      }))
    }

    return NextResponse.json({ success: true, data: response })
  } catch (error) {
    if (noteDbUnavailable(error) && body?.id) {
      const note = await memoryDB.updateNote({ ...body, userId: ownerId })
      const response: NoteResponse = {
        id: note.id,
        title: note.title,
        icon: note.icon,
        cover: note.cover,
        color: note.color,
        tags: note.tags,
        isFavorite: note.isFavorite,
        isArchived: note.isArchived,
        createdAt: note.createdAt,
        updatedAt: note.updatedAt,
        blocks: note.blocks.map((block: any) => ({
          id: block.id,
          type: block.type,
          content: block.content,
          properties: block.properties as Record<string, unknown> | null,
          order: block.order,
          parentId: block.parentId
        }))
      }

      return NextResponse.json({ success: true, data: response, source: 'local' })
    }

    console.error('更新笔记失败:', error)
    return NextResponse.json(
      { success: false, error: '更新笔记失败' },
      { status: 500 }
    )
  }
}

// DELETE - 删除笔记
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) return unauthorizedResponse()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少笔记 ID' },
        { status: 400 }
      )
    }

    if (shouldUseLocalDb()) {
      await memoryDB.deleteNote(id, userId)
      return NextResponse.json({ success: true, message: '笔记已删除', source: 'local' })
    }

    // 由于设置了 onDelete: Cascade，删除笔记会自动删除关联的 blocks
    await prisma.note.deleteMany({ where: { id, userId } })
    clearDbUnavailable()

    return NextResponse.json({ success: true, message: '笔记已删除' })
  } catch (error) {
    if (noteDbUnavailable(error)) {
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      if (id) {
        const userId = await getAuthenticatedUserId()
        if (!userId) return unauthorizedResponse()
        await memoryDB.deleteNote(id, userId)
        return NextResponse.json({ success: true, message: '笔记已删除', source: 'local' })
      }
    }

    console.error('删除笔记失败:', error)
    return NextResponse.json(
      { success: false, error: '删除笔记失败' },
      { status: 500 }
    )
  }
}
