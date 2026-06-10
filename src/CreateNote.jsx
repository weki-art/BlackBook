import { useState, useRef, useEffect } from 'react';
import './CreateNote.css';
import { useAuth } from './hooks/useAuth.jsx';
import notesService from './services/notes';

function CreateNote({ noteId, onBack }) {
  const isEditMode = !!noteId;
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const MAX_TAGS = 8;
  const MAX_TAG_LENGTH = 20;

  const categories = ['购物', '食品', '服饰', '出行', '娱乐', '工具', '医药', '教培', '情感', '其他'];
  
  const [selectedImages, setSelectedImages] = useState([]);
  const [uploadedImages, setUploadedImages] = useState([]);
  const [existingImages, setExistingImages] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isEditMode && noteId) {
      loadNoteData();
    }
  }, [isEditMode, noteId]);

  const loadNoteData = async () => {
    try {
      setInitialLoading(true);
      const { data, error: fetchError } = await notesService.getNoteById(noteId);
      
      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setTitle(data.title || '');
        setContent(data.content || '');
        setCategory(data.category || '');

        let noteTags = [];
        if (data.tags) {
          if (Array.isArray(data.tags)) {
            noteTags = data.tags;
          } else if (typeof data.tags === 'string') {
            try {
              const parsed = JSON.parse(data.tags);
              noteTags = Array.isArray(parsed) ? parsed : [];
            } catch {
              noteTags = [];
            }
          }
        }
        noteTags = noteTags.filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0);
        setTags(noteTags.slice(0, MAX_TAGS));
        
        let noteImages = [];
        if (data.images) {
          if (Array.isArray(data.images)) {
            noteImages = data.images;
          } else if (typeof data.images === 'string') {
            // 兼容旧数据（JSON 字符串格式）
            try {
              const parsed = JSON.parse(data.images);
              noteImages = Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              noteImages = [data.images];
            }
          } else {
            noteImages = [data.images];
          }
        }
        // 过滤空值
        noteImages = noteImages.filter(img => img && typeof img === 'string' && img.trim().length > 0);
        
        console.log('[CreateNote] 加载到的图片:', noteImages);
        
        const imagesWithPath = noteImages.map((url, index) => ({
          url,
          path: `existing-${index}`,
          isExisting: true,
          name: `图片 ${index + 1}`,
          size: 0,
        }));
        setExistingImages(imagesWithPath);
        setUploadedImages(imagesWithPath);
      }
    } catch (err) {
      console.error('加载笔记失败:', err);
      setError('加载笔记数据失败：' + (err.message || '未知错误'));
    } finally {
      setInitialLoading(false);
    }
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim();
    if (!trimmedTag) return;

    if (trimmedTag.length > MAX_TAG_LENGTH) {
      setError(`单个标签不能超过 ${MAX_TAG_LENGTH} 个字符`);
      return;
    }

    if (tags.length >= MAX_TAGS) {
      setError(`最多只能添加 ${MAX_TAGS} 个标签`);
      return;
    }

    if (tags.includes(trimmedTag)) {
      setError('该标签已存在');
      return;
    }

    setTags(prev => [...prev, trimmedTag]);
    setTagInput('');
    setError('');
  };

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (indexToRemove) => {
    setTags(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleImageSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const validation = notesService.validateImages(files);
    if (!validation.valid) {
      setError(validation.error);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    const totalCount = selectedImages.length + uploadedImages.length + files.length;
    if (totalCount > 9) {
      setError('最多只能上传9张图片');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    // 客户端压缩图片 (减少上传体积和加载压力)
    setCompressing(true);
    const compressedFiles = [];
    for (let i = 0; i < files.length; i++) {
      try {
        const compressed = await notesService.compressImage(files[i]);
        compressedFiles.push(compressed);
      } catch (err) {
        console.warn('图片压缩失败，使用原图:', files[i].name);
        compressedFiles.push(files[i]);
      }
    }
    setCompressing(false);

    const newImages = compressedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size,
      type: file.type,
    }));

    setSelectedImages(prev => [...prev, ...newImages]);
    setError('');
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveSelectedImage = (index) => {
    setSelectedImages(prev => {
      const newImages = [...prev];
      if (newImages[index]?.preview) {
        URL.revokeObjectURL(newImages[index].preview);
      }
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleRemoveUploadedImage = async (index) => {
    const image = uploadedImages[index];
    if (!image) return;

    if (image.isExisting) {
      setUploadedImages(prev => {
        const newImages = [...prev];
        newImages.splice(index, 1);
        return newImages;
      });
      return;
    }

    try {
      await notesService.deleteImage(image.path);
      setUploadedImages(prev => {
        const newImages = [...prev];
        newImages.splice(index, 1);
        return newImages;
      });
    } catch (err) {
      console.error('删除图片失败:', err);
      setError('删除图片失败');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content || !category) {
      setError('请填写所有字段');
      return;
    }

    try {
      setError('');
      setLoading(true);
      
      // 收集所有图片 URL，不依赖异步的 state 更新
      let allImages = [...uploadedImages]; // 已有图片（包括编辑模式加载的）
      
      if (selectedImages.length > 0) {
        setUploading(true);
        setUploadProgress({ current: 0, total: selectedImages.length });
        
        const filesToUpload = selectedImages.map(img => img.file);
        const uploadResult = await notesService.uploadImages(
          filesToUpload,
          user.id,
          (progress) => {
            setUploadProgress(progress);
          }
        );

        if (uploadResult.data && uploadResult.data.length > 0) {
          const newUploaded = uploadResult.data;
          // 直接添加到本地数组，不依赖 setState
          allImages = [...allImages, ...newUploaded];
          // 同时更新 state 供 UI 显示
          setUploadedImages(allImages);
        }

        if (uploadResult.errors) {
          console.error('部分图片上传失败:', uploadResult.errors);
        }

        selectedImages.forEach(img => {
          if (img.preview) {
            URL.revokeObjectURL(img.preview);
          }
        });
        setSelectedImages([]);
        setUploading(false);
      }

      const finalImages = allImages.map(img => img.url);
      console.log('[CreateNote] 所有上传的图片对象:', allImages);
      console.log('[CreateNote] 最终图片 URL 数组:', finalImages);
      console.log('[CreateNote] 图片数量:', finalImages.length);
      
      if (isEditMode) {
        const { error: updateError } = await notesService.updateNote(noteId, {
          title,
          content,
          category,
          tags: tags.length > 0 ? tags : null,
          images: finalImages.length > 0 ? finalImages : null,
        });

        if (updateError) throw updateError;
      } else {
        const { error: createError } = await notesService.createNote({
          title,
          content,
          category,
          tags: tags.length > 0 ? tags : null,
          user_id: user.id,
          user_email: user.email,
          user_nickname: user.user_metadata?.nickname || '匿名用户',
          images: finalImages.length > 0 ? finalImages : null,
        });

        if (createError) throw createError;
      }
      
      onBack();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="create-note-page">
        <header className="create-header">
          <button className="back-button" onClick={onBack}>
            <span className="back-icon">←</span>
          </button>
          <h1 className="create-title">加载中...</h1>
          <div className="header-spacer"></div>
        </header>
        <div className="notes-loading">
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="create-note-page">
      <header className="create-header">
        <button className="back-button" onClick={onBack}>
          <span className="back-icon">←</span>
        </button>
        <h1 className="create-title">{isEditMode ? '编辑避雷' : '新建避雷'}</h1>
        <div className="header-spacer"></div>
      </header>

      <main className="create-content">
        <form className="note-form" onSubmit={handleSubmit}>
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">标题</label>
            <input
              type="text"
              className="form-input"
              placeholder="输入避雷标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading || uploading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">分类</label>
            <div className="category-selector">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`category-tag ${category === cat ? 'active' : ''}`}
                  onClick={() => setCategory(cat)}
                  disabled={loading || uploading}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">详情</label>
            <textarea
              className="form-textarea"
              placeholder="详细描述你的避坑经历..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              disabled={loading || uploading}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">图片（可选，最多9张，单张最大5MB）</label>
            
            <div className="image-upload-section">
              <label className="image-upload-label">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  multiple
                  onChange={handleImageSelect}
                  className="image-upload-input"
                  disabled={loading || uploading || (selectedImages.length + uploadedImages.length) >= 9}
                />
                <div className="image-upload-button">
                  <span className="upload-icon">📷</span>
                  <span>选择图片</span>
                </div>
              </label>
            </div>

            {uploading && (
              <div className="upload-progress">
                <div className="upload-progress-info">
                  正在上传 {uploadProgress.current} / {uploadProgress.total}
                </div>
                <div className="upload-progress-bar">
                  <div 
                    className="upload-progress-fill"
                    style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {uploadedImages.length > 0 && (
              <div className="image-preview-section">
                <div className="image-preview-label">已添加图片：</div>
                <div className="image-grid">
                  {uploadedImages.map((image, index) => (
                    <div key={`uploaded-${index}`} className="image-preview-item">
                      <img src={image.url} alt={`图片 ${index + 1}`} className="preview-image" />
                      <button
                        type="button"
                        className="remove-image-button"
                        onClick={() => handleRemoveUploadedImage(index)}
                        disabled={loading || uploading}
                        title="删除图片"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedImages.length > 0 && (
              <div className="image-preview-section">
                <div className="image-preview-label">待上传图片：</div>
                <div className="image-grid">
                  {selectedImages.map((image, index) => (
                    <div key={`selected-${index}`} className="image-preview-item">
                      <img src={image.preview} alt={`选中图片 ${index + 1}`} className="preview-image" />
                      <button
                        type="button"
                        className="remove-image-button"
                        onClick={() => handleRemoveSelectedImage(index)}
                        disabled={loading || uploading}
                        title="删除图片"
                      >
                        ✕
                      </button>
                      <div className="image-info">
                        <div className="image-info-name">{image.name}</div>
                        <div className="image-info-size">{formatFileSize(image.size)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="image-count-info">
              已选 {selectedImages.length + uploadedImages.length} / 9 张图片
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">标签 (最多{MAX_TAGS}个)</label>
            
            {tags.length > 0 && (
              <div className="tags-container">
                {tags.map((tag, index) => (
                  <span key={`tag-${index}`} className="tag-chip">
                    {tag}
                    <button
                      type="button"
                      className="tag-remove-btn"
                      onClick={() => handleRemoveTag(index)}
                      disabled={loading || uploading}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            <div className="tag-input-wrapper">
              <input
                type="text"
                className="tag-input"
                placeholder="输入标签后按回车"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                disabled={loading || uploading || tags.length >= MAX_TAGS}
              />
              <button
                type="button"
                className="tag-add-btn"
                onClick={handleAddTag}
                disabled={loading || uploading || !tagInput.trim() || tags.length >= MAX_TAGS}
              >
                +
              </button>
            </div>
            <div className="tag-count-info">
              已添加 {tags.length} / {MAX_TAGS} 个标签
            </div>
          </div>

          <button type="submit" className="submit-button" disabled={loading || uploading}>
            {uploading ? '上传图片中...' : loading ? (isEditMode ? '保存中...' : '发布中...') : (isEditMode ? '保存修改' : '发布避雷')}
          </button>
        </form>
      </main>
    </div>
  );
}

export default CreateNote;
