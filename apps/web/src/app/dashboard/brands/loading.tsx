export default function BrandsLoading() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="skeleton h-8 w-24 rounded-lg" />
          <div className="skeleton mt-2 h-4 w-16 rounded-md" />
        </div>
        <div className="skeleton h-9 w-28 rounded-lg" />
      </div>

      {/* Brand cards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col overflow-hidden rounded-2xl"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            {/* Thumbnail 2×2 grid */}
            <div
              className="grid grid-cols-2 aspect-video"
              style={{ background: "var(--surface-2)" }}
            >
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="skeleton" style={{ borderRadius: 0 }} />
              ))}
            </div>

            {/* Info row */}
            <div
              className="flex items-center justify-between px-4 py-3"
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <div className="space-y-1.5">
                <div className="skeleton h-4 w-28 rounded-md" />
                <div className="skeleton h-3 w-20 rounded-md" />
              </div>
              <div className="skeleton h-5 w-16 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
