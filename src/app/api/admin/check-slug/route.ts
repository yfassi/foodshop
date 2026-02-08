import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) {
    return NextResponse.json({ available: false });
  }

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .single();

  return NextResponse.json({ available: !data });
}
