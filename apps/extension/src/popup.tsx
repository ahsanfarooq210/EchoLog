import Router from "./router/Router"

import "./style.css"

import Signin from "@/components/auth/Signin"

function IndexPopup() {
  return (
    <div className="w-[500px] h-[700px]">
      <Router />
    </div>
  )
}

export default IndexPopup
