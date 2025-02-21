import { authClient } from "@/auth/auth-client"
import Signin from "@/components/auth/Signin"
import React from "react"

const Router = () => {
  const {
    data: session,
    isPending, //loading state
    error, //error object
    refetch //refetch the session
  } = authClient.useSession()

  console.log("session data", { session, isPending, error })

  if (!session) {
    return <Signin />
  }
  return <div>Router</div>
}

export default Router
