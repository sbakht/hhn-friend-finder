import { ShareApp } from "@/components/ShareApp";

interface HomeProps {
  searchParams: Promise<{ room?: string }>;
}

export default async function Home({ searchParams }: HomeProps) {
  const params = await searchParams;
  const initialRoom = params.room?.trim().toUpperCase();

  return <ShareApp initialRoom={initialRoom} />;
}
