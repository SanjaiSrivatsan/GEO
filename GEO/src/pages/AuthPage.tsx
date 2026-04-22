import React, { useState } from "react";
import { Mail, Lock } from "lucide-react";
import { login, register, APIError } from "../utils/api";
import { setAuthToken } from "../utils/auth";

type Mode = "login" | "signup";

type AuthPageProps = {
  onAuthenticated?: () => void;
};

export default function AuthPage({ onAuthenticated }: AuthPageProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setShowPassword(false);
    setFormError("");
    setSuccessMessage("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSuccessMessage("");
    setIsLoading(true);

    // Validate inputs
    if (!email.trim() || !password) {
      setFormError("Please enter both email and password.");
      setIsLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        // Call backend API - POST /api/auth/login
        const response = await login(email.trim(), password);
        
        // Store JWT token in localStorage
        setAuthToken(response.token.access_token);
        
        setSuccessMessage("Success! Redirecting you to the dashboard...");
        
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          onAuthenticated?.();
        }, 600);
      } else {
        // Call backend API - POST /api/auth/register
        const response = await register(email.trim(), password);
        
        // Store JWT token in localStorage
        setAuthToken(response.token.access_token);
        
        setSuccessMessage("Account created! Redirecting to dashboard...");
        
        // Redirect to dashboard after brief delay
        setTimeout(() => {
          onAuthenticated?.();
        }, 600);
      }
    } catch (error) {
      if (error instanceof APIError) {
        // Handle specific API errors
        if (error.status === 400) {
          setFormError(error.message || "Email already registered.");
        } else if (error.status === 401) {
          setFormError("Invalid email or password.");
        } else if (error.status === 422) {
          setFormError("Please enter a valid email and password (min 8 characters).");
        } else if (error.status === 0) {
          setFormError("Cannot connect to server. Please ensure backend is running on http://localhost:8000");
        } else {
          setFormError(error.message || "An error occurred. Please try again.");
        }
      } else {
        setFormError("An unexpected error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === "login" ? "signup" : "login"));
    resetForm();
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-gradient-to-b from-[#050509] via-[#0A0A0F] to-[#0A0A0F] text-gray-200 px-6 py-12 overflow-hidden">
      {/* Animated gradient glow background */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(79,70,229,0.15),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(59,130,246,0.1),transparent_60%)] blur-3xl" />

      <div className="absolute left-6 top-6 inline-flex items-center gap-1 rounded-full border border-indigo-500/40 bg-[#11111A]/80 px-4 py-2 shadow-[0_0_10px_rgba(79,70,229,0.4)]">
        <span className="rounded-lg bg-[#11111A] px-3 py-1 text-base font-display uppercase tracking-[0.4em] text-[#4F46E5] font-black">
          GEO
        </span>
        <span className="text-base font-display uppercase tracking-[0.4em] text-gray-200 font-black">
          AI
        </span>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 md:flex-row md:items-start z-10">
        {/* Left Side */}
        <div className="flex-1 space-y-8 text-center md:text-left">
          <div className="inline-flex items-center gap-3 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-indigo-300 animate-pulse">
            <span className="h-2 w-2 animate-ping rounded-full bg-[#3B82F6]" />
            GEO Engine
          </div>
          <div className="space-y-4">
            <h1 className="text-4xl font-display font-semibold leading-tight md:text-5xl">
              Be the business AI recommends first.
            </h1>
            <p className="text-lg text-gray-400">
              While others guess, you stay consistent. That’s why AI picks you.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <HeroCard title="Stay Accurate" description="We keep your business info correct everywhere—so AI never gets it wrong." badge="LIVE SYNC" />
            <HeroCard title="Know What to Fix" description="See what builds trust (and what hurts it). Fix issues in minutes." badge="INSIGHTS" />
            <HeroCard title="AI-Ready Answers" description="Turn real customer questions into answers AI can quote and recommend." badge="CONTENT" />
            <HeroCard title="AI Alerts" description="Get notified when your info changes online—fix it before AI shows the wrong details." badge="ALERTS" />
          </div>
        </div>

        {/* Right Side Form */}
        <div className="flex-1 flex justify-center md:justify-end md:pt-16">
          <div className="relative w-full max-w-[420px] rounded-3xl bg-[#11111A]/90 p-8 backdrop-blur-xl shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all duration-500 hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(59,130,246,0.7)] border border-indigo-500/40">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-indigo-500/20 via-blue-500/10 to-purple-600/20 opacity-70 animate-pulse blur-lg" />
            <div className="relative z-10">
              <h2 className="mb-10 text-center text-3xl font-bold text-gray-100 font-display tracking-tight drop-shadow-[0_0_10px_rgba(79,70,229,0.5)]">
                {mode === "login" ? "Login" : "Register"}
              </h2>

              <form onSubmit={onSubmit} className="space-y-8">
                {formError && (
                  <div className="rounded-2xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm text-orange-300 shadow-[0_0_10px_rgba(249,115,22,0.3)]">
                    {formError}
                  </div>
                )}
                {successMessage && (
                  <div className="rounded-2xl border border-green-500/40 bg-green-500/10 px-4 py-2 text-sm text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]">
                    {successMessage}
                  </div>
                )}

                {/* Email */}
                <div className="group relative">
                  <label className="absolute -top-2 left-3 text-xs font-medium text-gray-400 transition-all group-focus-within:text-blue-300">
                    Email
                  </label>
                  <div className="relative rounded-2xl border border-indigo-500/40 bg-[#0F172A]/60 px-3 py-3 transition-all duration-300 group-hover:border-blue-400/60 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-transparent pr-8 text-sm text-gray-200 placeholder-transparent focus:outline-none"
                    />
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-blue-300 transition-colors">
                      <Mail size={16} />
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div className="group relative mt-5">
                  <label className="absolute -top-2 left-3 text-xs font-medium text-gray-400 transition-all group-focus-within:text-blue-300">
                    Password
                  </label>
                  <div className="relative rounded-2xl border border-indigo-500/40 bg-[#0F172A]/60 px-3 py-3 transition-all duration-300 group-hover:border-blue-400/60 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-transparent pr-8 text-sm text-gray-200 placeholder-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-300 transition-colors"
                    >
                      <Lock size={16} />
                    </button>
                  </div>
                </div>

                {/* Remember + Forgot */}
                <div className="flex items-center justify-between pt-2">
                  <label className="flex items-center gap-2 text-sm text-gray-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 accent-[#4F46E5]"
                    />
                    <span className="font-medium">Remember me</span>
                  </label>
                  <button type="button" className="text-sm text-blue-300 hover:underline transition-all">
                    Forgot Password?
                  </button>
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 rounded-full bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 py-3 text-base font-bold text-white shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all duration-300 hover:shadow-[0_0_30px_rgba(59,130,246,0.7)] hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:scale-100"
                  >
                    {isLoading ? "Loading..." : mode === "login" ? "Login" : "Register"}
                  </button>
                  <button
                    type="button"
                    className="flex w-36 items-center justify-center gap-2 rounded-full border border-white/30 py-3 text-sm font-semibold text-white transition-all hover:border-blue-400 hover:bg-blue-500/10 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]"
                    onClick={async () => {
                      setFormError("");
                      // User must log in with email first, then connect Google on the next step.
                      // The Google auth URL endpoint requires authentication.
                      setFormError("Please log in with email first, then connect Google on the next step.");
                    }}
                  >
                    <GoogleLogo />
                    Google
                  </button>
                </div>

                <div className="text-center text-sm text-gray-400">
                  <span className="opacity-80">Don't have an account? </span>
                  <button
                    type="button"
                    onClick={toggleMode}
                    className="font-bold text-blue-300 hover:underline"
                  >
                    {mode === "login" ? "Register" : "Login"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Google Logo ---------------- */
function GoogleLogo() {
  return (
    <svg viewBox="0 0 533.5 544.3" className="h-4 w-4" aria-hidden="true">
      <path
        d="M533.5 278.4c0-18.6-1.5-37.2-4.6-55.4H272.1v105.1h147.1c-6.2 34.4-26.1 64-55.7 83.6v69.3h89.6c52.5-48.3 80.4-119.5 80.4-202.6z"
        fill="#4285f4"
      />
      <path
        d="M272.1 544.3c75.6 0 139.2-25.1 185.6-68.3l-89.6-69.3c-24.9 16.7-56.7 26.4-96 26.4-73.7 0-136.1-49.8-158.4-116.8H21.7v73.4c46.2 90.4 140.8 154.6 250.4 154.6z"
        fill="#34a853"
      />
      <path
        d="M113.7 316.3c-11.4-34-11.4-70.7 0-104.7V138.2H21.7c-43.3 85.9-43.3 187.1 0 273l92-69.1z"
        fill="#fbbc05"
      />
      <path
        d="M272.1 107.7c39.7-.6 77.9 14 107 40.9l79.7-79.7C407 24 342.5-.2 272.1 0 162.5 0 67.9 64.2 21.7 154.6l92 73.4c22.3-67.1 84.7-120.3 158.4-120.3z"
        fill="#ea4335"
      />
    </svg>
  );
}

/* ---------------- HeroCard ---------------- */
function HeroCard({ title, description, badge }: { title: string; description: string; badge: string }) {
  return (
    <div className="rounded-3xl border border-indigo-500/30 bg-[#11111A]/50 p-4 text-left shadow-[0_0_20px_rgba(79,70,229,0.25)] transition-all duration-300 hover:-translate-y-1 hover:bg-[#1E1E2A]/60 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]">
      <div className="text-xs uppercase tracking-[0.3em] text-indigo-300">{badge}</div>
      <div className="mt-2 text-lg font-semibold text-gray-100">{title}</div>
      <p className="mt-1 text-sm text-gray-400">{description}</p>
    </div>
  );
}
