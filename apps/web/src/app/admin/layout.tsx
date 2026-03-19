import { AdminNav } from './admin-nav'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav />
      <main className="flex-1 overflow-y-auto bg-neutral-950 p-4 lg:p-6">{children}</main>
    </div>
  )
}
