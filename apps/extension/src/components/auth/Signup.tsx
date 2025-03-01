import { Loader2, Lock, Mail, User } from "lucide-react"
import React, { useState, type FormEvent } from "react"
import { authClient } from "src/auth/auth-client"

interface FormState {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface AuthError {
  message: string
  code?: string
  status?: number
}

const Signup: React.FC = () => {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
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

  const handleEmailSignUp = async (
    e: FormEvent<HTMLFormElement>
  ): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError("")

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      await authClient.signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name
      })
    } catch (err) {
      const authError = err as AuthError
      setError(authError.message || "Failed to sign up")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-80 bg-background p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-bold text-card-foreground">Sign Up</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Create your account to continue
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

        {/* Sign Up Form */}
        <form className="space-y-4" onSubmit={handleEmailSignUp}>
          <div className="space-y-3">
            <div className="group">
              <label
                htmlFor="name"
                className="block text-xs font-medium text-card-foreground mb-1">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <User className="h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                </div>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  className="block w-full pl-8 px-2 py-2 text-sm border border-input rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground bg-background hover:bg-accent"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>

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

            <div className="group">
              <label
                htmlFor="confirmPassword"
                className="block text-xs font-medium text-card-foreground mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className="block w-full pl-8 px-2 py-2 text-sm border border-input rounded-md shadow-sm focus:ring-1 focus:ring-primary focus:border-primary text-foreground placeholder-muted-foreground bg-background hover:bg-accent"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-3 text-xs font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-md focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "Sign up"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Already have an account?{" "}
          <a href="#" className="text-primary hover:text-primary/90">
            Sign in
          </a>
        </p>
      </div>
    </div>
  )
}

export default Signup
