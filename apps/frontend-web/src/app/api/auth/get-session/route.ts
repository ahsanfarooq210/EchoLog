import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    console.log("backend request", request.headers.get("cookie"));
    const response = await axios.get(
      "http://localhost:3001/api/auth/get-session",
      {
        headers: {
          cookie: request.headers.get("cookie"),
        },
      }
    );
    // console.log("backend auth resonse", response.data);
    return NextResponse.json(
      {
        ...response.data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("error while fetching session", error);
    return NextResponse.json({ message: "failure" }, { status: 500 });
  }
}
