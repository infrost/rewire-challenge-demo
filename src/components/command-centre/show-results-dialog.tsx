"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  ArrowUpDown,
  Columns3,
  ExternalLink,
  ListFilter,
  RotateCcw,
  Search,
} from "lucide-react";
import type {
  Column,
  ColumnDef,
  SortingState,
  VisibilityState,
} from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  inferMapRegion,
  type MapRegion,
  type MaterialCategory,
  normalizeExternalLink,
  type Organisation,
  type OrganisationType,
  type SupplyChainRole,
} from "@/lib/landscape-core";
import {
  buildResultFacets,
  dataQualityIssueLabels,
  filterOrganisations,
  type DataQualityIssue,
  type OrganisationResultFilter,
  type ResultContext,
  type ResultFacetOption,
} from "@/lib/landscape-results";

const allValue = "all";

type DialogFilterState = {
  search: string;
  materials: MaterialCategory[];
  supplyChainRoles: SupplyChainRole[];
  organisationTypes: OrganisationType[];
  sourceSheets: string[];
  regions: MapRegion[];
  dataQualityIssues: DataQualityIssue[];
  ukPresence: string;
  locationQuery: string;
};

const fallbackContext: ResultContext = {
  id: "all-results",
  label: "All Results",
  description: "All organisations in the active workbook.",
  filter: {},
};

function stateFromFilter(filter: OrganisationResultFilter): DialogFilterState {
  return {
    search: filter.search ?? "",
    materials: filter.materials ?? [],
    supplyChainRoles: filter.supplyChainRoles ?? [],
    organisationTypes: filter.organisationTypes ?? [],
    sourceSheets: filter.sourceSheets ?? [],
    regions: filter.regions ?? [],
    dataQualityIssues: filter.dataQualityIssues ?? [],
    ukPresence:
      typeof filter.ukPresence === "boolean"
        ? String(filter.ukPresence)
        : allValue,
    locationQuery: filter.locationQuery ?? "",
  };
}

function filterFromState(state: DialogFilterState): OrganisationResultFilter {
  return {
    search: state.search || undefined,
    materials: state.materials.length ? state.materials : undefined,
    supplyChainRoles: state.supplyChainRoles.length
      ? state.supplyChainRoles
      : undefined,
    organisationTypes: state.organisationTypes.length
      ? state.organisationTypes
      : undefined,
    sourceSheets: state.sourceSheets.length ? state.sourceSheets : undefined,
    regions: state.regions.length ? state.regions : undefined,
    dataQualityIssues: state.dataQualityIssues.length
      ? state.dataQualityIssues
      : undefined,
    ukPresence:
      state.ukPresence === allValue ? null : state.ukPresence === "true",
    locationQuery: state.locationQuery || undefined,
  };
}

function SortableHeader({
  column,
  title,
}: {
  column: Column<Organisation, unknown>;
  title: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {title}
      <ArrowUpDown aria-hidden="true" data-icon="inline-end" />
    </Button>
  );
}

function optionText<T extends string>(option: ResultFacetOption<T>) {
  return `${option.value} (${option.count})`;
}

function FilterField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid min-w-0 gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function toggleOption<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

function multiSelectLabel<T extends string>(
  values: T[],
  allLabel: string,
) {
  if (values.length === 0) {
    return allLabel;
  }

  if (values.length <= 2) {
    return values.join(" + ");
  }

  return `${values.length} selected`;
}

function MultiFilterSelect<T extends string>({
  label,
  values,
  options,
  allLabel,
  formatOption = optionText,
  onChange,
}: {
  label: string;
  values: T[];
  options: ResultFacetOption<T>[];
  allLabel: string;
  formatOption?: (option: ResultFacetOption<T>) => string;
  onChange: (values: T[]) => void;
}) {
  return (
    <FilterField label={label}>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full justify-between"
            />
          }
        >
          <span className="min-w-0 truncate">
            {multiSelectLabel(values, allLabel)}
          </span>
          <ListFilter aria-hidden="true" data-icon="inline-end" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-72">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{label}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={values.length === 0}
              onCheckedChange={() => onChange([])}
            >
              {allLabel}
            </DropdownMenuCheckboxItem>
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={values.includes(option.value)}
                onCheckedChange={() =>
                  onChange(toggleOption(values, option.value))
                }
              >
                {formatOption(option)}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </FilterField>
  );
}

