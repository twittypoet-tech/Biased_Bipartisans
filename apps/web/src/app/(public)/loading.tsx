export default function Loading() {
  return (
    <div className="min-h-screen bg-t-bg flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="size-8 border-2 border-t-edge border-t-transparent rounded-full animate-spin" style={{ borderTopColor: '#C8A44A' }} />
        <p className="text-sm text-t-text-3">Loading...</p>
      </div>
    </div>
  )
}
