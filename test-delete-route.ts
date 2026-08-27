import { DELETE } from "./src/app/api/meetings/%5Bid%5D/route.ts";
import { Request } from "next/dist/compiled/@edge-runtime/primitives";

async function test() {
  const req = new Request("http://localhost/api/meetings/16347a6c-9074-4399-8a88-fb3f7acc52d6", {
    method: "DELETE",
    headers: {
      "x-user-role": "organizer"
    }
  });

  try {
    const res = await DELETE(req as any, { params: { id: "16347a6c-9074-4399-8a88-fb3f7acc52d6" } });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
