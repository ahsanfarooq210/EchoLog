import { authClient } from "@/auth/auth-client"
import Signin from "@/components/auth/Signin"
import { CountButton } from "@/features/count-button"
import React, { useEffect } from "react"

const Router = () => {
  const session = authClient.useSession()

  console.log("session data", { ...session })

  useEffect(() => {}, [])

  if (!session.data) {
    return <Signin />
  }
  return (
    <div className="w-full h-full">
      <CountButton />
    </div>
  )
}

export default Router
