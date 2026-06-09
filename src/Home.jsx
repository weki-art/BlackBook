import { useState, useMemo, useEffect, useRef } from 'react';
import './Home.css';
import LogoIcon from './assets/logo.svg';
import { useAuth } from './hooks/useAuth.jsx';
import { useNotes } from './hooks/useNotes.jsx';
import notesService from './services/notes';

/**
 * 优化的缩略图组件
 * 功能: 骨架屏 + 懒加载 + 加载状态 + 错误处理
 */
function ThumbnailImage({ optimizedUrl, originalUrl, alt, onViewDetail, noteId }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [src, setSrc] = useState(optimizedUrl);

  const handleImageLoad = () => {
    setLoading(false);
    setError(false);
  };

  const handleImageError = () => {
    // 如果缩略图加载失败，尝试使用原图降级
    if (src !== originalUrl && originalUrl) {
      setError(false);
      setSrc(originalUrl);
    } else {
      setLoading(false);
      setError(true);
    }
  };

  const handleClick = (e) => {
    e.stopPropagation();
    if (onViewDetail && noteId) {
      onViewDetail(noteId);
    } else {
      window.open(originalUrl || optimizedUrl, '_blank');
    }
  };

  return (
    <div
      className={`note-image-wrapper ${loading ? 'is-loading' : ''} ${error ? 'has-error' : ''}`}
      onClick={handleClick}
    >
      {/* 骨架屏 - 加载动画 */}
      {loading && (
        <div className="note-image-skeleton">
          <div className="skeleton-shimmer"></div>
        </div>
      )}

      {/* 错误状态 - 占位图标 */}
      {error && (
        <div className="note-image-error">
          <span>🖼️</span>
        </div>
      )}

      {/* 实际图片 - 懒加载 + 异步解码 */}
      {!error && (
        <img
          src={src}
          alt={alt}
          className="note-image"
          loading="lazy"
          decoding="async"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
    </div>
  );
}

function NoteCard({ note, onDelete, onEdit, onViewDetail }) {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);
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

  if (!note || typeof note !== 'object' || !note.id) {
    return null;
  }

  let images = [];
  if (note?.images) {
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

  // 使用服务端压缩的缩略图URL (减少加载时间约80-90%)
  const optimizedImages = images.map(url => notesService.getThumbnailUrl(url));
  const displayImages = optimizedImages.slice(0, 3);
  const remainingCount = images.length - displayImages.length;

  const handleCardClick = (e) => {
    if (showMenu) {
      setShowMenu(false);
      return;
    }
    if (onViewDetail) {
      onViewDetail(note.id);
    }
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setShowMenu(prev => !prev);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onEdit) {
      onEdit(note.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (onDelete) {
      onDelete(note.id);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  return (
    <div className="note-card" onClick={handleCardClick}>
      <div className="note-header">
        <h3 className="note-title">{note.title || '无标题'}</h3>
        <div className="menu-container" ref={menuRef} onClick={(e) => e.stopPropagation()}>
          <button 
            className="menu-button"
            onClick={handleMenuToggle}
            title="更多选项"
          >
            ⋯
          </button>
          {showMenu && (
            <div className="menu-dropdown">
              <button 
                className="menu-item menu-item-edit"
                onClick={handleEdit}
              >
                ✏️ 修改
              </button>
              <button 
                className="menu-item menu-item-delete"
                onClick={handleDelete}
              >
                🗑️ 删除
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="note-meta">
        <span 
          className="note-category"
          style={{ backgroundColor: categoryColors[note.category] || '#96CEB4' }}
        >
          {note.category || '未分类'}
        </span>
        <span className="note-author">
          {note.user_nickname || '匿名用户'}
        </span>
      </div>

      {displayImages.length > 0 && (
        <div className="note-images-container">
          <div className={`note-images-grid note-images-${Math.min(displayImages.length, 3)}`}>
            {displayImages.map((optimizedUrl, index) => (
              <ThumbnailImage
                key={`${note.id}-img-${index}`}
                optimizedUrl={optimizedUrl}
                originalUrl={images[index]}
                alt={`${note.title || '笔记'} - 图片 ${index + 1}`}
                onViewDetail={onViewDetail}
                noteId={note.id}
              />
            ))}
            {remainingCount > 0 && (
              <div
                className="note-image-wrapper note-more-images"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onViewDetail) {
                    onViewDetail(note.id);
                  }
                }}
              >
                <div className="more-images-overlay">
                  +{remainingCount}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <p className="note-content">{note.content || '无内容'}</p>
      <div className="note-footer">
        <div className="note-date">
          {note.created_at ? new Date(note.created_at).toLocaleDateString('zh-CN') : '未知时间'}
        </div>
        {images.length > 0 && (
          <div className="note-image-count">
            📷 {images.length} 张图片
          </div>
        )}
      </div>
    </div>
  );
}

function Home({ onCreateNote, onViewDetail, onEdit }) {
  const { user, signOut } = useAuth();
  const { notes, loading, error, deleteNote, refresh } = useNotes();
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const safeNotes = useMemo(() => {
    if (!Array.isArray(notes)) {
      return [];
    }
    
    const result = [];
    const seenIds = new Set();
    
    for (let i = 0; i < notes.length; i++) {
      const note = notes[i];
      if (note && typeof note === 'object' && note.id && !seenIds.has(note.id)) {
        seenIds.add(note.id);
        result.push(note);
      }
    }
    
    return result;
  }, [notes]);

  const handleDelete = (id) => {
    if (!id || deleteLoading) return;
    setConfirmDelete(id);
  };

  const confirmDeleteNote = async () => {
    if (!confirmDelete || deleteLoading) return;
    
    try {
      setDeleteLoading(true);
      console.log('[Home] 确认删除笔记:', confirmDelete);
      await deleteNote(confirmDelete);
      console.log('[Home] 删除成功');
      if (refresh) {
        refresh();
      }
    } catch (err) {
      console.error('[Home] 删除异常:', err);
      alert('删除失败：' + (err.message || '未知错误'));
    } finally {
      setDeleteLoading(false);
      setConfirmDelete(null);
    }
  };

  const cancelDelete = () => {
    if (!deleteLoading) {
      setConfirmDelete(null);
    }
  };

  return (
    <div className="home-page">
      <header className="header">
        <div className="header-left">
          <div className="logo-badge">
            <img src={LogoIcon} alt="Logo" className="header-logo" />
          </div>
          <h1 className="header-title">避雷笔记本</h1>
        </div>
        <div className="header-right">
          <button className="logout-button" onClick={signOut}>
            退出
          </button>
          <div className="user-avatar">
            <div className="avatar-placeholder">
              {user?.user_metadata?.nickname?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || '?'}
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="notes-loading">
            <div className="loading-spinner"></div>
          </div>
        ) : safeNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📝</div>
            <h2>还没有避雷笔记</h2>
            <p>点击下方按钮开始记录你的第一条避雷经验吧！</p>
          </div>
        ) : (
          <div className="notes-list">
            {safeNotes.map((note, index) => {
              if (!note || !note.id) {
                return null;
              }
              return (
                <NoteCard 
                  key={note.id}
                  note={note}
                  onDelete={handleDelete}
                  onEdit={onEdit}
                  onViewDetail={onViewDetail}
                />
              );
            })}
          </div>
        )}
      </main>

      <footer className="footer">
        <button 
          className="fab-button" 
          onClick={onCreateNote}
          disabled={deleteLoading}
        >
          <span className="fab-icon">+</span>
        </button>
      </footer>

      {confirmDelete && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">⚠️</div>
            <h3 className="modal-title">确认删除</h3>
            <p className="modal-message">
              确定要删除这条笔记吗？此操作无法撤销，笔记内容和图片都将被永久删除。
            </p>
            <div className="modal-actions">
              <button 
                className="modal-cancel" 
                onClick={cancelDelete}
                disabled={deleteLoading}
              >
                取消
              </button>
              <button 
                className="modal-confirm-danger" 
                onClick={confirmDeleteNote}
                disabled={deleteLoading}
              >
                {deleteLoading ? '删除中...' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
