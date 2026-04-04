export default function GalleryLoading() {
  // Vary heights to mimic masonry proportions
  const heights = [220, 160, 280, 200, 180, 240, 170, 260, 190, 230, 150, 210];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="skeleton h-8 w-24 rounded-lg" />
        <div className="skeleton mt-2 h-4 w-44 rounded-md" />
      </div>

      {/* Filter bar */}
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="skeleton h-9 w-56 rounded-lg" />
        <div className="skeleton h-9 w-48 rounded-lg" />
        <div className="skeleton ml-auto h-4 w-16 rounded-md" />
      </div>

      {/* Masonry grid */}
      <div className="columns-2 gap-4 sm:columns-3 lg:columns-4">
        {heights.map((h, i) => (
          <div key={i} className="mb-4 break-inside-avoid">
            <div
              className="skeleton w-full rounded-xl"
              style={{ height: h }}
            />
            {/* Metadata below every "first" image (simulate one per generation) */}
            {i % 3 === 0 && (
              <div className="mt-2 px-0.5 space-y-1.5">
                <div className="skeleton h-3 w-full rounded-md" />
                <div className="skeleton h-3 w-3/4 rounded-md" />
                <div className="flex gap-2 mt-1">
                  <div className="skeleton h-5 w-16 rounded-full" />
                  <div className="skeleton h-4 w-20 rounded-md" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
