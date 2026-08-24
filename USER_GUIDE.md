# Innovexa Ops Console — User & Operational Guide

A complete step-by-step operational guide for team leaders, department managers, and participants using the Innovexa Ops Console.

---

## 🤖 1. Autonomous AI Meeting Agent Overview

The Innovexa AI Meeting Agent connects to meeting rooms, records high-fidelity audio streams, transcribes diarized speech using Whisper ASR, and extracts GPT-4 summaries and action items.

### AI Agent Status Indicators
- **`AGENT IDLE`**: Agent is ready to be triggered.
- **`JOINING MEETING`**: Virtual participant connecting to Zoom / Google Meet room.
- **`RECORDING AUDIO`**: Audio stream active (glowing `#FF00AA` pulsing indicator).
- **`WHISPER ASR TRANSCRIBING`**: Live transcript diarization in progress.
- **`GPT-4 SUMMARIZING`**: AI extracting key decisions, action items, and takeaways.
- **`AGENT COMPLETED`**: Summary generated and persisted to database.

### How to Trigger the AI Agent (Organizer Only)
1. Navigate to any meeting detail view (`/meetings/[id]`).
2. Located at the top of the page is the **Cyberpunk Purple AI Meeting Agent Panel**.
3. Click the **JOIN MEETING** button.
4. Watch real-time status transitions and live caption feeds as the AI Agent processes the meeting.

---

## 🔑 2. Logging In & Understanding Roles

Navigate to `http://localhost:3000/login` in your web browser.

### Credentials Summary

| Role | Username | Password | Operational Capabilities |
|---|---|---|---|
| **Organizer** | `organizer` | `admin123` | **Full Admin Access**: Trigger AI Agent, ingest meetings, delete meetings, re-assign tasks, update deadlines, trigger SLA escalation audit |
| **Participant** | `participant` | `user123` | **Read-Only Access**: View dashboard, review meeting transcripts, inspect AI Agent live feeds, inspect task board, perform semantic search, view analytics charts |

---

## 📹 3. Meeting Ingestion & Diarized Memory (`/meetings`)

### How to Ingest a New Meeting Transcript
1. Click **Meetings** in top navigation.
2. In the **Ingest New Meeting** form, enter title, department, agenda, objectives, and raw transcript text.
3. Click **INGEST & EXTRACT WITH AI**.

### Deleting a Meeting (Organizer Only)
1. Navigate to `/meetings`.
2. Locate the meeting card you wish to remove and click **DELETE MEETING**.
3. Confirm cascading deletion in the Cyberpunk Confirmation Modal.

---

## 📋 4. Task SLA Board & Task Assignment (`/tasks`)

### Assigning Tasks
1. On `/tasks`, locate the task card.
2. Select a team member from the **Assignee Dropdown** selector.

---

## 📹 5. Audio Recording & Playback

The Innovexa Ops Console enables real-time browser-based recording and audio file uploads to preserve meeting memories.

### Recording Meetings (Organizer Only)
1. Navigate to `/meetings/[id]`.
2. Locate the **Meeting Audio Recordings** panel.
3. Click **START LIVE RECORDING** (grant mic permission if prompted).
4. Use **Pause** and **Resume** buttons to manage breaks during the recording.
5. Click **Stop & Upload** to finish the recording. The browser will automatically downsample/compress the audio and upload it to S3/Supabase/local storage.

### Uploading Audio Files (Organizer Only)
1. In the **Upload Audio File** sub-panel, drag and drop `.mp3` or `.wav` audio files into the dashed dropzone, or click the zone to browse files manually.
2. The cyberpunk progress bar will indicate the active upload percentage.

### Playing Back Recordings
- All users (organizers and participants) can listen to uploaded meeting recordings directly in the **Meeting Audio Recordings** panel using the custom media playback player.

