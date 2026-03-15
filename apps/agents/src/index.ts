// Debate engine
export { DebateOrchestrator, type DebateOrchestratorConfig, type TurnResult, type DebateCompleteSummary } from './debate/orchestrator.js'
export { AgentRunner } from './debate/agent-runner.js'
export { ModeratorRunner, type ModeratorParticipant } from './debate/moderator-runner.js'

// LLM providers
export { getLLMProvider } from './llm/index.js'
export type { LLMProvider, LLMMessage, LLMCompletionRequest, LLMCompletionResponse } from './llm/types.js'

// Services
export { DebateStateManager, type DebateParticipantInfo, type DebateSummary } from './services/debate-state.js'
export { persistTurn, extractClaimTier, buildRoundSummary } from './services/turn-persistence.js'

// Tools
export type { AgentTool, AgentToolResult } from './tools/types.js'
export { DebateTimerTool } from './tools/debate-timer.js'
export { VoteStateTool } from './tools/vote-state.js'

// Voice
export type { VoiceProvider, Voice, SynthesisResult } from './voice/types.js'
export { PlaceholderVoiceProvider } from './voice/placeholder-provider.js'

// Prompt builders
export {
  buildOpeningPrompt,
  buildRebuttalPrompt,
  buildPressurePrompt,
  buildClosingPrompt,
  formatTurnsAsContext,
  buildContextUpdate,
  type TurnRecord,
} from './debate/turn-prompt-builder.js'

/**
 * Quick-start: run a debate from the command line.
 *
 *   DEBATE_ID=<uuid> pnpm --filter @bipi/agents dev
 */
async function main() {
  const debateId = process.env.DEBATE_ID
  if (!debateId) {
    console.log('Bipi Agent Worker Service')
    console.log('Set DEBATE_ID env var to run a debate, or import DebateOrchestrator programmatically.')
    return
  }

  console.log(`Starting debate: ${debateId}`)

  const { DebateOrchestrator: Orchestrator } = await import('./debate/orchestrator.js')
  const orchestrator = new Orchestrator({
    debateId,
    onTurnComplete: (turn) => {
      const label = turn.isModerator ? '[MOD]' : `[${turn.archetype.toUpperCase()}]`
      console.log(`\n${label} ${turn.speakerName}:`)
      console.log(turn.transcript)
      console.log('---')
    },
    onRoundComplete: (phase, summary) => {
      console.log(`\n=== ${phase.toUpperCase()} ROUND COMPLETE ===`)
      console.log(summary)
    },
    onDebateComplete: (summary) => {
      console.log('\n========== DEBATE COMPLETE ==========')
      console.log(`Turns: ${summary.totalTurns}`)
      console.log(`Rounds: ${summary.roundsCompleted}`)
      console.log(`Duration: ${(summary.durationMs / 1000).toFixed(1)}s`)
      console.log('Airtime:', summary.airtimeByAgent)
    },
  })

  await orchestrator.initialize()
  await orchestrator.run()
}

// Run if executed directly
const isDirectRun = process.argv[1]?.endsWith('index.ts') || process.argv[1]?.endsWith('index.js')
if (isDirectRun) {
  main().catch((err) => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
}
