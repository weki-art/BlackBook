import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import './Home.css';
import LogoIcon from './assets/logo.svg';
import { useAuth } from './hooks/useAuth.jsx';
import { useNotes } from './hooks/useNotes.jsx';
import notesService from './services/notes';

// 搜索输入组件
function SearchInput({ value, onChange, onClear, placeholder }) {
  const [isFocused, setIsFocused] = useState(false);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onClear();
    }
  };

  return (
    <div className={`search-input-wrapper ${isFocused ? 'is-focused' : ''}`}>
      <span className="search-icon">🔍</span>
      <input
        type="text"
        className="search-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />
      {value && (
        <button className="search-clear" onClick={onClear} title="清除搜索">
          ✕
        </button>
      )}
    </div>
  );
}

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

  let tags = [];
  if (note?.tags) {
    if (Array.isArray(note.tags)) {
      tags = note.tags;
    } else if (typeof note.tags === 'string') {
      try {
        const parsed = JSON.parse(note.tags);
        tags = Array.isArray(parsed) ? parsed : [];
      } catch {
        tags = [];
      }
    }
  }
  tags = tags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0).slice(0, 4);

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

      {tags.length > 0 && (
        <div className="note-tags">
          {tags.map((tag, index) => (
            <span key={`tag-${index}`} className="note-tag">
              #{tag}
            </span>
          ))}
        </div>
      )}

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
  
  // 搜索状态
  const [searchKeyword, setSearchKeyword] = useState('');

  const handleSignOut = () => {
    // 使用独立的处理函数，避免异步错误冒泡
    signOut().catch((err) => {
      console.log('[Home] 退出处理:', err?.message);
    });
  };

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

  // 搜索过滤逻辑（模糊匹配标题、内容、标签、分类）
  const filteredNotes = useMemo(() => {
    if (!searchKeyword.trim()) {
      return safeNotes;
    }

    const keyword = searchKeyword.toLowerCase().trim();
    return safeNotes.filter(note => {
      // 匹配标题
      const matchTitle = note.title && note.title.toLowerCase().includes(keyword);
      // 匹配内容
      const matchContent = note.content && note.content.toLowerCase().includes(keyword);
      // 匹配标签
      let matchTags = false;
      if (note.tags) {
        if (Array.isArray(note.tags)) {
          matchTags = note.tags.some(tag => 
            typeof tag === 'string' && tag.toLowerCase().includes(keyword)
          );
        } else if (typeof note.tags === 'string') {
          try {
            const parsedTags = JSON.parse(note.tags);
            if (Array.isArray(parsedTags)) {
              matchTags = parsedTags.some(tag => 
                typeof tag === 'string' && tag.toLowerCase().includes(keyword)
              );
            } else {
              matchTags = note.tags.toLowerCase().includes(keyword);
            }
          } catch {
            matchTags = note.tags.toLowerCase().includes(keyword);
          }
        }
      }
      // 匹配分类名称
      const matchCategory = note.category && note.category.toLowerCase().includes(keyword);
      
      return matchTitle || matchContent || matchTags || matchCategory;
    });
  }, [safeNotes, searchKeyword]);

  // 清除搜索
  const clearSearch = useCallback(() => {
    setSearchKeyword('');
  }, []);

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
          <button className="logout-button" onClick={handleSignOut}>
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
        {/* 搜索区域 */}
        <div className="search-section">
          <SearchInput
            value={searchKeyword}
            onChange={setSearchKeyword}
            onClear={clearSearch}
            placeholder="搜索笔记标题、内容、标签或分类..."
          />
        </div>

        {/* 搜索结果统计 */}
        {searchKeyword && (
          <div className="search-result-info">
            找到 <span className="result-count">{filteredNotes.length}</span> 条笔记
            <button className="clear-filter-btn" onClick={clearSearch}>
              清除搜索
            </button>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {loading ? (
          <div className="notes-loading">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredNotes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{searchKeyword ? '🔍' : '📝'}</div>
            <h2>
              {searchKeyword ? '没有找到匹配的笔记' : '还没有避雷笔记'}
            </h2>
            <p>
              {searchKeyword 
                ? '尝试更换关键词' 
                : '点击下方按钮开始记录你的第一条避雷经验吧！'
              }
            </p>
          </div>
        ) : (
          <div className="notes-list">
            {filteredNotes.map((note, index) => {
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
