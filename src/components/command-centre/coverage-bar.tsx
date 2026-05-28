import { Progress } from "@/components/ui/progress";
import {
  organisationTypes,
  type CoverageItem,
  type OrganisationType,
} from "@/lib/landscape-core";
import { cn } from "@/lib/utils";

const typeTone: Record<OrganisationType, string> = {
  Industry: "bg-ecosystem-industry",
  Academic: "bg-ecosystem-academic",
  Other: "bg-ecosystem-other",
};

function StackedCoverageBar<T extends string>({
  item,
  stackedTypes,
}: {
  item: CoverageItem<T> & {
    typeCounts?: Record<OrganisationType, number>;
  };
  stackedTypes: OrganisationType[];
}) {
  const types = stackedTypes.length ? stackedTypes : [...organisationTypes];
  const count = Math.max(item.count, 0);
  const totalWidth = Math.max(item.share, count > 0 ? 6 : 0);
  const segments = types
    .map((type) => ({
      type,
      count: item.typeCounts?.[type] ?? 0,
    }))
    .filter((segment) => segment.count > 0);

  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="flex h-full transition-all duration-500 ease-out"
        style={{ width: `${totalWidth}%` }}
      >
        {segments.map((segment) => (
          <span
            key={segment.type}
            className={cn(
              "h-full transition-all duration-500 ease-out",
              typeTone[segment.type],
            )}
            style={{
              width: `${count ? (segment.count / count) * 100 : 0}%`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export function CoverageBar<T extends string>({
  item,
  stackedTypes,
  selected = false,
  onSelect,
}: {
  item: CoverageItem<T> & {
    typeCounts?: Record<OrganisationType, number>;
  };
  stackedTypes?: OrganisationType[];
  selected?: boolean;
  onSelect?: (item: CoverageItem<T>) => void;
}) {
  const content = (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="font-medium text-foreground">{item.key}</span>
        <span className="tabular-nums text-muted-foreground">{item.count}</span>
      </div>
      {stackedTypes && item.typeCounts ? (
        <StackedCoverageBar item={item} stackedTypes={stackedTypes} />
      ) : (
        <Progress value={Math.max(item.share, item.count > 0 ? 6 : 0)} />
      )}
    </div>
  );

  if (!onSelect) {
    return content;
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={cn(
        "rounded-md p-1.5 text-left transition hover:bg-muted",
        selected ? "bg-muted ring-1 ring-primary/30" : "bg-transparent",
      )}
    >
      {content}
    </button>
  );
}
