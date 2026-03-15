/**
 * Interface for agent tools — capabilities that agents can invoke
 * during a debate (e.g., check timer, query vote state, research a claim).
 *
 * Tools are registered with the orchestrator and made available to agents
 * via their LLM provider's tool-use capabilities.
 */
export interface AgentTool {
  readonly name: string
  readonly description: string
  execute(params: Record<string, unknown>): Promise<AgentToolResult>
}

export interface AgentToolResult {
  success: boolean
  data: unknown
  error?: string
}
