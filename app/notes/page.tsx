"use client"
import NotesSection from '../components/NotesSection'

export default function NotesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <main className="w-full h-[calc(100vh-64px)]">
        <NotesSection />
      </main>
    </div>
  )
}
