import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Navbar from "@/components/Navbar";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold text-black text-center mb-8 tracking-tight">
          PDF EXTRACTOR
        </h1>

        <p className="text-xl text-black/60 text-center mb-12 max-w-2xl">
          EXTRACT CALENDAR EVENTS • AI-POWERED • SYNC TO GOOGLE
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          {user ? (
            <Link
              href="/projects"
              className="bg-black hover:bg-black/90 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
            >
              Go to My Classes
            </Link>
          ) : (
            <>
              <Link
                href="/signup"
                className="bg-black hover:bg-black/90 text-white px-8 py-4 rounded-lg font-semibold transition-colors"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
