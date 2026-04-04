export default function SettingsLoading() {
  return (
    <div className="p-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-24 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-40 rounded-md" />
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
        {/* Full name */}
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-20 rounded-md" />
          <div className="skeleton h-9 w-full rounded-lg" />
        </div>

        {/* Email */}
        <div className="space-y-2">
          <div className="skeleton h-3.5 w-12 rounded-md" />
          <div className="skeleton h-9 w-full rounded-lg" />
          <div className="skeleton h-3 w-40 rounded-md" />
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-1">
          <div className="skeleton h-9 w-28 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
