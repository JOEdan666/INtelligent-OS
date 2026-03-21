import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/prisma'
import { memoryDB } from '@/app/lib/memory-db'
import { clearDbUnavailable, noteDbUnavailable, shouldUseLocalDb } from '@/app/lib/db-fallback'

export async function GET(request: NextRequest) {
  try {
    if (shouldUseLocalDb()) {
      const items = await memoryDB.getKnowledgeBaseItems()
      return NextResponse.json({ success: true, data: items, source: 'local' })
    }

    // 获取知识库文件列表
    const items = await prisma.knowledgeBaseItem.findMany({
      orderBy: { createdAt: 'desc' }
    })
    clearDbUnavailable()
    
    // 处理BigInt序列化问题
    const serializedItems = items.map(item => ({
      ...item,
      lastModified: Number(item.lastModified)
    }))
    
    return NextResponse.json({ success: true, data: serializedItems })
  } catch (error) {
    if (noteDbUnavailable(error)) {
      const items = await memoryDB.getKnowledgeBaseItems()
      return NextResponse.json({ success: true, data: items, source: 'local' })
    }

    console.error('获取知识库文件失败:', error)
    return NextResponse.json(
      { success: false, error: '获取知识库文件失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let items: any[] = []

  try {
    const body = await request.json()
    items = body.items
    
    if (!Array.isArray(items)) {
      return NextResponse.json(
        { success: false, error: '无效的数据格式' },
        { status: 400 }
      )
    }
    
    // 不再验证用户ID，直接使用匿名保存
    
    // 批量创建知识库文件
    const itemsToCreate = items.map((item: any) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      size: item.size,
      lastModified: item.lastModified,
      text: item.text,
      ocrText: item.ocrText,
      notes: item.notes,
      dataUrl: item.dataUrl,
      include: item.include ?? true
    }))

    if (shouldUseLocalDb()) {
      const createdItems = await memoryDB.createKnowledgeBaseItems(itemsToCreate)
      return NextResponse.json({
        success: true,
        data: createdItems,
        message: `成功保存${items.length}个文件到本地数据库`,
        source: 'local',
      })
    }
    
    await prisma.knowledgeBaseItem.createMany({
      data: itemsToCreate
    })
    clearDbUnavailable()
    
    // 查询刚创建的项目
    const createdItems = await prisma.knowledgeBaseItem.findMany({
      where: {
        id: {
          in: items.map((item: any) => item.id)
        }
      }
    })
    
    // 转换BigInt字段为可序列化的格式
    const serializedItems = createdItems.map(item => ({
      ...item,
      lastModified: Number(item.lastModified)
    }))
    
    return NextResponse.json({ 
      success: true, 
      data: serializedItems,
      message: `成功保存${items.length}个文件到数据库`
    })
  } catch (error) {
    if (noteDbUnavailable(error) && Array.isArray(items) && items.length > 0) {
      const itemsToCreate = items.map((item: any) => ({
        id: item.id,
        name: item.name,
        type: item.type,
        size: item.size,
        lastModified: item.lastModified,
        text: item.text,
        ocrText: item.ocrText,
        notes: item.notes,
        dataUrl: item.dataUrl,
        include: item.include ?? true
      }))

      const createdItems = await memoryDB.createKnowledgeBaseItems(itemsToCreate)
      return NextResponse.json({
        success: true,
        data: createdItems,
        message: `成功保存${items.length}个文件到本地数据库`,
        source: 'local',
      })
    }

    console.error('保存知识库文件失败:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: '保存知识库文件失败',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  let id = ''
  let updates: Record<string, unknown> = {}

  try {
    const body = await request.json()
    id = body.id
    updates = body.updates || {}
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: '缺少文件ID' },
        { status: 400 }
      )
    }

    if (shouldUseLocalDb()) {
      const updatedItem = await memoryDB.updateKnowledgeBaseItem(id, updates)
      return NextResponse.json({
        success: true,
        data: updatedItem,
        message: '文件更新成功',
        source: 'local',
      })
    }
    
    // 更新知识库文件
    const updatedItem = await prisma.knowledgeBaseItem.update({
      where: { id },
      data: updates
    })
    clearDbUnavailable()
    
    // 处理BigInt序列化问题
    const serializedItem = {
      ...updatedItem,
      lastModified: Number(updatedItem.lastModified)
    }
    
    return NextResponse.json({ 
      success: true, 
      data: serializedItem,
      message: '文件更新成功'
    })
  } catch (error) {
    if (noteDbUnavailable(error) && id) {
      const updatedItem = await memoryDB.updateKnowledgeBaseItem(id, updates)
      return NextResponse.json({
        success: true,
        data: updatedItem,
        message: '文件更新成功',
        source: 'local',
      })
    }

    console.error('更新知识库文件失败:', error)
    return NextResponse.json(
      { success: false, error: '更新知识库文件失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (shouldUseLocalDb()) {
      await memoryDB.deleteKnowledgeBaseItem(id || undefined)
      return NextResponse.json({
        success: true,
        message: id ? '文件删除成功' : '所有文件删除成功',
        source: 'local',
      })
    }
    if (id) {
      // 删除单个文件
      await prisma.knowledgeBaseItem.delete({
        where: { id }
      })
      clearDbUnavailable()
      
      return NextResponse.json({ 
        success: true, 
        message: '文件删除成功'
      })
    } else {
      // 删除所有文件
      await prisma.knowledgeBaseItem.deleteMany({})
      clearDbUnavailable()
      
      return NextResponse.json({ 
        success: true, 
        message: '所有文件删除成功'
      })
    }
  } catch (error) {
    if (noteDbUnavailable(error)) {
      const { searchParams } = new URL(request.url)
      const id = searchParams.get('id')
      await memoryDB.deleteKnowledgeBaseItem(id || undefined)
      return NextResponse.json({
        success: true,
        message: id ? '文件删除成功' : '所有文件删除成功',
        source: 'local',
      })
    }

    console.error('删除知识库文件失败:', error)
    return NextResponse.json(
      { success: false, error: '删除知识库文件失败' },
      { status: 500 }
    )
  }
}
