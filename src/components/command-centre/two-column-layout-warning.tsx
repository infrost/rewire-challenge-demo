"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const twoColumnQuery = "(min-width: 1120px)";

export function TwoColumnLayoutWarning({
  onScaleDown,
}: {
  onScaleDown: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(twoColumnQuery);

    function syncOpenState() {
      setOpen(!dismissed && !mediaQuery.matches);
    }

    syncOpenState();
    mediaQuery.addEventListener("change", syncOpenState);

    return () => {
      mediaQuery.removeEventListener("change", syncOpenState);
    };
  }, [dismissed]);

  function scaleAppDown() {
    onScaleDown();
    setDismissed(true);
    setOpen(false);
  }

  function dismissWarning() {
    setDismissed(true);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Best on a bigger screen</DialogTitle>
          <DialogDescription>
            This command centre is designed for a two-column workspace. For the
            clearest view, zoom the page out with `Ctrl/Command` & `-` or switch to
            a device with a larger screen. You can also scale the app down here.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Close
          </DialogClose>
          <Button type="button" variant="outline" onClick={scaleAppDown}>
            Scale app down
          </Button>
          <Button type="button" onClick={dismissWarning}>
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
