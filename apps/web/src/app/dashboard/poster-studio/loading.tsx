export default function PosterStudioLoading() {
  return (
    <div className="flex h-full flex-col p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-36 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-80 rounded-md" />
      </div>

      {/* Main content area — mirrors the poster studio split layout */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left: form controls */}
        <div
          className="w-[300px] flex-shrink-0 rounded-xl p-5 space-y-5"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-1)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Format selector */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-16 rounded-md" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>

          {/* Brand selector */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-12 rounded-md" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-16 rounded-md" />
            <div className="skeleton h-28 w-full rounded-lg" />
          </div>

          {/* Image upload */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-28 rounded-md" />
            <div
              className="h-24 w-full rounded-xl border-2 border-dashed"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            />
          </div>

          {/* Generate button */}
          <div className="skeleton h-11 w-full rounded-lg" />
        </div>

        {/* Right: canvas / poster preview */}
        <div className="flex flex-1 gap-6 min-w-0">
          {/* Canvas area */}
          <div
            className="flex-1 rounded-xl flex items-center justify-center"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="flex flex-col items-center gap-4">
              <div className="skeleton h-16 w-16 rounded-2xl" />
              <div className="space-y-2 text-center">
                <div className="skeleton h-4 w-48 rounded-md" />
                <div className="skeleton h-3 w-40 rounded-md" />
              </div>
            </div>
          </div>

          {/* Recent posters list */}
          <div
            className="w-64 flex-shrink-0 rounded-xl p-4 space-y-3"
            style={{
              border: "1px solid var(--border)",
              background: "var(--card-bg)",
              boxShadow: "var(--card-shadow)",
            }}
          >
            <div className="skeleton h-4 w-28 rounded-md mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex gap-3 items-center">
                <div className="skeleton h-14 w-10 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="skeleton h-3.5 w-full rounded-md" />
                  <div className="skeleton h-3 w-2/3 rounded-md" />
                  <div className="skeleton h-4 w-14 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
