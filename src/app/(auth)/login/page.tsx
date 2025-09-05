import Link from "next/link";
import { login } from "./action";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] px-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-black mb-2">Welcome Back</h1>
            <p className="text-black/60">Sign in to your account</p>
          </div>

          <form className="space-y-6" action={login}>
            <div className="space-y-4">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full px-4 py-3 border border-black rounded-lg text-black placeholder-black/40 focus:outline-none focus:border-black"
                placeholder="Email address"
              />
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="w-full px-4 py-3 border border-black rounded-lg text-black placeholder-black/40 focus:outline-none focus:border-black"
                placeholder="Password"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded-lg font-semibold hover:bg-black/90 transition-colors"
            >
              Sign In
            </button>
          </form>

          <div className="text-center">
            <p className="text-black/60">
              Don&apos;t have an account?{" "}
              <Link
                href="/signup"
                className="text-black font-semibold hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
