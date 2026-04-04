export default function CheckComplianceLoading() {
  return (
    <div className="p-8 max-w-3xl">
      {/* Back + header */}
      <div className="mb-8">
        <div className="skeleton h-4 w-16 rounded-md mb-5" />
        <div className="skeleton h-8 w-56 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-64 rounded-md" />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form card */}
        <div
          className="rounded-xl p-6 space-y-5"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-12 rounded-md" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>

          <div className="space-y-2">
            <div className="skeleton h-3.5 w-24 rounded-md" />
            <div
              className="h-32 w-full rounded-xl border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div className="skeleton h-8 w-8 rounded-xl" />
            </div>
          </div>

          <div className="skeleton h-11 w-full rounded-lg" />
        </div>

        {/* Results card */}
        <div
          className="rounded-xl p-6"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Score area */}
          <div className="flex items-center gap-4 mb-6">
            <div className="skeleton h-8 w-8 rounded-full" />
            <div className="space-y-2">
              <div className="skeleton h-10 w-20 rounded-lg" />
              <div className="skeleton h-5 w-12 rounded-full" />
            </div>
          </div>

          {/* Analysis items */}
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg p-3 space-y-2"
                style={{ border: "1px solid var(--border)" }}
              >
                <div className="flex justify-between">
                  <div className="skeleton h-3.5 w-20 rounded-md" />
                  <div className="skeleton h-3.5 w-14 rounded-md" />
                </div>
                <div className="skeleton h-3 w-full rounded-md" />
                <div className="skeleton h-3 w-3/4 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
