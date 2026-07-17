// src/modules/couple/components/StepNombres.jsx
export default function StepNombres({ data, onChange }) {
  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="text-4xl mb-4">✏️</div>
        <h2 className="text-2xl font-bold text-white mb-2">Nombres</h2>
        <p className="text-sm text-gray-400">Así aparecerán en toda la app</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="label">Tu nombre</label>
          <input
            type="text"
            value={data.nombre1}
            onChange={(e) => onChange({ nombre1: e.target.value })}
            placeholder="¿Cómo te llamas?"
            className="input"
            autoFocus
          />
        </div>
        <div>
          <label className="label">Nombre de tu pareja</label>
          <input
            type="text"
            value={data.nombre2}
            onChange={(e) => onChange({ nombre2: e.target.value })}
            placeholder="¿Cómo se llama?"
            className="input"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Ella podrá cambiar su propio nombre cuando se una con su código
          </p>
        </div>
      </div>
    </div>
  )
}
