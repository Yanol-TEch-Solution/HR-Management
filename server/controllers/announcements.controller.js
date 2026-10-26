import prisma from '../db.js'

const canManageAnnouncements = (role) => ['HR_MANAGER', 'ADMIN', 'HR_ADMIN', 'HR'].includes(String(role || '').toUpperCase())

export async function listAnnouncements(req, res) {
  try {
    const isHR = canManageAnnouncements(req.user?.role)
    const announcements = await prisma.announcement.findMany({
      where: isHR ? {} : { published: true, OR: [{ recipientEmployeeId: null }, { recipientEmployeeId: req.user?.employeeId || '' }] },
      include: { author: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return res.json(announcements)
  } catch (error) {
    console.error('List announcements error:', error)
    return res.status(500).json({ message: 'Unable to load company announcements.' })
  }
}

export async function createAnnouncement(req, res) {
  if (!canManageAnnouncements(req.user?.role)) {
    return res.status(403).json({ message: 'Only HR administrators can create announcements.' })
  }

  const title = String(req.body?.title || '').trim()
  const content = String(req.body?.content || '').trim()
  const category = String(req.body?.category || 'General').trim()
  const priority = String(req.body?.priority || 'Normal').trim()
  const recipientEmployeeId = String(req.body?.recipientEmployeeId || '').trim() || null

  if (!title || !content) {
    return res.status(400).json({ message: 'Announcement title and message are required.' })
  }
  if (title.length > 140 || content.length > 10000) {
    return res.status(400).json({ message: 'Title must be at most 140 characters and message at most 10,000 characters.' })
  }

  try {
    if (recipientEmployeeId) {
      const employee = await prisma.employee.findUnique({ where: { id: recipientEmployeeId }, select: { id: true } })
      if (!employee) return res.status(400).json({ message: 'Select a valid employee for this individual announcement.' })
    }
    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category: category || 'General',
        priority: ['Normal', 'Important', 'Urgent'].includes(priority) ? priority : 'Normal',
        recipientEmployeeId,
        authorId: Number.isInteger(Number(req.user?.userId)) ? Number(req.user.userId) : null,
        published: true,
      },
      include: { author: { select: { id: true, name: true } } },
    })

    req.app.get('io')?.emit('announcement:new', announcement)
    return res.status(201).json(announcement)
  } catch (error) {
    console.error('Create announcement error:', error)
    return res.status(500).json({ message: 'Unable to save the announcement.' })
  }
}

export async function deleteAnnouncement(req, res) {
  if (!canManageAnnouncements(req.user?.role)) {
    return res.status(403).json({ message: 'Only HR administrators can delete announcements.' })
  }
  try {
    const announcement = await prisma.announcement.findUnique({ where: { id: req.params.id }, select: { id: true } })
    if (!announcement) return res.status(404).json({ message: 'Announcement not found.' })
    await prisma.announcement.delete({ where: { id: req.params.id } })
    req.app.get('io')?.emit('announcement:deleted', { id: req.params.id })
    return res.json({ success: true, id: req.params.id })
  } catch (error) {
    console.error('Delete announcement error:', error)
    return res.status(500).json({ message: 'Unable to delete the announcement.' })
  }
}
