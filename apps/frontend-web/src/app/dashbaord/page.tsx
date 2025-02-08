"use client"

import { authClient } from '@/src/lib/auth-client'
import React from 'react'

const page = () => {
    
const { data: session, error } =  authClient.useSession()

console.log("user session",session)
  return (
    <div></div>
  )
}

export default page