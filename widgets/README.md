# Widgets de iPhone — Nuestro Patrimonio

Widgets para la pantalla de Inicio y la de bloqueo hechos con **Scriptable** (app gratuita).
Leen los datos directo de Supabase con tu sesión, así que respetan RLS igual que la app.

Todo vive en **un solo script**: [`scriptable/NuestroPatrimonio.js`](scriptable/NuestroPatrimonio.js).
Eliges qué widget mostrar con el campo **Parameter**.

## Widgets disponibles

| Parameter | Qué muestra | Para qué sirve |
|-----------|-------------|----------------|
| `patrimonio` *(default)* | Patrimonio de la pareja, el tuyo, el de tu pareja, el capital del negocio, deuda de tarjetas e ingresos/gastos/flujo del mes. En grande, también tus cuentas. | Ver de un vistazo cómo van |
| `tarjetas` | Cuánto pagar para no generar intereses, en cuántos días es el límite (en rojo si faltan 3 días o menos), deuda y % de uso | Que no se te pase un pago |
| `agenda` | Próximos 14 días: quincenas, límites de pago, cortes, suscripciones, recurrentes y MSI. Lo vencido sale en rojo. Arriba: cuánto sale en 7 días | Saber qué cobros vienen |
| `presupuestos` | Cuánto te queda en cada presupuesto personal (con roll-over), con barra de uso | Antes de comprar algo |
| `negocio` | Ventas y ganancia del mes, margen, capital, cartas en stock, costo del inventario, por cobrar a clientes, lotes en camino | Estado del negocio Pokémon |
| `metas` | Avance de cada meta de ahorro, cuánto falta y fecha objetivo | Motivación 💪 |
| `personas` | Total que te deben y que debes, y quién | Acordarte de cobrar |

Tamaños: chico, mediano y grande en Inicio; rectangular, circular y en línea en la pantalla de bloqueo.

## Instalación (≈10 min)

1. Instala **Scriptable** desde la App Store.
2. En Scriptable toca **+**, pega todo el contenido de `NuestroPatrimonio.js` y ponle de nombre *Nuestro Patrimonio*.
3. *(Opcional)* Arriba del script llena:
   - `ANON_KEY` → el valor de `VITE_SUPABASE_ANON_KEY` (en Vercel → Settings → Environment Variables). Si lo dejas vacío te lo pide al iniciar sesión.
   - `APP_URL` → la URL de la app en Vercel, para que al tocar el widget se abra la app.
4. Toca **▶︎** dentro de Scriptable e inicia sesión con tu correo y contraseña de la app.
   La sesión se guarda en el **Llavero del iPhone**, no en el código.
5. Ahí mismo puedes ver la vista previa de cada widget.
6. En la pantalla de Inicio: mantén presionado → **+** → **Scriptable** → elige tamaño → **Agregar widget**.
7. Mantén presionado el widget → **Editar widget**:
   - **Script**: *Nuestro Patrimonio*
   - **When Interacting**: *Open URL* (si llenaste `APP_URL`)
   - **Parameter**: `tarjetas`, `agenda`, etc.

Repite el paso 6–7 para cada widget que quieras (por ejemplo: `patrimonio` mediano + `agenda` grande + `tarjetas` en la pantalla de bloqueo).

## Notas

- iOS decide cuándo refrescar (normalmente cada 15–30 min). Si no hay internet muestra los últimos datos guardados con la etiqueta *sin conexión*.
- Cada persona de la pareja inicia sesión en su propio iPhone; "tuyo" y "de tu pareja" se calculan según quién inició sesión (p1 = quien creó la pareja).
- Para cerrar sesión: abre el script en Scriptable → **Cerrar sesión**.
- Las reglas de cálculo son las mismas que la app (`utils.js`, `usePresupuestos.js`, `useTarjetas.js`): gastos `ambos` al 50 % en presupuestos individuales, apartados personales sumados al patrimonio, capital del negocio = cuentas negocio + apartados `es_negocio`, quincenas recorridas al día hábil anterior. Si cambian en la app, hay que actualizarlas aquí también.
