insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('outfit-sources', 'outfit-sources', false, 10485760, array['image/jpeg', 'image/png']),
  ('outfit-assets', 'outfit-assets', false, 10485760, array['image/png']),
  ('outfit-looks', 'outfit-looks', false, 20971520, array['image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
