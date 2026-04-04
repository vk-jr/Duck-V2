export default function CreateGuidelinesLoading() {
  return (
    <div className="p-8 max-w-2xl">
      {/* Back + header */}
      <div className="mb-8">
        <div className="skeleton h-4 w-16 rounded-md mb-5" />
        <div className="skeleton h-8 w-52 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-80 rounded-md" />
      </div>

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
          <div className="skeleton h-3.5 w-36 rounded-md" />
          <div
            className="h-36 w-full rounded-xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: "var(--border)", background: "var(--surface-2)" }}
          >
            <div className="skeleton h-8 w-8 rounded-xl" />
          </div>
        </div>

        <div className="space-y-2">
          <div className="skeleton h-3.5 w-52 rounded-md" />
          <div className="skeleton h-20 w-full rounded-lg" />
        </div>

        <div className="flex justify-end pt-1">
          <div className="skeleton h-9 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
