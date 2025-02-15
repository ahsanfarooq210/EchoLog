"use client";

import { authClient } from "@/src/lib/auth-client";
import { Button } from "@workspace/ui/components/button";
import { useRouter } from "next/navigation";
import React from "react";

const DashboardPage = () => {
  const router = useRouter();
  return (
    <div>
      <Button
        onClick={async () => {
          await authClient.signOut({
            fetchOptions: {
              onSuccess: () => {
                router.push("/signin"); // redirect to login page
              },
            },
          });
        }}
      >
        Signout
      </Button>
    </div>
  );
};

export default DashboardPage;
