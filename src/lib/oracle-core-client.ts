import { execFile } from "child_process";
import path from "path";
import { config } from "./config";

let cachedProducer: any = null;

async function getKafkaProducer() {
  if (cachedProducer) return cachedProducer;
  try {
    const { Kafka } = require("kafkajs");
    const kafkaBootstrap = config.kafkaBootstrapServers;

    console.log(`[OracleCore] Connecting singleton Kafka producer to: ${kafkaBootstrap}`);
    const kafka = new Kafka({
      brokers: [kafkaBootstrap],
      connectionTimeout: 2000
    });

    const producer = kafka.producer();
    await producer.connect();
    cachedProducer = producer;
    return producer;
  } catch (err) {
    cachedProducer = null;
    throw err;
  }
}

/**
 * Triggers the Oracle Core pipeline for real-time indexing of meeting transcripts.
 * Publishes transcripts to a Kafka topic, or falls back to executing the Python ML script directly.
 */
export async function triggerOracleCoreIndexing(meetingId: string, transcript: string) {
  try {
    const producer = await getKafkaProducer();
    await producer.send({
      topic: "meeting-transcripts",
      messages: [{ value: JSON.stringify({ meetingId, transcript }) }],
    });
    console.log(`[OracleCore] Successfully published meeting ${meetingId} transcript to Kafka topic`);
  } catch (err: any) {
    console.warn(`[OracleCore] Kafka queue unavailable (${err.message}). Invoking Python pipeline directly...`);

    // Fallback: Invoke the background ML pipeline script directly on host
    const scriptPath = path.join(process.cwd(), "ai-agent-service/oracle_core_worker.py");
    // Validate meetingId to prevent command injection - only allow alphanumeric and hyphens
    if (!/^[a-z0-9\-]+$/i.test(meetingId)) {
      throw new Error(`Invalid meeting ID format: ${meetingId}`);
    }
    execFile("python", [scriptPath, "--meeting-id", meetingId], (error, stdout, stderr) => {
      if (error) {
        console.error(`[OracleCore] direct execution failed for meeting ${meetingId}:`, error);
        return;
      }
      if (stderr) {
        console.warn(`[OracleCore] direct execution warning:`, stderr);
      }
      console.log(`[OracleCore] direct execution completed successfully:\n`, stdout.trim());
    });
  }
}