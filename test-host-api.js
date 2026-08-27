const { POST } = require("./.next/server/app/api/meetings/host/route.js");
const { Request } = require("next/dist/compiled/@edge-runtime/primitives");

async function test() {
  const req = new Request("http://localhost/api/meetings/host", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      title: "Test Instant Meeting",
      department: "Engineering",
      googleMeetLink: "https://meet.google.com/abc-defg-hij",
      agenda: "Instant meeting test"
    })
  });

  try {
    console.log("Invoking POST /api/meetings/host...");
    const res = await POST(req);
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Data:", data);
  } catch (err) {
    console.error("Error:", err);
  }
}

test();
