-- ================================================================
--  MIGRACIÓN — Backfill de saldo_restante para cargos existentes
--  (creados ANTES de migration_v3_18_cobros_parciales.sql)
--
--  Sin esto, los cargos viejos se quedan con saldo_restante = NULL y
--  no aparecen en el selector "¿A qué aplica este pago?" de Cobros
--  aunque el cliente siga debiéndolos.
--
--  Cómo calcula el restante de cada cargo viejo: por cliente, ordena
--  sus cargos del más antiguo al más nuevo y les va "aplicando" el
--  total histórico de pagos de ese cliente en ese mismo orden (FIFO:
--  se asume que lo pagado primero cubrió primero los adeudos más
--  viejos). Si un cliente nunca pagó nada, sus cargos quedan con
--  saldo_restante = monto completo (o sea, todos pendientes) — que es
--  justo el caso de "debe por 2 cosas y ninguna se ha pagado".
--
--  Idempotente: solo toca filas con saldo_restante IS NULL, así que
--  no pasa nada si se corre más de una vez.
--
--  REQUISITO: correr después de migration_v3_18_cobros_parciales.sql.
-- ================================================================

WITH cargos_ordenados AS (
  SELECT
    cm.id,
    cm.cliente_id,
    cm.monto,
    COALESCE(SUM(cm.monto) OVER (
      PARTITION BY cm.cliente_id
      ORDER BY cm.fecha, cm.created_at
      ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING
    ), 0) AS cum_antes
  FROM clientes_movimientos cm
  WHERE cm.tipo = 'cargo' AND cm.saldo_restante IS NULL
),
pagos_totales AS (
  -- Solo pagos que todavía no están ligados a un cargo específico —
  -- los que ya tienen cargo_id (pagos hechos con la función nueva)
  -- ya se descontaron de su cargo directamente, no se vuelven a contar aquí.
  SELECT cliente_id, COALESCE(SUM(monto), 0) AS total_pagado
  FROM clientes_movimientos
  WHERE tipo = 'pago' AND cargo_id IS NULL
  GROUP BY cliente_id
)
UPDATE clientes_movimientos cm
SET saldo_restante = co.monto - LEAST(
      GREATEST(COALESCE(pt.total_pagado, 0) - co.cum_antes, 0),
      co.monto
    )
FROM cargos_ordenados co
LEFT JOIN pagos_totales pt ON pt.cliente_id = co.cliente_id
WHERE cm.id = co.id;

NOTIFY pgrst, 'reload schema';

-- ================================================================
--  Verificación — el restante de cada cliente debe sumar igual (o muy
--  cerca) a su saldo_pendiente actual en la tabla clientes.
-- ================================================================
SELECT
  cl.nombre,
  cl.saldo_pendiente AS saldo_agregado,
  COALESCE(SUM(cm.saldo_restante) FILTER (WHERE cm.tipo = 'cargo'), 0) AS suma_restantes_por_cargo
FROM clientes cl
LEFT JOIN clientes_movimientos cm ON cm.cliente_id = cl.id
WHERE cl.activo = true
GROUP BY cl.id, cl.nombre, cl.saldo_pendiente
ORDER BY cl.nombre;
