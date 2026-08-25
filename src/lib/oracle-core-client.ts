import { exec } from "child_process";
import path from "path";

/**
 * Triggers the Oracle Core pipeline for real-time indexing of meeting transcripts.
 * Publishes transcripts to a Kafka topic, or falls back to executing the Python ML script directly.
 */
export async function triggerOracleCoreIndexing(meetingId: string, transcript: string) {
  try {
    // Attempt to publish to Kafka message queue
    const { Kafka } = require("kafkajs");
    const kafkaBootstrap = process.env.KAFKA_BOOTSTRAP_SERVERS || "localhost:9092";
    
    console.log(`[OracleCore] Connecting to Kafka brokers at: ${kafkaBootstrap}`);
    const kafka = new Kafka({ 
      brokers: [kafkaBootstrap],
      connectionTimeout: 2000 
    });
    
    const producer = kafka.producer();
    await producer.connect();
    await producer.send({
      topic: "meeting-transcripts",
      messages: [{ value: JSON.stringify({ meetingId, transcript }) }],
    });
    await producer.disconnect();
    console.log(`[OracleCore] Successfully published meeting ${meetingId} transcript to Kafka topic`);
  } catch (err: any) {
    console.warn(`[OracleCore] Kafka queue unavailable (${err.message}). Invoking Python pipeline directly...`);
    
    // Fallback: Invoke the background ML pipeline script directly on host
    const scriptPath = path.join(process.cwd(), "ai-agent-service/oracle_core_worker.py");
    exec(`python "${scriptPath}" --meeting-id "${meetingId}"`, (error, stdout, stderr) => {
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
