import { updateLocation } from "@/lib/room-store";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const { roomId } = await params;
  const { userId, lat, lng } = (await request.json()) as {
    userId?: string;
    lat?: number;
    lng?: number;
  };

  if (!userId || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ message: "Invalid location payload." }, { status: 400 });
  }

  const ok = updateLocation(roomId, userId, lat, lng);
  if (!ok) {
    return NextResponse.json({ message: "User not found in room." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