function FilterSelect<T extends string>({
  label,
  value,
  options,
  allLabel,
  formatOption = optionText,
  onChange,
}: {
  label: string;
  value: string;
  options: ResultFacetOption<T>[];
  allLabel: string;
  formatOption?: (option: ResultFacetOption<T>) => string;
  onChange: (value: string) => void;
}) {
  const selectedOption = options.find((option) => option.value === value);
  const selectedLabel =
    value === allValue
      ? allLabel
      : selectedOption
        ? formatOption(selectedOption)
        : value;

  return (
    <FilterField label={label}>
      <Select
        value={value}
        onValueChange={(nextValue) => onChange(String(nextValue))}
      >
        <SelectTrigger aria-label={label} size="sm" className="w-full">
          <SelectValue placeholder={label}>{() => selectedLabel}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>{label}</SelectLabel>
            <SelectItem value={allValue}>{allLabel}</SelectItem>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {formatOption(option)}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </FilterField>
  );
}

function cellBadges(values: string[]) {
  if (values.length === 0) {
    return <span className="text-muted-foreground">None</span>;
  }

  return (
    <div className="flex max-w-[260px] flex-wrap gap-1">
      {values.map((value) => (
        <Badge key={value} variant="outline">
          {value}
        </Badge>
      ))}
    </div>
  );
}

