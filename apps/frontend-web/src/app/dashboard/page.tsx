"use client";

import { authClient } from "@/src/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import axios from "axios";
import { useRouter } from "next/navigation";
import React, { useEffect } from "react";

const DashboardPage = () => {
  const router = useRouter();
  const session = authClient.useSession();

  useEffect(() => {
    const getMe = async () => {
      try {
        const response = await axios.get(
          `${process.env.NEXT_PUBLIC_SERVER_URL}/api/v1/auth/me`,{
            withCredentials:true
          }
        );
        console.log("me response", response.data);
      } catch (error) {
        console.log("error while getting the me", error);
      }
    };
    getMe();
  }, []);
  return (
    <div className="flex flex-col gap-9 justify-center">
      <Button
        onClick={async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                router.push("/signin"); // redirect to login page
              },
            },
          });
        }}>
        Signout
      </Button>

      <div>{`${JSON.stringify(session)}`}</div>
    </div>
  );
};

export default DashboardPage;
