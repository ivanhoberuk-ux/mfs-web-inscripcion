update public.registros
set autorizacion_url = regexp_replace(autorizacion_url, '^https://[^/]+/storage/v1/object/(public|sign)/documentos/([^?]+).*$','\2')
where autorizacion_url ~ '^https://[^/]+/storage/v1/object/(public|sign)/documentos/';

update public.registros
set ficha_medica_url = regexp_replace(ficha_medica_url, '^https://[^/]+/storage/v1/object/(public|sign)/documentos/([^?]+).*$','\2')
where ficha_medica_url ~ '^https://[^/]+/storage/v1/object/(public|sign)/documentos/';

update public.registros
set firma_url = regexp_replace(firma_url, '^https://[^/]+/storage/v1/object/(public|sign)/documentos/([^?]+).*$','\2')
where firma_url ~ '^https://[^/]+/storage/v1/object/(public|sign)/documentos/';

update public.registros
set cedula_frente_url = regexp_replace(cedula_frente_url, '^https://[^/]+/storage/v1/object/(public|sign)/documentos/([^?]+).*$','\2')
where cedula_frente_url ~ '^https://[^/]+/storage/v1/object/(public|sign)/documentos/';

update public.registros
set cedula_dorso_url = regexp_replace(cedula_dorso_url, '^https://[^/]+/storage/v1/object/(public|sign)/documentos/([^?]+).*$','\2')
where cedula_dorso_url ~ '^https://[^/]+/storage/v1/object/(public|sign)/documentos/';

drop function if exists public.update_registro_documentos(uuid, text, text, text, text, text);