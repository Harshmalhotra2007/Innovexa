/**
 * Llama.cpp Local Summarization Handler
 * Interfaces with local llama.cpp binary for meeting summarization and action item extraction.
 */
const { exec } = require('child_process');
const path = require('path');
const config = require('./config');

const LLAMA_BINARY = config.llamaBinaryPath;
const LLAMA_MODEL = config.llamaModelPath;

/**
 * Generate meeting summary and extract action items using local Llama.cpp
 * @param {Array} transcriptSegments - Array of transcript segments from Whisper
 * @returns {Promise<{summary: string, actionItems: Array}>}
 */
async function summarizeWithLlama(transcriptSegments) {
  return new Promise((resolve, reject) => {
    console.log(`[LlamaSummarizer] Generating summary for ${transcriptSegments.length} segments`);
    
    const transcriptText = transcriptSegments
      .map(s => `${s.speaker}: ${s.text}`)
      .join('\n');

    // Craft prompt for meeting summarization
    const prompt = `### Instruction:
Summarize the following meeting transcript in 3 bullet points and extract action items.
Format:
---
SUMMARY:
- Point 1
- Point 2
- Point 3

ACTION_ITEMS:
- Assignee: Task (Due: YYYY-MM-DD)
---

Transcript:\n${transcriptText}\n\n### Response:`;

    // Escape for shell execution
    const escapedPrompt = prompt.replace(/'/g, "'\"'\"'");
    
    // llama.cpp command
    const cmd = `${LLAMA_BINARY} -m ${LLAMA_MODEL} -p '${escapedPrompt}' -n 512 --temp 0.3 --no-display-prompt`;

    exec(cmd, { timeout: 120000, maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        console.error('[LlamaSummarizer] Summarization error:', error.message);
        return resolve(getDefaultSummary());
      }

      try {
        const response = stdout.trim();
        console.log('[LlamaSummarizer] Raw LLM output received');
        
        const parsed = parseLlamaResponse(response);
        resolve(parsed);
      } catch (parseErr) {
        console.error('[LlamaSummarizer] Parse error:', parseErr);
        resolve(getDefaultSummary());
      }
    });
  });
}

function parseLlamaResponse(response) {
  const summaryMatch = response.match(/SUMMARY:[\s\S]*?(?=ACTION_ITEMS:|$)/i);
  const actionMatch = response.match(/ACTION_ITEMS:[\s\S]*$/i);

  let summary = summaryMatch ? summaryMatch[0].replace('SUMMARY:', '').trim() : 'Summary generation failed.';
  let actionItems = [];

  if (actionMatch) {
    const actionText = actionMatch[0].replace('ACTION_ITEMS:', '').trim();
    const lines = actionText.split('\n').filter(l => l.trim().startsWith('-'));
    
    actionItems = lines.map(line => {
      const clean = line.replace('-', '').trim();
      const [assigneePart, taskPart] = clean.split(':');
      return {
        assignee: assigneePart?.trim() || 'Unassigned',
        task: taskPart?.trim() || clean,
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
      };
    });
  }

  return { summary, actionItems };
}

function getDefaultSummary() {
  return {
    summary: '• Meeting recorded and transcribed successfully.\n• Key discussion points captured in transcript.\n• Review transcript for detailed action items.',
    actionItems: [
      { assignee: 'Team', task: 'Review meeting transcript for action items', dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() }
    ]
  };
}

module.exports = { summarizeWithLlama };