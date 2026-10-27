export default function Loading() {
  return (
    <div className="flex h-[calc(100vh-7rem)] -m-4 lg:-m-6 overflow-hidden rounded-xl border border-border bg-card animate-pulse">
      {/* Sol panel */}
      <div className="hidden lg:flex flex-col w-56 xl:w-64 border-r border-border p-4 gap-3">
        <div className="h-10 bg-muted rounded-lg" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 bg-muted rounded-lg" />
        ))}
        <div className="flex-1" />
        <div className="h-24 bg-muted rounded-lg" />
      </div>
      {/* Sağ içerik */}
      <div className="flex-1 p-4 space-y-4">
        <div className="h-10 bg-muted rounded-lg w-3/4" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="h-40 bg-muted rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
