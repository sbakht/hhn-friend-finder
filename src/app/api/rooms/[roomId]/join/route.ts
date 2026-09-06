import { joinRoom } from "@/lib/room-store";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  try {
    const { roomId } = await params;
    const { name } = (await request.json()) as { name?: string };
    const result = joinRoom(roomId, name ?? "");
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to join room.";
    return NextResponse.json({ message }, { status: 400 });
  }
}
