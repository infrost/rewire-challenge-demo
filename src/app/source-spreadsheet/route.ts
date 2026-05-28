import { readFile } from "node:fs/promises";

import { NextResponse } from "next/server";

import { landscapeWorkbookPath } from "@/lib/landscape";

export async function GET() {
  const file = await readFile(landscapeWorkbookPath);

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="demo.xlsx"',
    },
  });
}
