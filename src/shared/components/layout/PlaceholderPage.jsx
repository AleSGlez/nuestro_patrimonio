// src/shared/components/layout/PlaceholderPage.jsx
export default function PlaceholderPage({ emoji, title, fase }) {
  return (
    <div className="page flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="text-5xl">{emoji}</div>
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-gray-400">Próximamente — Fase {fase}</p>
    </div>
  )
}
