const { DELETE } = require("./.next/server/app/api/meetings/[id]/route.js");
const { Request } = require("next/dist/compiled/@edge-runtime/primitives");

async function test() {
  const req = new Request("http://localhost/api/meetings/16347a6c-9074-4399-8a88-fb3f7acc52d6", {
    method: "DELETE",
    headers: {
      "x-user-role": "organizer"
    }
  });

  try {
    const res = await DELETE(req, { params: { id: "16347a6c-9074-4399-8a88-fb3f7acc52d6" } });
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
