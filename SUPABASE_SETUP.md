# Supabase 设置指南

## 1. 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并注册/登录
2. 点击 "New Project" 创建新项目
3. 填写项目信息：
   - Name: `避雷笔记本`
   - Database Password: 设置一个强密码（请保存好）
   - Region: 选择最近的区域

## 2. 配置环境变量

在项目根目录下创建 `.env` 文件（已创建），填入你的 Supabase 信息：

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

可以在 Supabase 控制台的 **Settings** → **API** 找到这些信息。

## 3. 创建数据库表

在 Supabase 控制台的 **SQL Editor** 中执行以下 SQL：

```sql
-- 创建笔记表（包含图片字段）
CREATE TABLE notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    user_id UUID NOT NULL,
    user_email TEXT NOT NULL,
    user_nickname TEXT,
    images TEXT[], -- 图片URL数组，支持多张图片
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_created_at ON notes(created_at DESC);

-- 启用 Row Level Security (RLS)
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- 创建 RLS 策略
CREATE POLICY "Users can view their own notes"
    ON notes
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own notes"
    ON notes
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
    ON notes
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
    ON notes
    FOR DELETE
    USING (auth.uid() = user_id);

-- 为 authenticated 用户启用实时功能
BEGIN;
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR ALL TABLES;
COMMIT;
```

## 4. 配置认证

在 Supabase 控制台的 **Authentication** → **Providers** 中：

1. 确保 **Email** 提供商已启用
2. 可以设置邮件模板（可选）
3. 可以禁用邮箱验证以简化测试（仅用于开发环境）

## 5. 测试应用

1. 重启开发服务器（如果正在运行）
2. 访问应用并注册新账户
3. 创建测试笔记
4. 验证数据是否正确保存到 Supabase

## 6. 配置 Storage（图片上传）

在 Supabase 控制台的 **Storage** 中配置图片上传功能：

### 6.1 创建存储桶

1. 进入 **Storage** 页面
2. 点击 "New bucket" 创建新的存储桶
3. 存储桶名称：`note-images`（这个名称必须与代码中一致）
4. 选择 "Make public"（公开访问，因为我们需要通过URL访问图片）
5. 点击 "Create bucket"

### 6.2 配置存储策略

在 **SQL Editor** 中执行以下 SQL 来设置 Storage 策略：

```sql
-- 启用对 note-images 存储桶的公开访问
INSERT INTO storage.buckets (id, name, public)
VALUES ('note-images', 'note-images', true)
ON CONFLICT (id) DO NOTHING;

-- 创建策略允许任何人查看 note-images 中的文件
CREATE POLICY "Public access to note-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'note-images');

-- 创建策略允许认证用户上传文件到 note-images
CREATE POLICY "Authenticated users can upload to note-images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (bucket_id = 'note-images' AND auth.role() = 'authenticated');

-- 创建策略允许认证用户删除自己上传的文件
CREATE POLICY "Users can delete their own files in note-images"
    ON storage.objects
    FOR DELETE
    USING (bucket_id = 'note-images' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 6.3 图片上传限制

- 支持格式：JPG, JPEG, PNG, WEBP, GIF
- 单张最大大小：5MB
- 总上传大小限制：20MB
- 最多上传：9张图片

### 6.4 文件存储结构

图片会按照以下结构存储：
```
note-images/
  └── [user-id]/
      └── [timestamp]-[random-string].[extension]
```

这样可以确保每个用户的文件都是独立的，并且不会相互覆盖。

## 故障排除

### 数据库连接失败
- 检查 `.env` 文件中的 URL 和 Key 是否正确
- 确保 Supabase 项目已正确初始化

### 权限错误
- 确保 RLS 策略已正确设置
- 检查用户是否已正确认证

### 实时订阅不工作
- 确保已执行实时相关的 SQL
- 检查浏览器控制台是否有错误
