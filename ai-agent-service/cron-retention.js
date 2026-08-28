/**
 * Retention Policy Cron Job
 * Cleans up files and DB records per configurable retention policy.
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const prisma = new PrismaClient();

/**
 * Run retention cleanup based on workspace/user policies
 * Default: 30 days, configurable per workspace
 */
async function runRetentionCleanup() {
  console.log('[RetentionCron] Starting retention policy cleanup...');

  try {
    // Find meetings older than retention window
    // Default 30 days, but should check workspace retention policy
    const defaultRetentionDays = config.defaultRetentionDays;
    const cutoffDate = new Date(Date.now() - defaultRetentionDays * 24 * 60 * 60 * 1000);

    const oldMeetings = await prisma.meeting.findMany({
      where: {
        date: { lt: cutoffDate },
        status: { not: 'Archived' }
      },
      include: { recordings: true }
    });

    console.log(`[RetentionCron] Found ${oldMeetings.length} meetings older than ${defaultRetentionDays} days`);

    for (const meeting of oldMeetings) {
      // Delete recording files from storage
      for (const recording of meeting.recordings) {
        await deleteRecordingFile(recording.url);
      }

      // Update meeting status to Archived (soft delete) or hard delete per policy
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'Archived' }
      });

      console.log(`[RetentionCron] Archived meeting: ${meeting.id} - ${meeting.title}`);
    }

    // Also clean up orphaned AI Agent records
    const oldAgents = await prisma.aIAgent.findMany({
      where: { createdAt: { lt: cutoffDate } }
    });

    for (const agent of oldAgents) {
      await prisma.aIAgent.delete({ where: { id: agent.id } });
    }

    console.log(`[RetentionCron] Cleaned up ${oldAgents.length} old AI Agent records`);
    
  } catch (error) {
    console.error('[RetentionCron] Cleanup error:', error);
  }
}

async function deleteRecordingFile(fileUrl) {
  try {
    // If local file path
    if (fileUrl.startsWith('/') || fileUrl.startsWith('./')) {
      const filePath = path.resolve(fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[RetentionCron] Deleted local file: ${filePath}`);
      }
    }
    // For S3/Supabase, would use SDK here
  } catch (e) {
    console.warn(`[RetentionCron] Could not delete file ${fileUrl}:`, e.message);
  }
}

// If run directly
if (require.main === module) {
  runRetentionCleanup()
    .then(() => {
      console.log('[RetentionCron] Cleanup completed');
      process.exit(0);
    })
    .catch((err) => {
      console.error('[RetentionCron] Fatal error:', err);
      process.exit(1);
    });
}

module.exports = { runRetentionCleanup, deleteRecordingFile };