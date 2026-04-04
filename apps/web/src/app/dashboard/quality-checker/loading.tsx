export default function QualityCheckerLoading() {
  return (
    <div className="p-8 max-w-[900px]">
      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-40 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-72 rounded-md" />
      </div>

      {/* Action cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex items-start gap-4 rounded-2xl p-5"
            style={{
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="skeleton h-10 w-10 rounded-xl flex-shrink-0 mt-0.5" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-5 w-40 rounded-md" />
              <div className="skeleton h-3.5 w-full rounded-md" />
              <div className="skeleton h-3.5 w-3/4 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Recent audits section */}
      <div>
        <div className="skeleton h-3.5 w-28 rounded-md mb-4" />
        <div
          className="rounded-xl overflow-hidden"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between px-5 py-3.5"
              style={{ borderTop: i > 0 ? "1px solid var(--border)" : undefined }}
            >
              <div className="space-y-1.5">
                <div className="skeleton h-4 w-32 rounded-md" />
                <div className="skeleton h-3 w-24 rounded-md" />
              </div>
              <div className="flex items-center gap-3">
                <div className="skeleton h-4 w-12 rounded-md" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
