"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User } from "@supabase/supabase-js";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  if (loading) {
    return (
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
            <div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse"></div>
          </div>
        </div>
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/80 border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">LB</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">
                Law Bandit
              </span>
            </Link>

            {user && (
              <div className="hidden md:flex items-center ml-12 space-x-8">
                <Link
                  href="/projects"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 text-sm font-medium relative group"
                >
                  My Classes
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-900 transition-all duration-200 group-hover:w-full"></span>
                </Link>
                <Link
                  href="/calendar"
                  className="text-gray-600 hover:text-gray-900 transition-colors duration-200 text-sm font-medium relative group"
                >
                  Calendar
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gray-900 transition-all duration-200 group-hover:w-full"></span>
                </Link>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-gray-600 text-sm font-medium">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-gray-600 hidden lg:block">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors duration-200"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors duration-200 shadow-sm"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
