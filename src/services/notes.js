import { supabase } from '../lib/supabase';

// 图片配置常量
const IMAGE_CONFIG = {
  STORAGE_BUCKET: 'note-images',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB per image
  MAX_TOTAL_SIZE: 20 * 1024 * 1024, // 20MB total
  MAX_IMAGES: 9,
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp', '.gif'],
  // 缩略图优化配置 (服务端压缩)
  THUMBNAIL: {
    WIDTH: 600,
    HEIGHT: 450,
    QUALITY: 75,
    FORMAT: 'webp',
  },
  DETAIL: {
    WIDTH: 1600,
    HEIGHT: 1200,
    QUALITY: 85,
    FORMAT: 'webp',
  },
};

// 优化图片URL - 使用Supabase图片转换生成缩略图
function optimizeImageUrl(originalUrl, options = {}) {
  if (!originalUrl) return '';
  const {
    width = IMAGE_CONFIG.THUMBNAIL.WIDTH,
    height = IMAGE_CONFIG.THUMBNAIL.HEIGHT,
    quality = IMAGE_CONFIG.THUMBNAIL.QUALITY,
    format = IMAGE_CONFIG.THUMBNAIL.FORMAT,
    resizeMode = 'cover',
  } = options;
  try {
    const url = new URL(originalUrl);
    url.searchParams.set('width', width);
    url.searchParams.set('height', height);
    url.searchParams.set('quality', quality);
    url.searchParams.set('format', format);
    url.searchParams.set('resize', resizeMode);
    url.searchParams.set('cache', '86400');
    return url.toString();
  } catch (e) {
    return originalUrl;
  }
}

// 首页卡片缩略图URL (压缩后约50-100KB，原图约3-10MB)
function getThumbnailUrl(url) {
  return optimizeImageUrl(url, {
    width: IMAGE_CONFIG.THUMBNAIL.WIDTH,
    height: IMAGE_CONFIG.THUMBNAIL.HEIGHT,
    quality: IMAGE_CONFIG.THUMBNAIL.QUALITY,
    format: IMAGE_CONFIG.THUMBNAIL.FORMAT,
    resizeMode: 'cover',
  });
}

// 详情页大图URL (压缩后约200-400KB)
function getDetailImageUrl(url) {
  return optimizeImageUrl(url, {
    width: IMAGE_CONFIG.DETAIL.WIDTH,
    height: IMAGE_CONFIG.DETAIL.HEIGHT,
    quality: IMAGE_CONFIG.DETAIL.QUALITY,
    format: IMAGE_CONFIG.DETAIL.FORMAT,
    resizeMode: 'contain',
  });
}

