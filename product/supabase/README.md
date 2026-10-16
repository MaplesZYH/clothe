# Supabase staging

将 staging 项目的 URL、anon key、service role key 和数据库连接串写入项目根目录的 `.env.local`。不要把真实值提交到 Git。

本目录的迁移按顺序执行：

1. `20260923000000_initial.sql` 创建业务表、唯一索引和账号 RLS。
2. `20260923000001_storage.sql` 创建三个私有 Storage bucket。

配置本地 Supabase CLI 后可执行：

```bash
supabase start
supabase db reset
```

匿名用户的数据由 Web 服务端使用签名 cookie 解析 `owner_id`，不直接向浏览器暴露 service role key。已绑定账号通过 Supabase Auth 的邮件魔法链接获得 `auth.uid()`，数据库 RLS 只允许访问自己 owner 的记录。
