"use client";
import React, { useState, FormEvent } from "react";
import { Mail, Lock, Loader2 } from "lucide-react";
import { authClient } from "@/src/lib/auth-client";

interface FormState {
  email: string;
  password: string;
}

interface AuthError {
  message: string;
  code?: string;
  status?: number;
}

const SignInPage: React.FC = () => {
  const [formData, setFormData] = useState<FormState>({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmailSignIn = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await authClient.signIn.email(
        {
          email: formData.email,
          password: formData.password,
        },
        {
          onSuccess: (ctx) => {
            const authToken = ctx.response.headers.get("set-auth-token");
            if (authToken) {
              localStorage.setItem("bearer_token", authToken);
            }
          },
          onError: (error) => {
            console.log("error while signing in", error);
          },
        }
      );
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (): Promise<void> => {
    setLoading(true);
    setError("");

    try {
      await authClient.signIn.social(
        {
          provider: "google" as const,
          callbackURL: "http://localhost:3000/dashboard",
        },
        {
          onSuccess: (ctx) => {
            const authToken = ctx.response.headers.get("set-auth-token");
            if (authToken) {
              localStorage.setItem("bearer_token", authToken);
            }
          },
          onError: (error) => {
            console.log("error while signing in", error);
          },
        }
      );
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || "Failed to sign in with Google");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side with enhanced decorative elements */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary to-secondary relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/20 rounded-full blur-2xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-secondary/30 rounded-full blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 w-48 h-48 bg-primary/20 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="relative w-full flex flex-col items-center justify-center px-12 z-10">
          <h1 className="text-5xl font-bold text-primary-foreground mb-8 animate-fade-in">
            Welcome Back!
          </h1>
          <p className="text-primary-foreground/90 text-center text-xl leading-relaxed">
            Sign in to access your dashboard and continue your journey with us.
          </p>
        </div>
      </div>

      {/* Right side with enhanced form styling and glow effect */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="relative bg-card p-8 rounded-lg shadow-lg before:absolute before:inset-0 before:-z-10 before:rounded-lg before:bg-gradient-to-r before:from-primary/10 before:via-secondary/10 before:to-primary/10 before:blur-xl before:content-['']">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-card-foreground tracking-tight">
                Sign in to your account
              </h2>
              <p className="mt-3 text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </div>

            {error && (
              <div
                className="bg-destructive/10 border-l-4 border-destructive p-4 rounded mt-6"
                role="alert"
              >
                <p className="text-destructive">{error}</p>
              </div>
            )}

            <form className="mt-8 space-y-6" onSubmit={handleEmailSignIn}>
              <div className="space-y-5">
                <div className="group">
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium text-card-foreground mb-2"
                  >
                    Email address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    </div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      className="block w-full pl-10 px-3 py-3 border border-input rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-foreground placeholder-muted-foreground bg-background hover:bg-accent"
                      placeholder="you@example.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="group">
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium text-card-foreground mb-2"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors duration-200" />
                    </div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      required
                      className="block w-full pl-10 px-3 py-3 border border-input rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 text-foreground placeholder-muted-foreground bg-background hover:bg-accent"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={handleInputChange}
                      disabled={loading}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 rounded border-input text-primary focus:ring-primary cursor-pointer"
                  />
                  <label
                    htmlFor="remember-me"
                    className="ml-2 block text-sm text-card-foreground cursor-pointer"
                  >
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a
                    href="#"
                    className="font-medium text-primary hover:text-primary/90 transition-colors duration-200"
                  >
                    Forgot your password?
                  </a>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  "Sign in"
                )}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-card text-muted-foreground">
                    Or continue with
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-3 border border-input rounded-md shadow-sm text-sm font-medium text-card-foreground bg-card hover:bg-accent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-[1.02]"
              >
                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </button>
            </form>

            <p className="text-center text-sm text-muted-foreground mt-8">
              Don't have an account?{" "}
              <a
                href="#"
                className="font-medium text-primary hover:text-primary/90 transition-colors duration-200"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;
