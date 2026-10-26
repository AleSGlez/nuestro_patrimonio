# Notificaciones push — guía de activación

Todo el código ya está listo (frontend + Edge Function). Faltan pasos
manuales en Supabase y Vercel que Claude no puede hacer desde aquí.

## 1. Correr la migración de base de datos

En Supabase → SQL Editor, correr `migration_v3_23_push_subscriptions.sql`
(crea `push_subscriptions` y `push_enviados`, con RLS).

## 2. Configurar los secretos de la Edge Function

Dashboard de Supabase → **Edge Functions → Secrets** (o `supabase secrets set`
si usas la CLI), agregar:

```
VAPID_PUBLIC_KEY=<la misma pública que pusiste en VITE_VAPID_PUBLIC_KEY>
VAPID_PRIVATE_KEY=<tu llave privada — NUNCA la pongas en este archivo ni en git>
VAPID_SUBJECT=mailto:tu-correo@ejemplo.com
```

⚠️ **La llave privada es secreta** — solo vive en Supabase Secrets, nunca en
el frontend, ni en este archivo, ni en git (este .md sí se sube al repo). Ya
quedó guardada ahí si seguiste el paso 2 de este documento. Si la perdiste o
necesitas un par nuevo, genera uno con cualquier generador VAPID estándar
(o `npx web-push generate-vapid-keys`) y actualiza también
`VITE_VAPID_PUBLIC_KEY` en `.env.local` y en Vercel con la pública nueva.

`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen automáticamente en
cualquier Edge Function de Supabase — no hay que configurarlos.

## 3. Agregar la llave pública a Vercel

Settings → Environment Variables en el proyecto de Vercel:

```
VITE_VAPID_PUBLIC_KEY=BPbyK0jvxCu7lgAVzZX1OxhAGyRv6abtAL9JgcgLRwWgiHV5cJTjszBAq9Mn9ILuqoIqZVsiHs4MCNYgRHxGKi4
```

(Ya está en `.env.local` para desarrollo — Vercel no lee ese archivo, hay
que agregarla ahí también para que el build de producción la incluya.)

## 4. Deployar la Edge Function

```bash
supabase functions deploy enviar-notificaciones
```

Y programar su cron — igual que `registrar-recurrentes` (que también está
pendiente de deploy, ver CLAUDE.md §2): en el Dashboard de Supabase, Edge
Functions → `enviar-notificaciones` → Cron, todos los días a las **15:00
UTC** (9am hora México). Usar el mismo horario que `registrar-recurrentes`
no es casualidad: la función calcula "hoy" en UTC, y a esa hora UTC y
México siguen en el mismo día calendario.

## 5. Probar en el celular

1. Abre la app en el navegador del celular.
2. **iPhone:** primero hay que agregarla a la pantalla de inicio (Compartir →
   "Agregar a inicio") — Safari normal (pestaña del navegador, sin
   instalar) **nunca** ofrece permiso de notificaciones, es una restricción
   de Apple, no un bug. Necesitas iOS 16.4 o más reciente.
   **Android:** funciona directo en Chrome, instalada o no.
3. Abre la app (ya instalada en iPhone) → ícono de campana 🔔 en Inicio →
   activa "Notificaciones push".
4. Para probar sin esperar al cron diario, puedes invocar la función a mano
   desde el Dashboard (botón "Invoke") o con:
   ```bash
   curl -X POST https://kdznaswrbchosmbttskw.supabase.co/functions/v1/enviar-notificaciones \
     -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
   ```

## Qué manda avisos (hoy)

- Tarjeta: corte en ≤2 días, límite de pago en ≤5 días.
- Suscripción: se cobra en ≤2 días.
- Presupuesto personal excedido.

No manda más de un aviso por el mismo motivo el mismo día al mismo
dispositivo (tabla `push_enviados`). El panel de la campana 🔔 en Inicio
(dentro de la app) usa el mismo criterio y no depende de nada de esto —
funciona ya, sin ningún paso manual.
