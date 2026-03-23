const fs = require('fs');
const prisma = require('../lib/prisma');
const { processDocument } = require('../lib/ragService');

function isRagInfraUnavailable(err) {
  const message = String(err?.message || '').toLowerCase();
  return (
    err?.code === 'P2021' || // missing table
    err?.code === 'P2022' || // missing column
    message.includes('ragdocument') ||
    message.includes('rag_documents') ||
    message.includes('extension "vector" is not available') ||
    message.includes('type "vector" does not exist')
  );
}

// ─── POST /api/rag/documents ──────────────────────────────
exports.uploadDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const { file } = req;

    // Create document record
    const doc = await prisma.ragDocument.create({
      data: {
        userId: req.user.id,
        sessionId: req.body.session_id ? parseInt(req.body.session_id, 10) : null,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        filePath: file.path,
        status: 'processing',
      },
    });

    // Process document asynchronously (extract, chunk, embed)
    // Don't await — let it run in background so upload response is fast
    processDocument(doc.id).catch(err => {
      console.error(`[RAG] Background processing failed for doc ${doc.id}:`, err.message);
    });

    return res.status(201).json({
      success: true,
      data: {
        id: doc.id,
        original_name: doc.originalName,
        mime_type: doc.mimeType,
        size_bytes: doc.sizeBytes,
        status: doc.status,
        created_at: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('uploadDocument error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── GET /api/rag/documents ───────────────────────────────
exports.listDocuments = async (req, res) => {
  try {
    const docs = await prisma.ragDocument.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        originalName: true,
        mimeType: true,
        sizeBytes: true,
        status: true,
        totalChunks: true,
        createdAt: true,
      },
    });

    const data = docs.map(d => ({
      id: d.id,
      original_name: d.originalName,
      mime_type: d.mimeType,
      size_bytes: d.sizeBytes,
      status: d.status,
      total_chunks: d.totalChunks,
      created_at: d.createdAt,
    }));

    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (isRagInfraUnavailable(err)) {
      // Degrade gracefully so chat UI still loads when pgvector/RAG tables are unavailable.
      return res.status(200).json({
        success: true,
        data: [],
        warning: 'RAG storage is not configured on this environment.',
      });
    }
    console.error('listDocuments error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── GET /api/rag/documents/:id ───────────────────────────
exports.getDocument = async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ success: false, error: 'Invalid document ID' });
    }

    const doc = await prisma.ragDocument.findUnique({
      where: { id: docId },
      include: {
        _count: { select: { chunks: true } },
      },
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    if (doc.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.status(200).json({
      success: true,
      data: {
        id: doc.id,
        original_name: doc.originalName,
        mime_type: doc.mimeType,
        size_bytes: doc.sizeBytes,
        status: doc.status,
        total_chunks: doc._count.chunks,
        file_path: doc.filePath,
        created_at: doc.createdAt,
      },
    });
  } catch (err) {
    console.error('getDocument error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── DELETE /api/rag/documents/:id ────────────────────────
exports.deleteDocument = async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ success: false, error: 'Invalid document ID' });
    }

    const doc = await prisma.ragDocument.findUnique({ where: { id: docId } });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    if (doc.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Delete from database (cascade deletes chunks and session links)
    await prisma.ragDocument.delete({ where: { id: docId } });

    // Delete file from filesystem
    try {
      if (fs.existsSync(doc.filePath)) {
        fs.unlinkSync(doc.filePath);
      }
    } catch (fileErr) {
      console.error('Error deleting file:', fileErr.message);
      // Don't fail the request — DB record is already gone
    }

    return res.status(200).json({
      success: true,
      data: { message: 'Document deleted' },
    });
  } catch (err) {
    console.error('deleteDocument error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};

// ─── GET /api/rag/documents/:id/status ────────────────────
exports.getDocumentStatus = async (req, res) => {
  try {
    const docId = parseInt(req.params.id, 10);
    if (isNaN(docId)) {
      return res.status(400).json({ success: false, error: 'Invalid document ID' });
    }

    const doc = await prisma.ragDocument.findUnique({
      where: { id: docId },
      select: { id: true, userId: true, status: true, totalChunks: true },
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    if (doc.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    return res.status(200).json({
      success: true,
      data: { id: doc.id, status: doc.status, total_chunks: doc.totalChunks },
    });
  } catch (err) {
    console.error('getDocumentStatus error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
};
