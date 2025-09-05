"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { Sun, Settings, LogOut, Folder } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

interface UserInfo {
  email: string;
  display_name?: string | null;
  avatar_url?: string | null;
}

export function ProfileDropdown({ user }: { user: UserInfo }) {
  const [open, setOpen] = useState(false);
  const [showThemeSubmenu, setShowThemeSubmenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
        setShowThemeSubmenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="relative" ref={ref}>
      <div
        className="flex items-center gap-2 cursor-pointer px-3 py-2 rounded-md hover:bg-black/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {user.avatar_url ? (
          <img
            src={user.avatar_url}
            alt="User Avatar"
            width={28}
            height={28}
            className="w-7 h-7 rounded-full object-cover"
          />
        ) : (
          <div className="w-7 h-7 rounded-full bg-black/10 flex items-center justify-center text-sm font-medium text-black">
            {user.email.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="text-sm text-black">
          {user.display_name ? user.display_name.split(" ")[0] : "User"}
        </span>
        <svg
          className="h-4 w-4 text-black/60 transition-transform duration-200"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </div>

      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-black rounded-lg shadow-lg z-10">
          {/* User Info */}
          <div className="px-4 py-3 border-b border-black">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt="User Avatar"
                  width={32}
                  height={32}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-black/10 flex items-center justify-center text-sm font-medium text-black">
                  {user.email.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-black truncate">
                  {user.display_name
                    ? user.display_name.split(" ")[0]
                    : "Anonymous"}
                </div>
                <div className="text-xs text-black/60 truncate">
                  {user.email}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <Link
              href="/projects"
              className="flex items-center gap-3 px-4 py-2 text-sm text-black hover:bg-black/5 transition-colors cursor-pointer"
            >
              <Folder className="h-4 w-4 text-black/60" />
              My Classes
            </Link>

            {/* Logout */}
            <div className="border-t border-black mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-black/80 hover:bg-black/5 transition-colors text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-black/60" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [userLoading, setUserLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {
        const { email, user_metadata } = session.user;
        setUser({
          email: email ?? "",
          display_name:
            user_metadata?.name ??
            user_metadata?.full_name ??
            user_metadata?.display_name ??
            null,
          avatar_url:
            user_metadata?.avatar_url ?? user_metadata?.picture ?? null,
        });
      }

      setUserLoading(false);
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const { email, user_metadata } = session.user;
        setUser({
          email: email ?? "",
          display_name:
            user_metadata?.name ??
            user_metadata?.full_name ??
            user_metadata?.display_name ??
            null,
          avatar_url:
            user_metadata?.avatar_url ?? user_metadata?.picture ?? null,
        });
      } else {
        setUser(null);
      }
      setUserLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <header className="bg-white/80 backdrop-blur-sm top-0 z-10 relative">
      <div className="max-w-7xl mx-auto px-6 py-4 mt-4 rounded-xl border border-black">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="focus:outline-none flex items-center gap-3">
            <span className="text-2xl font-bold text-black">Law Bandit</span>
          </Link>

          <div className="flex items-center gap-4">
            {userLoading ? (
              <div className="w-20 h-8 bg-black/10 rounded-lg animate-pulse" />
            ) : user ? (
              <ProfileDropdown user={user} />
            ) : (
              <div className="flex gap-3">
                <Link
                  href="/login"
                  className="px-4 py-2 text-lg font-semibold text-black hover:bg-black/5 rounded-lg transition-colors cursor-pointer border border-black"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 text-lg font-semibold bg-black text-white rounded-lg hover:bg-black/90 transition-all duration-200"
                >
                  Get started
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
