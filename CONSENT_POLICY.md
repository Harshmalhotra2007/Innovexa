# Innovexa Consent Policy

## Jurisdiction-Aware Guidance

This document provides workspace administrators with guidance on configuring consent requirements based on target region.

---

## Consent Types

### One-Party Consent (Single Consent Required)

**Applicable Regions**: Most US states (e.g., California requires all-party, but many others allow one-party)

**Configuration**:
```yaml
workspace_consent:
  type: one_party
  default_recording: enabled
  opt_out_command: "Innovexa leave"
  notification: "An AI agent is recording this meeting for notes."
```

### All-Party Consent (Explicit Consent Required)

**Applicable Regions**: California (US), EU countries under GDPR with recording, Canada (PIPEDA), Australia

**Configuration**:
```yaml
workspace_consent:
  type: all_party
  default_recording: disabled  # Must be explicitly enabled per meeting
  opt_in_required: true
  opt_in_method: chat_command  # Participants type "Innovexa start"
  notification: "This meeting requires all participants to consent before recording begins."
```

---

## Workspace Admin Settings

In the admin dashboard:

1. Navigate to **Workspace Settings > Compliance > Consent Policy**
2. Select jurisdiction from dropdown (maps to legal framework)
3. Configure:
   - Default recording behavior
   - Notification template
   - Opt-in/opt-out mechanism
   - Audit log retention (default: 365 days)

---

## Participant Experience

### Before Recording Begins
```
[Innovexa Notetaker] has joined.
Recording will begin after consent verification.
```

### During Recording
```
[Innovexa Notetaker] is recording and transcribing.
Type "Innovexa stop" to end recording.
```

### Audit Log Entry (per meeting)
```json
{
  "meeting_id": "uuid",
  "consent_status": "consented",
  "consent_events": [
    { "timestamp": "...", "action": "bot_joined", "bot_name": "Innovexa Notetaker" },
    { "timestamp": "...", "action": "announcement_posted", "channel": "chat" },
    { "timestamp": "...", "action": "recording_started", "jurisdiction": "EU" },
    { "timestamp": "...", "action": "recording_stopped", "reason": "meeting_ended" }
  ],
  "participants": ["alice@company.com", "bob@company.com"],
  "workspace_id": "..."
}
```

---

## Legal Posture

- The bot is **explicitly disclosed** with a visible identity (name/avatar)
- The bot is **not covert or stealth** — it announces its presence
- All consent events are logged for audit
- Workspace admins configure jurisdiction-appropriate settings
- Participants can opt out or request removal at any time

---

## References

- GDPR Article 6 (Lawfulness of processing) — recording as legitimate interest with disclosure
- California Penal Code §632 (All-party consent for confidential communications)
- Workplace privacy best practices: visible disclosure + opt-out mechanism