// 客户端图片压缩 (上传前压缩，减少存储和加载压力)
async function compressImage(file) {
  if (!file || file.size < 200 * 1024) return file; // 小于200KB不压缩
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let scale = Math.min(1920 / img.width, 1440 / img.height, 1);
        if (scale >= 1) { resolve(file); return; }
        const newWidth = Math.floor(img.width * scale);
        const newHeight = Math.floor(img.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = newWidth;
        canvas.height = newHeight;
        canvas.getContext('2d').drawImage(img, 0, 0, newWidth, newHeight);
        canvas.toBlob((blob) => {
          if (blob) {
            const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' });
            resolve(newFile);
          } else { resolve(file); }
        }, 'image/webp', 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
}

export const notesService = {
  async getNotes() {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('获取笔记错误:', error);
      }
      return { data, error };
    } catch (err) {
      console.error('获取笔记异常:', err);
      return { data: null, error: err };
    }
  },

  async getNoteById(id) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) {
        console.error('获取笔记详情错误:', error);
      }
      return { data, error };
    } catch (err) {
      console.error('获取笔记详情异常:', err);
      return { data: null, error: err };
    }
  },

  async createNote(note) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([note])
        .select()
        .single();
      
      if (error) {
        console.error('创建笔记错误:', error);
      }
      return { data, error };
    } catch (err) {
      console.error('创建笔记异常:', err);
      return { data: null, error: err };
    }
  },

  async updateNote(id, updates) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        console.error('更新笔记错误:', error);
      }
      return { data, error };
    } catch (err) {
      console.error('更新笔记异常:', err);
      return { data: null, error: err };
    }
  },

  async deleteNote(id) {
    try {
      console.log('尝试删除笔记:', id);
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);
      
      if (error) {
        console.error('删除笔记错误:', error);
      } else {
        console.log('删除笔记成功:', id);
      }
      return { error };
    } catch (err) {
      console.error('删除笔记异常:', err);
      return { error: err };
    }
  },

  subscribeToNotes(callback) {
    return supabase
      .channel('notes_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, callback)
      .subscribe();
  },

  // 图片验证函数
  validateImage(file) {
    if (!file) {
      return { valid: false, error: '未选择文件' };
    }

    // 检查文件类型
    if (!IMAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      const extensions = IMAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ');
      return { valid: false, error: `不支持的文件类型。请上传: ${extensions}` };
    }

    // 检查文件大小
    if (file.size > IMAGE_CONFIG.MAX_FILE_SIZE) {
      const maxSizeMB = (IMAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `单张图片大小不能超过 ${maxSizeMB}MB` };
    }

    return { valid: true, error: null };
  },

  // 验证多张图片
  validateImages(files) {
    if (!files || files.length === 0) {
      return { valid: true, error: null }; // 空文件是允许的（可选）
    }

    if (files.length > IMAGE_CONFIG.MAX_IMAGES) {
      return { valid: false, error: `最多只能上传 ${IMAGE_CONFIG.MAX_IMAGES} 张图片` };
    }

    let totalSize = 0;
    for (const file of files) {
      const validation = this.validateImage(file);
      if (!validation.valid) {
        return validation;
      }
      totalSize += file.size;
    }

    if (totalSize > IMAGE_CONFIG.MAX_TOTAL_SIZE) {
      const maxTotalMB = (IMAGE_CONFIG.MAX_TOTAL_SIZE / (1024 * 1024)).toFixed(1);
      return { valid: false, error: `所有图片总大小不能超过 ${maxTotalMB}MB` };
    }

    return { valid: true, error: null };
  },

  // 生成唯一的文件名
  generateFileName(file, userId) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 10);
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    return `${userId}/${timestamp}-${random}${ext}`;
  },

  // 上传单张图片到Supabase Storage
  async uploadImage(file, userId, onProgress) {
    try {
      const fileName = this.generateFileName(file, userId);
      console.log('[notesService] 上传图片:', fileName, '大小:', file.size, '类型:', file.type);
      
      // 检查bucket是否存在，使用upload方法
      const { data, error } = await supabase.storage
        .from(IMAGE_CONFIG.STORAGE_BUCKET)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        });

      if (error) {
        console.error('[notesService] 上传图片错误:', error);
        return { data: null, error };
      }

      console.log('[notesService] 上传成功，返回 data:', data);

      // 获取公开URL
      const { data: urlData } = supabase.storage
        .from(IMAGE_CONFIG.STORAGE_BUCKET)
        .getPublicUrl(fileName);

      console.log('[notesService] 获取到的 publicUrl:', urlData?.publicUrl);

      return { 
        data: {
          url: urlData.publicUrl,
          path: fileName,
          name: file.name,
          size: file.size,
          type: file.type,
        }, 
        error: null 
      };
    } catch (err) {
      console.error('[notesService] 上传图片异常:', err);
      return { data: null, error: err };
    }
  },

  // 批量上传图片
  async uploadImages(files, userId, onProgress) {
    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: files.length,
          fileName: file.name,
        });
      }

      const result = await this.uploadImage(file, userId);
      
      if (result.error) {
        errors.push({ fileName: file.name, error: result.error });
      } else {
        results.push(result.data);
      }
    }

    return {
      data: results,
      errors: errors.length > 0 ? errors : null,
    };
  },

  // 删除Storage中的图片
  async deleteImage(filePath) {
    try {
      const { error } = await supabase.storage
        .from(IMAGE_CONFIG.STORAGE_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('删除图片错误:', error);
      }
      return { error };
    } catch (err) {
      console.error('删除图片异常:', err);
      return { error: err };
    }
  },

  // 批量删除图片
  async deleteImages(filePaths) {
    if (!filePaths || filePaths.length === 0) {
      return { error: null };
    }

    try {
      const { error } = await supabase.storage
        .from(IMAGE_CONFIG.STORAGE_BUCKET)
        .remove(filePaths);

      if (error) {
        console.error('批量删除图片错误:', error);
      }
      return { error };
    } catch (err) {
      console.error('批量删除图片异常:', err);
      return { error: err };
    }
  },

  // ===== 图片URL优化 - 服务端压缩 =====
  optimizeImageUrl,
  getThumbnailUrl,
  getDetailImageUrl,
  // 客户端压缩
  compressImage,
  // 获取配置
  getConfig: () => IMAGE_CONFIG,
};

export default notesService;
