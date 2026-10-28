import type { ReactNode } from 'react'

export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="dashboard-card">
      <div className="dashboard-card__heading">
        <h2>{title}</h2>
      </div>
      {children}
    </section>
  )
}
