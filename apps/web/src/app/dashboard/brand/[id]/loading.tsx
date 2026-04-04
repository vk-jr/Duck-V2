export default function BrandDetailLoading() {
  return (
    <div className="p-8">
      {/* Back + header */}
      <div className="mb-8 max-w-4xl">
        <div className="skeleton h-4 w-28 rounded-md mb-5" />
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="skeleton h-8 w-52 rounded-lg" />
            <div className="skeleton h-4 w-36 rounded-md" />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <div className="skeleton h-5 w-16 rounded-full" />
            <div className="skeleton h-8 w-20 rounded-lg" />
            <div className="skeleton h-8 w-20 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="flex gap-8 items-start">
        {/* Left column */}
        <div className="flex-1 min-w-0 max-w-2xl space-y-6">
          {/* Reference images card */}
          <div
            className="rounded-xl"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="p-6 pb-0">
              <div className="skeleton h-5 w-48 rounded-md" />
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-5 md:grid-cols-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="skeleton aspect-square rounded-lg" />
                ))}
              </div>
            </div>
          </div>

          {/* Style guide card */}
          <div
            className="rounded-xl"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="p-6 pb-0">
              <div className="skeleton h-5 w-36 rounded-md" />
            </div>
            <div className="p-6 space-y-4">
              <div className="skeleton h-48 w-full rounded-lg" />
              <div className="skeleton h-3 w-72 rounded-md" />
              <div className="flex justify-end">
                <div className="skeleton h-9 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        {/* Right column — brand guide */}
        <div className="w-[420px] flex-shrink-0">
          <div
            className="rounded-xl overflow-hidden"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            {/* Guide header */}
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="skeleton h-3 w-20 rounded-md mb-2" />
              <div className="skeleton h-7 w-36 rounded-lg" />
            </div>

            {/* Logos */}
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="skeleton h-3 w-12 rounded-md mb-4" />
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 w-20 rounded-xl" />
                ))}
              </div>
            </div>

            {/* Colors */}
            <div className="px-6 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
              <div className="skeleton h-3 w-12 rounded-md mb-4" />
              <div className="skeleton h-3 w-28 rounded-md mb-3" />
              <div className="flex gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <div className="skeleton h-14 w-14 rounded-xl" />
                    <div className="skeleton h-3 w-12 rounded-md" />
                    <div className="skeleton h-2.5 w-10 rounded-md" />
                  </div>
                ))}
              </div>
            </div>

            {/* Personality traits */}
            <div className="px-6 py-5">
              <div className="skeleton h-3 w-32 rounded-md mb-4" />
              <div className="flex flex-wrap gap-2">
                {[80, 64, 96, 72, 56].map((w) => (
                  <div key={w} className={`skeleton h-7 rounded-full`} style={{ width: w }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
