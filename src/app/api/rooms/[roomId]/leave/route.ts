import { leaveRoom } from "@/lib/room-store";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const { userId } = (await request.json()) as { userId?: string };

  if (!userId) {
    return NextResponse.json({ message: "User id required." }, { status: 400 });
  }

  leaveRoom(roomId, userId);
  return NextResponse.json({ ok: true });
}
