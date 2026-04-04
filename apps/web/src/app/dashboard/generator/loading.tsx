export default function GeneratorLoading() {
  return (
    <div className="flex h-full flex-col p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-60 rounded-md" />
      </div>

      {/* Split layout */}
      <div className="flex flex-1 gap-6 min-h-0">
        {/* Left panel */}
        <div
          className="w-[300px] flex-shrink-0 rounded-xl p-5 space-y-4"
          style={{
            border: "1px solid var(--border)",
            background: "var(--surface-1)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          {/* Optional image upload */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-44 rounded-md" />
            <div
              className="h-28 w-full rounded-xl border-2 border-dashed flex items-center justify-center"
              style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
            >
              <div className="skeleton h-8 w-8 rounded-xl" />
            </div>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-16 rounded-md" />
            <div className="skeleton h-28 w-full rounded-lg" />
          </div>

          {/* Brand select */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-12 rounded-md" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>

          {/* 2-column selects */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-14 rounded-md" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
            <div className="space-y-2">
              <div className="skeleton h-3.5 w-10 rounded-md" />
              <div className="skeleton h-9 w-full rounded-lg" />
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <div className="skeleton h-3.5 w-20 rounded-md" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>

          {/* Generate button */}
          <div className="skeleton mt-1 h-11 w-full rounded-lg" />
        </div>

        {/* Right panel — canvas placeholder */}
        <div
          className="flex-1 min-w-0 rounded-xl flex items-center justify-center"
          style={{
            border: "1px solid var(--border)",
            background: "var(--card-bg)",
            boxShadow: "var(--card-shadow)",
          }}
        >
          <div className="flex flex-col items-center gap-4">
            <div className="skeleton h-16 w-16 rounded-2xl" />
            <div className="space-y-2 text-center">
              <div className="skeleton h-4 w-56 rounded-md" />
              <div className="skeleton h-3 w-44 rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
