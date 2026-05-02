-- ================================================================
-- Dtalles Tejidos — Políticas de Row Level Security (RLS)
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ================================================================

-- ── 1. TABLA: productos ─────────────────────────────────────────
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede leer (catálogo público)
DROP POLICY IF EXISTS "productos_select_public" ON productos;
CREATE POLICY "productos_select_public"
  ON productos FOR SELECT
  USING (true);

-- Solo la clave de servicio (service_role) puede insertar/editar/borrar
DROP POLICY IF EXISTS "productos_insert_service" ON productos;
CREATE POLICY "productos_insert_service"
  ON productos FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "productos_update_service" ON productos;
CREATE POLICY "productos_update_service"
  ON productos FOR UPDATE
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "productos_delete_service" ON productos;
CREATE POLICY "productos_delete_service"
  ON productos FOR DELETE
  USING (auth.role() = 'service_role');


-- ── 2. TABLA: configuracion_tienda ──────────────────────────────
ALTER TABLE configuracion_tienda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "config_select_public" ON configuracion_tienda;
CREATE POLICY "config_select_public"
  ON configuracion_tienda FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "config_write_service" ON configuracion_tienda;
CREATE POLICY "config_write_service"
  ON configuracion_tienda FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 3. TABLA: portadas_secciones ────────────────────────────────
ALTER TABLE portadas_secciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portadas_select_public" ON portadas_secciones;
CREATE POLICY "portadas_select_public"
  ON portadas_secciones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "portadas_write_service" ON portadas_secciones;
CREATE POLICY "portadas_write_service"
  ON portadas_secciones FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 4. TABLA: visitas ───────────────────────────────────────────
ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

-- Lectura pública (mostrar contadores)
DROP POLICY IF EXISTS "visitas_select_public" ON visitas;
CREATE POLICY "visitas_select_public"
  ON visitas FOR SELECT
  USING (true);

-- Upsert permitido con anon (el contador se incrementa desde el cliente)
DROP POLICY IF EXISTS "visitas_upsert_anon" ON visitas;
CREATE POLICY "visitas_upsert_anon"
  ON visitas FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "visitas_update_anon" ON visitas;
CREATE POLICY "visitas_update_anon"
  ON visitas FOR UPDATE
  USING (true);


-- ── 5. STORAGE: product-images ──────────────────────────────────
-- Ejecutar también en SQL Editor:

-- Lectura pública del bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Solo service_role puede subir/borrar imágenes
DROP POLICY IF EXISTS "images_insert_service" ON storage.objects;
CREATE POLICY "images_insert_service"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "images_update_service" ON storage.objects;
CREATE POLICY "images_update_service"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'product-images'
    AND auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "images_select_public" ON storage.objects;
CREATE POLICY "images_select_public"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

-- ================================================================
-- NOTA IMPORTANTE:
-- La app actualmente usa la clave 'anon' para leer Y escribir.
-- Para que las políticas de escritura con service_role funcionen
-- correctamente en el admin, debes mover las operaciones de
-- escritura (INSERT/UPDATE/DELETE) a una Edge Function de Supabase
-- que use la clave service_role en el servidor, no en el cliente.
-- Mientras tanto, puedes usar políticas permisivas solo para anon:
--
--   CREATE POLICY "anon_write_productos" ON productos FOR ALL
--   USING (auth.role() = 'anon') WITH CHECK (auth.role() = 'anon');
--
-- Esto al menos bloquea a cualquiera que no tenga la anon key.
-- ================================================================
