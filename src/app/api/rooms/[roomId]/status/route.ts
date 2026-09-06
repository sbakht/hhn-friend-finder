import { postStatus } from "@/lib/room-store";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const { userId, text } = (await request.json()) as {
    userId?: string;
    text?: string;
  };

  if (!userId || !text?.trim()) {
    return NextResponse.json({ message: "Invalid status payload." }, { status: 400 });
  }

  const ok = postStatus(roomId, userId, text);
  if (!ok) {
    return NextResponse.json({ message: "Unable to post status." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
