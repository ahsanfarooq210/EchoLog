import { authClient } from "@/auth/auth-client"
import Signin from "@/components/auth/Signin"
import Signup from "@/components/auth/Signup"
import React, { useEffect } from "react"

const Router = () => {
  const session = authClient.useSession()

  console.log("session data", { ...session })

  useEffect(() => {

  }, [])

  if (!session.data) {
    return <Signin />
  }
  return <div className="w-full h-full">Router</div>
}

export default Router
