export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-white shadow-[0_8px_24px_-4px_rgba(0,0,0,0.12)]">
      <div className="relative aspect-[4/5]">
        <div className="w-full h-full shimmer" />
      </div>
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 rounded-full shimmer" />
        <div className="h-3 w-1/3 rounded-full shimmer" />
        <div className="h-4 w-1/2 rounded-full shimmer" />
        <div className="h-8 w-full rounded-full shimmer" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => <ProductCardSkeleton key={i} />)}
    </div>
  );
}

export function OrderRowSkeleton() {
  return (
    <div className="rounded-2xl border border-black shadow-md p-4 flex items-center gap-3">
      <div className="w-16 h-16 rounded-xl shimmer shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-2/3 rounded-full shimmer" />
        <div className="h-3 w-1/3 rounded-full shimmer" />
        <div className="h-3 w-1/4 rounded-full shimmer" />
      </div>
    </div>
  );
}

export function OrderListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => <OrderRowSkeleton key={i} />)}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div>
      <div className="px-4 pt-3 flex gap-3">
        <div className="flex-1 aspect-[4/5] rounded-2xl overflow-hidden border border-black shadow-lg">
          <div className="w-full h-full shimmer" />
        </div>
        <div className="flex flex-col gap-2 w-16">
          <div className="w-16 aspect-square rounded-xl shimmer" />
          <div className="w-16 aspect-square rounded-xl shimmer" />
          <div className="w-16 aspect-square rounded-xl shimmer" />
        </div>
      </div>
      <div className="px-5 pt-5 space-y-5">
        <div className="space-y-2">
          <div className="h-2.5 w-16 rounded-full shimmer" />
          <div className="flex items-baseline justify-between gap-3">
            <div className="h-5 w-2/5 rounded-full shimmer" />
            <div className="h-5 w-1/5 rounded-full shimmer" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-24 rounded-full shimmer" />
          <div className="flex gap-2">
            <div className="w-[22px] h-[22px] rounded-full shimmer" />
            <div className="w-[22px] h-[22px] rounded-full shimmer" />
            <div className="w-[22px] h-[22px] rounded-full shimmer" />
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-16 rounded-full shimmer" />
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-11 rounded-xl shimmer" />)}
          </div>
        </div>
        <div className="space-y-2">
          <div className="h-3 w-20 rounded-full shimmer" />
          <div className="h-3 w-full rounded-full shimmer" />
          <div className="h-3 w-5/6 rounded-full shimmer" />
        </div>
      </div>
    </div>
  );
}
