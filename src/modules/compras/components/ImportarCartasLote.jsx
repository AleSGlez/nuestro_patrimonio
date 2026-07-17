// src/modules/compras/components/ImportarCartasLote.jsx
import { useState, useRef } from 'react'
import { Upload, Download, Trash2, Check } from 'lucide-react'
import * as XLSX from 'xlsx'
import { cn, fmt } from '@lib/utils'

// Columnas que reconoce el importador
const COL_MAP = {
  nombre_jp:             ['nombre jp', 'nombre_jp', 'jp', 'nombre japonés', 'japonés'],
  nombre_en:             ['nombre en', 'nombre_en', 'en', 'english', 'nombre inglés'],
  serie:                 ['serie', 'set', 'expansion', 'expansión'],
  numero_carta:          ['número', 'numero', '#', 'number', 'card number', 'numero carta'],
  idioma:                ['idioma', 'language', 'lang'],
  condicion:             ['condicion', 'condición', 'condition', 'estado'],
  cantidad_compra:       ['cantidad', 'qty', 'cantidad compra', 'cant'],
  precio_unitario_compra:['precio', 'price', 'precio compra', 'costo', 'cost', 'precio unitario'],
  precio_venta:          ['precio venta', 'venta', 'sell price'],
}

function detectarColumna(headers, posibles) {
  const norm = headers.map((h) => String(h).toLowerCase().trim())
  for (const p of posibles) {
    const idx = norm.findIndex((h) => h.includes(p))
    if (idx >= 0) return headers[idx]
  }
  return null
}

export default function ImportarCartasLote({ onProductos, productosActuales = [] }) {
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const ref = useRef()

  const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Nombre JP', 'Nombre EN', 'Serie', 'Número', 'Idioma', 'Condición', 'Cantidad', 'Precio Compra', 'Precio Venta'],
      ['ピカチュウ', 'Pikachu', 'Base Set', '58/102', 'JP', 'mint', 1, 500, 150],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Cartas')
    XLSX.writeFile(wb, 'plantilla-lote.xlsx')
  }

  const procesarArchivo = (file) => {
    setError('')
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target.result, { type: 'array' })
        const ws   = wb.Sheets[wb.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 })
        if (rows.length < 2) { setError('El archivo está vacío'); return }

        const headers = rows[0]
        const mapa = {}
        for (const [campo, posibles] of Object.entries(COL_MAP)) {
          mapa[campo] = detectarColumna(headers, posibles)
        }

        const productos = rows.slice(1)
          .filter((row) => row.some((c) => c !== '' && c !== undefined))
          .map((row) => {
            const get = (col) => col ? row[headers.indexOf(col)] : undefined
            return {
              nombre_jp:              String(get(mapa.nombre_jp) || '').trim(),
              nombre_en:              String(get(mapa.nombre_en) || '').trim(),
              serie:                  String(get(mapa.serie) || '').trim(),
              numero_carta:           String(get(mapa.numero_carta) || '').trim(),
              idioma:                 String(get(mapa.idioma) || 'JP').trim(),
              condicion:              String(get(mapa.condicion) || 'mint').trim().toLowerCase(),
              cantidad_compra:        Number(get(mapa.cantidad_compra) || 1),
              precio_unitario_compra: Number(get(mapa.precio_unitario_compra) || 0),
              precio_venta:           get(mapa.precio_venta) ? Number(get(mapa.precio_venta)) : null,
            }
          })
          .filter((p) => p.nombre_jp || p.nombre_en)

        onProductos(productos)
      } catch (err) {
        setError('Error al leer el archivo: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) procesarArchivo(file)
  }

  return (
    <div>
      {/* Zona de drop */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => ref.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all',
          dragging ? 'border-[var(--accent)] bg-[var(--accent-muted)]' : 'border-white/10 hover:border-white/20'
        )}
      >
        <Upload size={20} className="mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-300 font-medium">Arrastra tu Excel aquí</p>
        <p className="text-xs text-gray-400 mt-1">o toca para seleccionar</p>
        <input ref={ref} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => e.target.files[0] && procesarArchivo(e.target.files[0])} />
      </div>

      {error && <p className="text-xs text-bad mt-2">{error}</p>}

      <button onClick={descargarPlantilla}
        className="flex items-center gap-2 text-xs text-[var(--accent)] mt-2">
        <Download size={12} /> Descargar plantilla Excel
      </button>

      {/* Preview de cartas importadas */}
      {productosActuales.length > 0 && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-white">{productosActuales.length} cartas importadas</p>
            <button onClick={() => onProductos([])} className="text-xs text-bad flex items-center gap-1">
              <Trash2 size={11} /> Limpiar
            </button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {productosActuales.slice(0, 20).map((p, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-surface-700 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{p.nombre_jp || p.nombre_en}</p>
                  <p className="text-[10px] text-gray-400">{p.serie} {p.numero_carta && `· #${p.numero_carta}`} · x{p.cantidad_compra}</p>
                </div>
                <p className="text-[10px] text-gray-400 flex-shrink-0">{fmt(p.precio_unitario_compra)}</p>
              </div>
            ))}
            {productosActuales.length > 20 && (
              <p className="text-[10px] text-gray-400 text-center">+{productosActuales.length - 20} más...</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
