import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isDemoCustomerEmail } from "@/lib/stripe/demo";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDemo = await isDemoCustomerEmail(user?.email);
  return NextResponse.json({ isDemo });
}
