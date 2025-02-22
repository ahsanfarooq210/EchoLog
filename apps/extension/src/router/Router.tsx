import React, { useEffect } from "react"
import { authClient } from "~auth/auth-client"
import Signin from "~components/auth/Signin"

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
