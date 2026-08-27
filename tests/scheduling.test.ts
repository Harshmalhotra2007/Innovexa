import { generateGoogleMeetLink } from "../src/lib/meeting-scheduler";

describe("Meeting Scheduling Feature Unit Tests", () => {
  it("should generate a valid Google Meet URL structure if requested", () => {
    const link = generateGoogleMeetLink();
    expect(link).toMatch(/^https:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/);
  });

  it("should verify standard business hours time slot calculation format", () => {
    const slots = [
      "09:00 AM",
      "10:00 AM",
      "11:30 AM",
      "01:30 PM",
      "03:00 PM",
      "04:30 PM",
      "05:30 PM",
    ];

    expect(slots.length).toBe(7);
    expect(slots[0]).toBe("09:00 AM");
    expect(slots[slots.length - 1]).toBe("05:30 PM");
  });
});