export function ShowResultsDialog({
  open,
  onOpenChange,
  context,
  organisations,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: ResultContext | null;
  organisations: Organisation[];
}) {
  const activeContext = context ?? fallbackContext;
  const [filterState, setFilterState] = useState<DialogFilterState>(() =>
    stateFromFilter(activeContext.filter),
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const facets = useMemo(() => buildResultFacets(organisations), [organisations]);
  const appliedFilter = useMemo(
    () => filterFromState(filterState),
    [filterState],
  );
  const data = useMemo(
    () => filterOrganisations(organisations, appliedFilter),
    [appliedFilter, organisations],
  );
  const columns = useMemo<ColumnDef<Organisation>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <SortableHeader column={column} title="Organisation" />
        ),
        cell: ({ row }) => (
          <div className="max-w-[220px] whitespace-normal font-medium">
            {row.original.name}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: ({ column }) => <SortableHeader column={column} title="Type" />,
        cell: ({ row }) => <Badge variant="secondary">{row.original.type}</Badge>,
      },
      {
        id: "materials",
        accessorFn: (organisation) => organisation.materials.join(", "),
        header: "Materials",
        cell: ({ row }) => cellBadges(row.original.materials),
      },
      {
        id: "supplyChainRoles",
        accessorFn: (organisation) => organisation.supplyChainRoles.join(", "),
        header: "Supply chain roles",
        cell: ({ row }) => cellBadges(row.original.supplyChainRoles),
      },
      {
        id: "location",
        accessorFn: (organisation) =>
          `${organisation.location ?? ""} ${inferMapRegion(organisation)}`,
        header: ({ column }) => (
          <SortableHeader column={column} title="Location / region" />
        ),
        cell: ({ row }) => (
          <div className="max-w-[220px] whitespace-normal">
            <p>{row.original.location ?? "Unknown location"}</p>
            <p className="text-xs text-muted-foreground">
              {inferMapRegion(row.original)}
            </p>
          </div>
        ),
      },
      {
        accessorKey: "sourceSheet",
        header: ({ column }) => (
          <SortableHeader column={column} title="Source sheet" />
        ),
      },
      {
        accessorKey: "contact",
        header: "Contact",
        cell: ({ row }) => row.original.contact ?? "None",
      },
      {
        accessorKey: "remit",
        header: "Remit",
        cell: ({ row }) => (
          <div className="max-w-[360px] whitespace-normal leading-5">
            {row.original.remit || "No remit recorded."}
          </div>
        ),
      },
      {
        accessorKey: "link",
        header: "Link",
        cell: ({ row }) => {
          const link = normalizeExternalLink(row.original.link);

          return link ? (
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
            >
              Open
              <ExternalLink aria-hidden="true" />
            </a>
          ) : (
            "None"
          );
        },
      },
    ],
    [],
  );
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnVisibility,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  useEffect(() => {
    if (open) {
      setFilterState(stateFromFilter(activeContext.filter));
    }
  }, [activeContext.filter, activeContext.id, open]);

  function updateFilter<K extends keyof DialogFilterState>(
    key: K,
    value: DialogFilterState[K],
  ) {
    setFilterState((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetFilters() {
    setFilterState(stateFromFilter(activeContext.filter));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="h-[calc(100vh-2rem)] w-[calc(100vw-2rem)] max-w-none grid-rows-[auto_auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-6xl">
        <DialogHeader>
          <DialogTitle>{activeContext.label}</DialogTitle>
          <DialogDescription className="pr-8">
            {activeContext.description}
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-w-0 gap-3">
          <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField label="Search">
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <Input
                  aria-label="Search results"
                  value={filterState.search}
                  onChange={(event) =>
                    updateFilter("search", event.target.value)
                  }
                  placeholder="Search"
                  className="pl-8"
                />
              </div>
            </FilterField>
            <MultiFilterSelect<MaterialCategory>
              label="Material"
              values={filterState.materials}
              options={facets.materials}
              allLabel="All materials"
              onChange={(values) => updateFilter("materials", values)}
            />
            <MultiFilterSelect<SupplyChainRole>
              label="Role"
              values={filterState.supplyChainRoles}
              options={facets.supplyChainRoles}
              allLabel="All roles"
              onChange={(values) => updateFilter("supplyChainRoles", values)}
            />
            <MultiFilterSelect<OrganisationType>
              label="Type"
              values={filterState.organisationTypes}
              options={facets.organisationTypes}
              allLabel="All types"
              onChange={(values) => updateFilter("organisationTypes", values)}
            />
            <MultiFilterSelect<string>
              label="Source sheet"
              values={filterState.sourceSheets}
              options={facets.sourceSheets}
              allLabel="All sheets"
              onChange={(values) => updateFilter("sourceSheets", values)}
            />
            <MultiFilterSelect<MapRegion>
              label="Region"
              values={filterState.regions}
              options={facets.regions}
              allLabel="All regions"
              onChange={(values) => updateFilter("regions", values)}
            />
            <MultiFilterSelect<DataQualityIssue>
              label="Data quality"
              values={filterState.dataQualityIssues}
              options={facets.dataQualityIssues}
              allLabel="All records"
              formatOption={(option) =>
                `${dataQualityIssueLabels[option.value]} (${option.count})`
              }
              onChange={(values) => updateFilter("dataQualityIssues", values)}
            />
            <FilterSelect
              label="UK presence"
              value={filterState.ukPresence}
              options={[
                {
                  value: "true",
                  count: organisations.filter((item) => item.ukPresence).length,
                },
                {
                  value: "false",
                  count: organisations.filter((item) => !item.ukPresence)
                    .length,
                },
              ]}
              allLabel="All UK states"
              formatOption={(option) =>
                `${option.value === "true" ? "UK present" : "Not UK present"} (${option.count})`
              }
              onChange={(value) => updateFilter("ukPresence", value)}
            />
            <FilterField label="Location text">
              <Input
                aria-label="Filter by location text"
                value={filterState.locationQuery}
                onChange={(event) =>
                  updateFilter("locationQuery", event.target.value)
                }
                placeholder="Location text"
              />
            </FilterField>
          </div>

          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {data.length} of {organisations.length} organisations shown
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetFilters}
              >
                <RotateCcw aria-hidden="true" data-icon="inline-start" />
                Reset
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={<Button type="button" variant="outline" size="sm" />}
                >
                  <Columns3 aria-hidden="true" data-icon="inline-start" />
                  Columns
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Columns</DropdownMenuLabel>
                    {table
                      .getAllColumns()
                      .filter((column) => column.getCanHide())
                      .map((column) => (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          checked={column.getIsVisible()}
                          onCheckedChange={(checked) =>
                            column.toggleVisibility(checked)
                          }
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        <div className="min-h-0 max-w-full overflow-hidden rounded-md border">
          <Table
            containerClassName="h-full overflow-auto"
            className="min-w-[1400px]"
          >
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length}>
                    <Empty>
                      <EmptyHeader>
                        <EmptyMedia variant="icon">
                          <ListFilter aria-hidden="true" />
                        </EmptyMedia>
                        <EmptyTitle>No organisations match</EmptyTitle>
                        <EmptyDescription>
                          Reset the table filters or broaden the search text.
                        </EmptyDescription>
                      </EmptyHeader>
                    </Empty>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t pt-3">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {Math.max(table.getPageCount(), 1)}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
