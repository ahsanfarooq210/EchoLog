import axios from "axios";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const response = await axios.get(
      "http://localhost:3001/api/auth/get-session",
      {
        headers: {
          cookie: request.headers.get("cookie"),
        },
      }
    );
    console.log("backend auth resonse", response.data);
    const headers = response.headers;
    console.log("response headers", headers);
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
