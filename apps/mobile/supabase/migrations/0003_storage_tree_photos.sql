-- Storage para fotos de árboles (foto en vivo, 13.1).
-- Bucket público de lectura (las fotos se muestran en la app sin auth);
-- escritura solo autenticado y solo bajo la carpeta del propio usuario: {uid}/archivo.jpg

insert into storage.buckets (id, name, public)
  values ('tree-photos', 'tree-photos', true)
  on conflict (id) do nothing;

-- Subida: authenticated, restringido a su propia carpeta (anti-suplantación).
create policy "tree_photos_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tree-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Lectura pública (bucket público).
create policy "tree_photos_read_public"
  on storage.objects for select to public
  using (bucket_id = 'tree-photos');
