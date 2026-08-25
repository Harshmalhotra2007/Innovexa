# Innovexa AI Agent - Operations Runbook

> **Purpose**: Emergency procedures, troubleshooting guides, and operational playbooks for the AI Meeting Agent system.

---

## 🚨 Emergency Shutdown Procedures

### 1. Immediate Bot Stop (Single Meeting)
```bash
# Find the meeting's agent process
kubectl get pods -l app=ai-agent

# Delete specific agent pod (will restart via deployment)
kubectl delete pod <ai-agent-pod-name>
```

### 2. Full Service Shutdown
```bash
# Scale all agent deployments to 0
kubectl scale deployment ai-agent --replicas=0
kubectl scale deployment whisper-worker --replicas=0
kubectl scale deployment llama-worker --replicas=0
```

### 3. Emergency Data Wipe (GDPR/Compliance)
```bash
# Delete all recordings and transcripts for a user/workspace
# Run via admin API or direct DB:
# DELETE FROM "Recording" WHERE "meetingId" IN (SELECT id FROM "Meeting" WHERE "department" = 'TARGET_DEPT');
# UPDATE "Meeting" SET "transcript" = NULL, "status" = 'Wiped' WHERE "department" = 'TARGET_DEPT';
```

---

## 🔧 Troubleshooting Guides

### Bot Join Failures

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Bot stuck in lobby | Host hasn't admitted | Check lobby timeout config; verify host permissions |
| "Join now" button not found | Google Meet UI changed | Update `meet-bot.js` selectors; check [selectors.md](selectors.md) |
| Audio capture empty | Browser permissions / fake media stream | Verify `--use-fake-ui-for-media-stream` flag; check Chrome version |
| Bot kicked immediately | Detection heuristic triggered | Verify bot name/avatar; reduce join speed; check consent announcement timing |

**Debug Commands:**
```bash
# View agent logs
kubectl logs -l app=ai-agent --tail=100 -f

# Check browser console (if running locally)
# In meet-bot.js, add: page.on('console', msg => console.log('BROWSER:', msg.text()))
```

### Transcription Issues

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Whisper returns empty | Audio format mismatch | Ensure 16kHz mono WAV; check `ffmpeg` downsampling |
| GPU OOM on Whisper | Model too large for VRAM | Use smaller model (tiny.en); reduce batch size |
| Diarization wrong speakers | PyAnnote auth token missing | Set `HF_AUTH_TOKEN` env var; verify HuggingFace access |

**Debug Commands:**
```bash
# Test Whisper directly
kubectl exec -it <whisper-pod> -- whisper-cli -m /models/ggml-base.en.bin -f /test.wav

# Check queue depth
redis-cli LLEN transcription_queue
```

### Summarization Issues

| Symptom | Likely Cause | Resolution |
|---|---|---|
| Llama returns gibberish | Prompt format wrong | Verify chat template matches model (Llama-2 vs Llama-3) |
| Action items not extracted | Regex pattern mismatch | Update `summarizer-llama.js` parse logic |
| Slow generation | No GPU / large context | Enable GPU; reduce context window; use quantized model |

---

## 🔄 Kick/Crash Recovery Procedures

### Scenario: Bot Kicked from Meeting

1. **Resilience Handler triggers** (in `resilience-handler.js`):
   - Detects disconnect via WebSocket close or Playwright error
   - Attempts reconnect up to `maxRetries` (default: 3)
   - Waits `retryDelayMs` (default: 5s) between attempts

2. **If reconnect succeeds**:
   - Resume audio capture from interruption point
   - Log gap in transcript
   - Continue processing

3. **If all retries exhausted**:
   - Flush partial audio to storage (encrypted)
   - Update `AIAgent` status to `partial` with `recordingUrl`
   - Trigger transcription on available audio
   - Notify via WebSocket: `{ status: 'partial', reason: 'kicked', recordingUrl: '...' }`

### Scenario: Playwright Browser Crash

1. **Detection**: Unhandled rejection or process exit in `runMeetBot`
2. **Recovery**: Resilience handler catches error, initiates retry with new browser context
3. **Data Preservation**: Any recorded audio in `/app/public/recordings/<meetingId>/` is preserved
4. **Manual Override**: If auto-recovery fails, operator can:
   ```bash
   # Manual join with existing meeting ID
   node -e "require('./meet-bot').runMeetBot('<MEET_URL>', 3600000, '/app/public/recordings/<MEETING_ID>/raw_recording.wav')"
   ```

### Scenario: Lobby Timeout (Host never admits)

1. **Config**: `LOBBY_TIMEOUT_MS` (default: 60000)
2. **Action**: Bot leaves, marks meeting `status: 'lobby_timeout'`
3. **Retry**: Calendar monitor will re-queue for next occurrence (if recurring)

---

## 📊 Monitoring & Alerting

### Key Metrics to Watch

| Metric | Normal Range | Alert Threshold |
|---|---|---|
| `ai_agent_active_meetings` | 0-50 | > 100 |
| `transcription_queue_depth` | 0-10 | > 20 |
| `summarization_queue_depth` | 0-5 | > 10 |
| `whisper_gpu_memory_used` | < 6GB | > 7GB |
| `llama_gpu_memory_used` | < 6GB | > 7GB |
| `bot_join_success_rate` | > 95% | < 90% |
| `recording_duration_avg` | ~ meeting duration | < 50% of expected |

### Dashboard Queries (Prometheus)
```promql
# Bot join success rate
rate(ai_agent_join_success_total[5m]) / rate(ai_agent_join_attempts_total[5m])

# Queue depth per worker
redis_queue_depth{queue="transcription"} / count(kube_pod_info{app="whisper-worker"})

# Average transcription latency
histogram_quantile(0.95, rate(whisper_transcription_duration_seconds_bucket[5m]))
```

---

## 🛠️ Manual Join Override

When automated bot fails, operators can manually trigger a join:

```bash
# 1. Get meeting URL from database
kubectl exec -it <postgres-pod> -- psql -U postgres -d Innovexa -c "SELECT agenda FROM meeting WHERE id='<MEETING_ID>'"

# 2. Run bot manually (in agent pod)
kubectl exec -it <ai-agent-pod> -- node -e "
  const { runMeetBot } = require('./meet-bot');
  runMeetBot('<MEET_URL>', 3600000, '/app/public/recordings/<MEETING_ID>/manual_recording.wav')
    .then(() => console.log('Done'))
    .catch(console.error);
"

# 3. Trigger transcription manually
curl -X POST http://whisper-worker:8082/transcribe \
  -H "Content-Type: application/json" \
  -d '{"audio_path": "/app/public/recordings/<MEETING_ID>/manual_recording.wav", "meeting_id": "<MEETING_ID>"}'
```

---

## 📞 Escalation Contacts

| Issue Type | Primary | Secondary |
|---|---|---|
| Bot join failures | Platform Engineer | ML Engineer |
| Transcription quality | ML Engineer | Platform Engineer |
| Data privacy / compliance | Legal / DPO | Security Engineer |
| Infrastructure / scaling | Platform Engineer | SRE |
| Google Meet API changes | Platform Engineer | Product Manager |

---

## 📝 Post-Incident Checklist

After any production incident:
1. [ ] Document timeline in incident tracker
2. [ ] Collect relevant logs (kubectl, Redis, PostgreSQL)
3. [ ] Identify root cause (5 Whys)
4. [ ] Create action items for prevention
5. [ ] Update runbook if new failure mode discovered
6. [ ] Run regression test for the fixed scenario

---

*Last Updated: $(date)
*Version: 1.0
*Owner: Platform Engineering