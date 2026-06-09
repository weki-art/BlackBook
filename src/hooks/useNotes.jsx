import { useState, useEffect, useCallback, useRef } from 'react';
import notesService from '../services/notes';

export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMounted = useRef(true);

  const fetchNotes = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await notesService.getNotes();
      
      if (fetchError) {
        throw fetchError;
      }
      
      console.log('[useNotes] 获取到的笔记数据:', data);
      if (data && data.length > 0) {
        console.log('[useNotes] 第一条笔记的 images 字段:', data[0].images, '类型:', typeof data[0].images);
      }
      
      if (!isMounted.current) return;

      // 严格过滤和验证
      const validNotes = [];
      const seenIds = new Set();
      
      if (Array.isArray(data)) {
        for (let i = 0; i < data.length; i++) {
          const note = data[i];
          if (note && typeof note === 'object' && note.id && !seenIds.has(note.id)) {
            seenIds.add(note.id);
            validNotes.push(note);
          }
        }
      }

      // 按创建时间倒序
      validNotes.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      });
      
      setNotes(validNotes);
    } catch (err) {
      console.error('[useNotes] fetchNotes error:', err);
      if (isMounted.current) {
        setError(err.message || '获取笔记失败');
        setNotes([]);
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchNotes();
    return () => {
      isMounted.current = false;
    };
  }, [fetchNotes]);

  const createNote = useCallback(async (note) => {
    try {
      setError(null);
      const { data, error: createError } = await notesService.createNote(note);
      if (createError) throw createError;
      await fetchNotes();
      return data;
    } catch (err) {
      console.error('[useNotes] createNote error:', err);
      setError(err.message || '创建笔记失败');
      throw err;
    }
  }, [fetchNotes]);

  const deleteNote = useCallback(async (id) => {
    try {
      setError(null);
      console.log('[useNotes] Deleting note:', id);
      const { error: deleteError } = await notesService.deleteNote(id);
      if (deleteError) throw deleteError;
      console.log('[useNotes] Delete successful, refreshing');
      await fetchNotes();
      return { error: null };
    } catch (err) {
      console.error('[useNotes] deleteNote error:', err);
      setError(err.message || '删除笔记失败');
      throw err;
    }
  }, [fetchNotes]);

  return {
    notes,
    loading,
    error,
    createNote,
    deleteNote,
    refresh: fetchNotes,
  };
}
