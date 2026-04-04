export default function DashboardLoading() {
  return (
    <div className="p-8 max-w-[1200px]">
      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-48 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-64 rounded-md" />
      </div>

      {/* Quick action cards */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3.5 rounded-xl p-4"
            style={{ border: "1px solid var(--border)", background: "var(--surface-1)" }}
          >
            <div className="skeleton h-9 w-9 rounded-xl flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-24 rounded-md" />
              <div className="skeleton h-3 w-32 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Two cards */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Brands card */}
        <div
          className="rounded-xl"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="skeleton h-4 w-24 rounded-md" />
            <div className="skeleton h-3 w-14 rounded-md" />
          </div>
          <div className="p-3 space-y-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg px-3 py-2.5">
                <div className="skeleton h-4 w-36 rounded-md" />
                <div className="skeleton h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>

        {/* Recent images card */}
        <div
          className="rounded-xl"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid var(--border)" }}
          >
            <div className="skeleton h-4 w-28 rounded-md" />
            <div className="skeleton h-3 w-14 rounded-md" />
          </div>
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton aspect-square rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
