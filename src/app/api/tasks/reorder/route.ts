import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db";
import Task from "@/lib/models/Task";
import { requireUserId } from "@/lib/session";

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { workspaceId, parentId, orderedIds } = await req.json();
  if (!workspaceId || !Array.isArray(orderedIds)) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  await dbConnect();

  await Promise.all(
    orderedIds.map((id: string, index: number) =>
      Task.updateOne({ _id: id, userId, workspaceId }, { $set: { order: index } })
    )
  );

  return NextResponse.json({ ok: true });
}
