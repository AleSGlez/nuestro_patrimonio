// src/modules/inventario/components/ImportarExcel.jsx
import { useState, useRef } from 'react'
import { Upload, Check, AlertCircle, Download } from 'lucide-react'
import Modal from '@ui/Modal'
import Spinner from '@ui/Spinner'
import { useToast } from '@ui/Toast'
import { useCrearProducto } from '../hooks/useInventario'
import { fmt, cn } from '@lib/utils'
import * as XLSX from 'xlsx'

// Columnas esperadas en el Excel (case-insensitive, acepta variantes)
const COL_MAP = {
  nombre_jp:     ['nombre_jp','nombre jp','jp','japones','japonés','name_jp'],
  nombre_en:     ['nombre_en','nombre en','en','english','name_en','name'],
  serie:         ['serie','set','expansion','expansión'],
  numero_carta:  ['numero','número','number','num','carta','card_num'],
  idioma:        ['idioma','lang','language'],
  condicion:     ['condicion','condición','condition','estado'],
  cantidad_compra:['cantidad','cantidad_compra','qty','quantity','piezas'],
  precio_unitario_compra:['precio_compra','precio compra','costo','cost','precio unitario','unit_price'],
  precio_venta:  ['precio_venta','precio venta','venta','sale_price','sell'],
  nota:          ['nota','note','notas'],
}

function detectCol(headers, aliases) {
  const lower = headers.map((h) => String(h).toLowerCase().trim())
  for (const alias of aliases) {
    const idx = lower.indexOf(alias.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

function parseRows(worksheet) {
  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
  if (json.length < 2) return []

  const headers = json[0]
  const colIdx = {}
  Object.entries(COL_MAP).forEach(([field, aliases]) => {
    colIdx[field] = detectCol(headers, aliases)
  })

  return json.slice(1)
    .filter((row) => row.some((cell) => cell !== ''))
    .map((row) => {
      const get = (field) => colIdx[field] >= 0 ? row[colIdx[field]] : ''
      return {
        nombre_jp:    String(get('nombre_jp')).trim() || null,
        nombre_en:    String(get('nombre_en')).trim() || null,
        serie:        String(get('serie')).trim() || null,
        numero_carta: String(get('numero_carta')).trim() || null,
        idioma:       ['JP','EN','ambos'].includes(String(get('idioma')).toUpperCase())
          ? String(get('idioma')).toUpperCase() : 'JP',
        condicion:    ['mint','near_mint','played','damaged'].includes(String(get('condicion')).toLowerCase())
          ? String(get('condicion')).toLowerCase() : 'mint',
        cantidad_compra: Number(get('cantidad_compra')) || 1,
        precio_unitario_compra: Number(get('precio_unitario_compra')) || 0,
        precio_venta: Number(get('precio_venta')) || null,
        nota: String(get('nota')).trim() || null,
      }
    })
    .filter((r) => r.nombre_jp || r.nombre_en)
}

export default function ImportarExcel({ open, onClose, loteId }) {
  const toast = useToast()
  const crearProducto = useCrearProducto()
  const inputRef = useRef()

  const [filas, setFilas]         = useState([])
  const [fileName, setFileName]   = useState('')
  const [importing, setImporting] = useState(false)
  const [resultados, setResultados] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name); setResultados(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: 'array' })
        const ws = wb.Sheets[wb.SheetNames[0]]
        const rows = parseRows(ws)
        setFilas(rows)
      } catch (err) {
        toast.error('No se pudo leer el archivo: ' + err.message)
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImport = async () => {
    if (filas.length === 0) return
    setImporting(true)
    let ok = 0, fail = 0

    for (const fila of filas) {
      try {
        await crearProducto.mutateAsync({ ...fila, lote_id: loteId || null })
        ok++
      } catch {
        fail++
      }
    }

    setResultados({ ok, fail })
    setImporting(false)
    if (fail === 0) toast.success(`${ok} cartas importadas correctamente`)
    else toast.error(`${ok} importadas, ${fail} fallaron`)
  }

  const descargarPlantilla = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['nombre_jp','nombre_en','serie','numero_carta','idioma','condicion','cantidad_compra','precio_unitario_compra','precio_venta','nota'],
      ['ピカチュウ','Pikachu','Scarlet & Violet','025/198','JP','mint',1,150,350,''],
      ['リザードン','Charizard','Base Set','004/102','JP','near_mint',2,2500,5000,'Holo'],
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, 'plantilla_inventario.xlsx')
  }

  return (
    <Modal open={open} onClose={onClose} title="Importar desde Excel">
      <button onClick={descargarPlantilla} className="btn-ghost w-full py-2.5 text-sm mb-4">
        <Download size={15} /> Descargar plantilla Excel
      </button>

      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-white/15 rounded-2xl p-8 text-center cursor-pointer hover:border-[var(--accent)]/40 transition-all mb-4"
      >
        <Upload size={28} className="mx-auto mb-2 text-gray-500" />
        <p className="text-sm text-gray-300 font-medium">
          {fileName || 'Toca para seleccionar tu archivo Excel'}
        </p>
        <p className="text-xs text-gray-400 mt-1">.xlsx o .xls</p>
        <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="hidden" />
      </div>

      {filas.length > 0 && !resultados && (
        <div className="mb-4">
          <p className="text-sm text-white font-medium mb-3">
            {filas.length} cartas detectadas — vista previa:
          </p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {filas.slice(0, 5).map((f, i) => (
              <div key={i} className="flex items-center gap-2 p-2.5 bg-surface-700 rounded-xl">
                <span className="text-xs text-gray-400 flex-shrink-0 w-5">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-white truncate">{f.nombre_jp || f.nombre_en}</p>
                  <p className="text-[10px] text-gray-400">{f.serie} {f.numero_carta} · {f.cantidad_compra}x · ${f.precio_unitario_compra}</p>
                </div>
              </div>
            ))}
            {filas.length > 5 && (
              <p className="text-xs text-gray-400 text-center">+{filas.length - 5} más...</p>
            )}
          </div>
        </div>
      )}

      {resultados && (
        <div className={cn('p-4 rounded-xl mb-4', resultados.fail === 0 ? 'bg-ok/10 border border-ok/20' : 'bg-warn/10 border border-warn/20')}>
          <p className="text-sm font-medium text-white">
            {resultados.fail === 0
              ? `✅ ${resultados.ok} cartas importadas correctamente`
              : `⚠️ ${resultados.ok} importadas, ${resultados.fail} fallaron`
            }
          </p>
        </div>
      )}

      {filas.length > 0 && !resultados && (
        <button onClick={handleImport} disabled={importing} className="btn-primary w-full py-3.5 text-sm font-semibold">
          {importing ? <Spinner size="sm" /> : <><Check size={16} />Importar {filas.length} cartas</>}
        </button>
      )}

      {resultados && (
        <button onClick={onClose} className="btn-primary w-full py-3.5 text-sm font-semibold">
          Listo
        </button>
      )}
    </Modal>
  )
}
