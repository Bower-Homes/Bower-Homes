-- Columnas de traducción al inglés para el contenido que escribe el admin
-- y ve el inversionista en el portal.
--
-- Correr en Supabase (SQL Editor) ANTES de desplegar el cambio: si el código
-- intenta guardar estas columnas y no existen, el guardado falla.
--
-- El portal muestra el inglés si está cargado y cae al español si está vacío,
-- así que ejecutar esto no cambia nada de lo que se ve hasta que el admin
-- empiece a completar las traducciones.

alter table stages       add column if not exists name_en        text;
alter table stages       add column if not exists description_en text;
alter table transactions add column if not exists description_en text;
alter table documents    add column if not exists name_en        text;
