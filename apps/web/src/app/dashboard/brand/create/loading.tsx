export default function CreateBrandLoading() {
  return (
    <div className="p-8 max-w-2xl">
      {/* Back link + header */}
      <div className="mb-8">
        <div className="skeleton h-4 w-28 rounded-md" />
        <div className="mt-5 flex items-center gap-3">
          <div className="skeleton h-10 w-10 rounded-xl" />
          <div className="space-y-2">
            <div className="skeleton h-7 w-40 rounded-lg" />
            <div className="skeleton h-4 w-72 rounded-md" />
          </div>
        </div>
      </div>

      {/* Form card */}
      <div
        className="rounded-xl p-6 space-y-6"
        style={{
          border: "1px solid var(--border)",
          background: "var(--card-bg)",
          boxShadow: "var(--card-shadow)",
        }}
      >
        {/* Brand name field */}
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-24 rounded-md" />
          <div className="skeleton h-9 w-full rounded-lg" />
        </div>

        {/* File upload area */}
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-32 rounded-md" />
          <div
            className="h-40 w-full rounded-xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="skeleton h-10 w-10 rounded-xl" />
              <div className="space-y-1.5 text-center">
                <div className="skeleton h-4 w-48 rounded-md" />
                <div className="skeleton h-3 w-36 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-1">
          <div className="skeleton h-3 w-28 rounded-md" />
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
