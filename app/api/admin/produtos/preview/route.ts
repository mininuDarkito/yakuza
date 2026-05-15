import { NextResponse } from "next/server";
import { resolveMetadata } from "@/lib/scrapers/index"; // Aquela função centralizadora

export async function POST(request: Request) {
  try {
    const { url } = await request.json();
    const metadata = await resolveMetadata(url);
    return NextResponse.json(metadata);
  } catch (error) {
    return NextResponse.json({ error: "Link não suportado" }, { status: 400 });
  }
}