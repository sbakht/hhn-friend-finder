import { getRoomSnapshot, touchUser } from "@/lib/room-store";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") ?? undefined;

  if (userId) {
    touchUser(roomId, userId);
  }

  return NextResponse.json(getRoomSnapshot(roomId, userId));
}
