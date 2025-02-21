import { Loader2, Lock, Mail } from "lucide-react"
import React, { useEffect, useState, type FormEvent } from "react"
import { authClient } from "src/auth/auth-client"

interface FormState {
  email: string
  password: string
}

interface AuthError {
  message: string
  code?: string
  status?: number
}

const Signin: React.FC = () => {
  const [formData, setFormData] = useState<FormState>({
    email: "",
    password: ""
  })
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>("")

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const handleEmailSignIn = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError("")

    console.log("use effect ran", chrome.runtime.id)

    try {
      await authClient.signIn.email({
        email: formData.email,
        password: formData.password
      })
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message || "Failed to sign in")
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async (): Promise<void> => {
    setLoading(true)
    setError("")
    try {
      if (!chrome?.identity) {
        throw new Error("Chrome identity API not available")
      }
      console.log("plasmo client id", process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID)
      const url = new URL('https://accounts.google.com/o/oauth2/auth')
      const redirectURL = chrome.identity.getRedirectURL();
      console.log("redirect url", redirectURL)
      url.searchParams.set('client_id', process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID || '')
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('access_type', 'offline')
      url.searchParams.set('prompt', 'consent')  // Force to show consent screen to get refresh token
      url.searchParams.set('redirect_uri', redirectURL)

      const scopes = [
        'openid',
        'email',
        'profile',
      ]
      url.searchParams.set('scope', scopes.join(' '))

      const redirectedTo = await new Promise<string>((resolve, reject) => {
        chrome.identity.launchWebAuthFlow(
          {
            url: url.href,
            interactive: true,
          },
          (redirectUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message))
            } else {
              resolve(redirectUrl || '')
            }
          }
        )
      })

      const redirectUrl = new URL(redirectedTo)
      const params = new URLSearchParams(redirectUrl.search)
      const code = params.get('code')

      if (!code) {
        throw new Error('Failed to get authorization code')
      }

      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code,
          client_id: process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_ID || '',
          client_secret: process.env.PLASMO_PUBLIC_GOOGLE_CLIENT_SECRET || '',
          redirect_uri: chrome.identity.getRedirectURL(),
          grant_type: 'authorization_code',
        })
      });

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for tokens');
      }

      const tokens = await tokenResponse.json();
      console.log("tokens", tokens)

      // Now you can use these tokens with your auth client
      const data = await authClient.signIn.social({
        provider: "google",
        idToken: {
          token: tokens.id_token || "",
          accessToken: tokens.access_token || "",
          refreshToken: tokens.refresh_token || "",
          expiresAt: Date.now() + (tokens.expires_in * 1000),
        }
      });

      console.log('Authentication successful:', data)




    } catch (err) {
      const authError = err as AuthError
      setError(authError.message || "Failed to sign in with Google")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log("use effect ran", chrome.runtime.id)
  }, [])

  return (
    <div className="w-80 bg-background p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-card-foreground">Sign In</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Enter your credentials to continue
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div
            className="bg-destructive/10 border-l-4 border-destructive p-2 rounded"
            role="alert">
            <p className="text-destructive text-xs">{error}</p>
          </div>
        )}

        {/* Sign In Form */}
        <form className="space-y-4" onSubmit={handleEmailSignIn}>
          <div className="space-y-3">
            <div className="group">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-card-foreground mb-1">
                Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-8 px-2 py-2 text-sm border border-input rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground bg-background hover:bg-accent"
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
                className="block text-xs font-medium text-card-foreground mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="block w-full pl-8 px-2 py-2 text-sm border border-input rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground bg-background hover:bg-accent"
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
                className="h-3 w-3 rounded border-input text-primary focus:ring-primary cursor-pointer"
              />
              <label
                htmlFor="remember-me"
                className="ml-1 block text-xs text-card-foreground cursor-pointer">
                Remember me
              </label>
            </div>
            <a href="#" className="text-xs text-primary hover:text-primary/90">
              Forgot?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-3 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Sign in"}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">
                Or
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center px-3 py-2 text-xs font-medium text-card-foreground bg-card hover:bg-accent border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
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

        <p className="text-center text-xs text-muted-foreground">
          No account?{" "}
          <a href="#" className="text-primary hover:text-primary/90">
            Sign up
          </a>
        </p>
      </div>
    </div>
  )
}

export default Signin
