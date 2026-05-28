"use client";

import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUp,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Import,
  LoaderCircle,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ImportStatus } from "@/components/command-centre/types";
import { cn } from "@/lib/utils";

export function FloatingSpreadsheetControls({
  sourceName,
  status,
  hasActiveFilter,
  onImportClick,
  onClearFilter,
  onReset,
  onStartBriefing,
  onViewScaleToggle,
  viewScaledDown,
  children,
}: {
  sourceName: string;
  status: ImportStatus;
  hasActiveFilter: boolean;
  onImportClick: () => void;
  onClearFilter: () => void;
  onReset: () => void;
  onStartBriefing: () => void;
  onViewScaleToggle: () => void;
  viewScaledDown: boolean;
  children?: ReactNode;
}) {
  const StatusIcon =
    status.state === "loading"
      ? LoaderCircle
      : status.state === "error"
        ? AlertTriangle
        : status.state === "success"
          ? CheckCircle2
          : FileSpreadsheet;

  function goToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function downloadSource() {
    window.location.assign("/source-spreadsheet");
  }

  const MenuIcon = status.state === "idle" ? MoreHorizontal : StatusIcon;

  return (
    <div className="fixed right-4 bottom-4 z-40 flex items-end sm:right-6 sm:bottom-6">
      <div
        className="flex items-center gap-1 rounded-full border bg-card p-1 shadow-2xl transition-all duration-300"
        data-tour="command-capsule"
      >
        {children}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-lg"
                className="rounded-full"
                aria-label="More spreadsheet actions"
                title={status.message}
              />
            }
          >
            <MenuIcon
              aria-hidden="true"
              className={cn(status.state === "loading" && "animate-spin")}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="!w-64 max-w-[calc(100vw-2rem)] bg-popover"
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="truncate">
                {sourceName}
              </DropdownMenuLabel>
              <DropdownMenuLabel className="whitespace-normal text-[11px] font-normal leading-4">
                {status.message}
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={onImportClick}>
                <Import aria-hidden="true" />
                Import files
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onClearFilter}
                disabled={!hasActiveFilter}
              >
                <X aria-hidden="true" />
                Clear filters
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onStartBriefing}>
                <Sparkles aria-hidden="true" />
                Start guided briefing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewScaleToggle}>
                {viewScaledDown ? (
                  <ZoomIn aria-hidden="true" />
                ) : (
                  <ZoomOut aria-hidden="true" />
                )}
                {viewScaledDown ? "Reset view scale" : "Scale view down"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={goToTop}>
                <ArrowUp aria-hidden="true" />
                Go to top
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onReset}>
                <RotateCcw aria-hidden="true" />
                Revert to original data
              </DropdownMenuItem>
              <DropdownMenuItem onClick={downloadSource}>
                <Download aria-hidden="true" />
                Download source
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
