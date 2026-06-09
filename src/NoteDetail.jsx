import { useState, useEffect } from 'react';
import './NoteDetail.css';
import { useAuth } from './hooks/useAuth.jsx';
import notesService from './services/notes';

function NoteDetail({ noteId, onBack, onEdit }) {
  const { user } = useAuth();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(null);

  useEffect(() => {
    const fetchNote = async () => {
      try {
        setLoading(true);
        setError('');
        const { data, error: fetchError } = await notesService.getNoteById(noteId);
        
        if (fetchError) {
          throw fetchError;
        }
        
        console.log('[NoteDetail] 原始笔记数据:', data);
        console.log('[NoteDetail] images 字段类型:', typeof data?.images);
        console.log('[NoteDetail] images 字段值:', data?.images);
        setNote(data);
      } catch (err) {
        console.error('获取笔记详情失败:', err);
        setError(err.message || '获取笔记详情失败');
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [noteId]);

  const handleDelete = async () => {
    if (!note || deleteLoading) return;
    
    try {
      setDeleteLoading(true);
      console.log('尝试删除笔记:', note.id);
      
      const { error: deleteError } = await notesService.deleteNote(note.id);
      if (deleteError) throw deleteError;
      
      console.log('删除笔记成功:', note.id);
      setShowDeleteConfirm(false);
      onBack();
    } catch (err) {
      console.error('删除笔记失败:', err);
      setError('删除笔记失败: ' + (err.message || '未知错误'));
    } finally {
      setDeleteLoading(false);
    }
  };

  const openImagePreview = (index) => {
    setSelectedImageIndex(index);
  };

  const closeImagePreview = () => {
    setSelectedImageIndex(null);
  };

  const navigateImage = (direction) => {
    if (images.length === 0) return;
    const totalImages = images.length;
    let newIndex = selectedImageIndex + direction;
    
    if (newIndex < 0) newIndex = totalImages - 1;
    if (newIndex >= totalImages) newIndex = 0;
    
    setSelectedImageIndex(newIndex);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '未知时间';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const categoryColors = {
    '购物': '#FF6B6B',
    '食品': '#FFB347',
    '服饰': '#9B59B6',
    '出行': '#3498DB',
    '娱乐': '#E74C3C',
    '工具': '#1ABC9C',
    '医药': '#2ECC71',
    '教培': '#F39C12',
    '情感': '#E91E63',
    '其他': '#95A5A6',
  };

  let images = [];
  if (note?.images) {
    // Supabase 会直接返回数组，不需要 JSON.parse
    if (Array.isArray(note.images)) {
      images = note.images;
    } else if (typeof note.images === 'string') {
      // 兼容旧数据（JSON 字符串格式）
      try {
        const parsed = JSON.parse(note.images);
        images = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        images = [note.images];
      }
    } else {
      images = [note.images];
    }
  }
  // 过滤空值和无效URL
  images = images.filter(img => img && typeof img === 'string' && img.trim().length > 0);

  // 优化图片URL - 详情页使用压缩的大图 (比原图小很多)
  const optimizedImages = images.map(url => notesService.getDetailImageUrl(url));
  console.log('[NoteDetail] 解析后的 images 数组:', optimizedImages);
  console.log('[NoteDetail] images 长度:', optimizedImages.length);

  if (loading) {
    return (
      <div className="note-detail-page">
        <header className="detail-header">
          <button className="back-button" onClick={onBack}>
            <span className="back-icon">←</span>
          </button>
          <h1 className="detail-title">笔记详情</h1>
          <div className="header-spacer"></div>
        </header>
        <div className="notes-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  if (error || !note) {
    return (
      <div className="note-detail-page">
        <header className="detail-header">
          <button className="back-button" onClick={onBack}>
            <span className="back-icon">←</span>
          </button>
          <h1 className="detail-title">笔记详情</h1>
          <div className="header-spacer"></div>
        </header>
        <div className="error-state">
          <div className="error-icon">⚠️</div>
          <h2>加载失败</h2>
          <p>{error || '无法加载笔记内容'}</p>
          <button className="retry-button" onClick={onBack}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="note-detail-page">
      <header className="detail-header">
        <button className="back-button" onClick={onBack}>
          <span className="back-icon">←</span>
        </button>
        <h1 className="detail-title">笔记详情</h1>
        <div className="header-actions">
          <button 
            className="edit-button"
            onClick={() => onEdit(note.id)}
            title="编辑笔记"
          >
            ✏️ 编辑
          </button>
          <button 
            className="delete-action-button"
            onClick={() => setShowDeleteConfirm(true)}
            title="删除笔记"
          >
            🗑️ 删除
          </button>
        </div>
      </header>

      <main className="detail-content">
        <article className="note-detail-article">
          <header className="article-header">
            <h2 className="article-title">{note.title || '无标题'}</h2>
            <div className="article-meta">
              <span 
                className="article-category"
                style={{ backgroundColor: categoryColors[note.category] || '#96CEB4' }}
              >
                {note.category || '未分类'}
              </span>
              <span className="article-author">
                作者：{note.user_nickname || '匿名用户'}
              </span>
              <span className="article-date">
                📅 {formatDate(note.created_at)}
              </span>
            </div>
          </header>

          {images.length > 0 && (
            <section className="article-images-section">
              <h3 className="section-title">📷 相关图片</h3>
              <div className="article-images-grid">
                {optimizedImages.map((optimizedUrl, index) => (
                  <div
                    key={`image-${index}`}
                    className="article-image-wrapper"
                    onClick={() => openImagePreview(index)}
                  >
                    <img
                      src={optimizedUrl}
                      alt={`笔记图片 ${index + 1}`}
                      className="article-image"
                      loading="lazy"
                      decoding="async"
                    />
                    {images.length > 1 && (
                      <span className="image-number">{index + 1}/{images.length}</span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="article-content-section">
            <h3 className="section-title">📝 避雷详情</h3>
            <div className="article-content">
              {note.content ? (
                note.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="content-paragraph">
                    {paragraph}
                  </p>
                ))
              ) : (
                <p className="empty-content">暂无详情内容</p>
              )}
            </div>
          </section>

          <footer className="article-footer">
            <button 
              className="edit-footer-button"
              onClick={() => onEdit(note.id)}
            >
              <span>✏️</span>
              <span>编辑此笔记</span>
            </button>
            <button 
              className="delete-footer-button"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <span>🗑️</span>
              <span>删除此笔记</span>
            </button>
          </footer>
        </article>
      </main>

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => !deleteLoading && setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">确认删除</h3>
            <p className="modal-message">
              确定要删除这条笔记吗？此操作无法撤销，笔记内容和图片都将被永久删除。
            </p>
            <div className="modal-actions">
              <button 
                className="modal-cancel" 
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleteLoading}
              >
                取消
              </button>
              <button 
                className="modal-confirm-danger" 
                onClick={handleDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedImageIndex !== null && (
        <div className="image-viewer-overlay" onClick={closeImagePreview}>
          <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
            <button 
              className="image-viewer-close"
              onClick={closeImagePreview}
            >
              ✕
            </button>
            
            {images.length > 1 && (
              <button 
                className="image-viewer-nav image-viewer-prev"
                onClick={() => navigateImage(-1)}
              >
                ‹
              </button>
            )}
            
            <img 
              src={images[selectedImageIndex]} 
              alt={`图片 ${selectedImageIndex + 1}`}
              className="image-viewer-image"
            />
            
            {images.length > 1 && (
              <button 
                className="image-viewer-nav image-viewer-next"
                onClick={() => navigateImage(1)}
              >
                ›
              </button>
            )}
            
            <div className="image-viewer-counter">
              {selectedImageIndex + 1} / {images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default NoteDetail;
