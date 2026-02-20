/**
 * tools/index.js
 * Registers all MCP tools on the server.
 * Import and call registerTools(server) once during server setup.
 */

import { arweaveQueryTool } from './arweave-query.js'
import { aoDryrunTool } from './ao-dryrun.js'
import { aoSendTool } from './ao-send.js'
import { skillsListTool } from './skills-list.js'
import { skillsGetTool } from './skills-get.js'
import { skillsSearchTool } from './skills-search.js'
import { skillsRegisterTool } from './skills-register.js'
import { skillsExecuteTool } from './skills-execute.js'
import { memoryStoreTool } from './memory-store.js'
import { memoryRetrieveTool } from './memory-retrieve.js'
import { memoryListTool } from './memory-list.js'
import { memoryDeleteTool } from './memory-delete.js'
import { aoSpawnTool } from './ao-spawn.js'
import { aoEvalTool } from './ao-eval.js'
import { aoInfoTool } from './ao-info.js'
import { tokenBalanceTool } from './token-balance.js'
import { tokenTransferTool } from './token-transfer.js'
import { arweaveUploadTool } from './arweave-upload.js'
import { arweaveDeployLuaTool } from './arweave-deploy-lua.js'
import { aoMonitorTool } from './ao-monitor.js'
import { tokenMetadataTool } from './token-metadata.js'
import { arweaveIdUpdateTool } from './arweave-id-update.js'
import { networkStatusTool } from './network-status.js'
import { aoInferenceTool } from './ao-inference.js'
import { aoDexQuoteTool } from './ao-dex-quote.js'
import { aoDexSwapTool } from './ao-dex-swap.js'
import { aoCronRegisterTool } from './ao-cron-register.js'
import { aoEcosystemSearchTool } from './ao-ecosystem-search.js'
import { walletSpawnTool } from './wallet-spawn.js'
import { aoKnowledgeQueryTool } from './ao-knowledge-query.js'
import { skillScaffoldTool } from './skill-scaffold.js'

import { socialPostTool, socialFeedTool } from './social.js'
import { gatewayConfigTool } from './gateway-config.js'
import { aoTestTool } from './ao-test.js'
import { aoBridgeTool } from './ao-bridge.js'
import { aoAgentExecuteTool } from './ao-agent-execute.js'

// Export all tools individually for use by MCP Server Hub
export {
    arweaveQueryTool,
    aoDryrunTool,
    aoSendTool,
    skillsListTool,
    skillsGetTool,
    skillsSearchTool,
    skillsRegisterTool,
    skillsExecuteTool,
    memoryStoreTool,
    memoryRetrieveTool,
    memoryListTool,
    memoryDeleteTool,
    aoSpawnTool,
    aoEvalTool,
    aoInfoTool,
    tokenBalanceTool,
    tokenTransferTool,
    arweaveUploadTool,
    arweaveDeployLuaTool,
    aoMonitorTool,
    tokenMetadataTool,
    arweaveIdUpdateTool,
    networkStatusTool,
    aoInferenceTool,
    aoDexQuoteTool,
    aoDexSwapTool,
    aoCronRegisterTool,
    aoEcosystemSearchTool,
    walletSpawnTool,
    aoKnowledgeQueryTool,
    skillScaffoldTool,
    socialPostTool,
    socialFeedTool,
    gatewayConfigTool,
    aoTestTool,
    aoBridgeTool,
    aoAgentExecuteTool
}

const ALL_TOOLS = [
    socialPostTool,
    socialFeedTool,
    gatewayConfigTool,
    arweaveQueryTool,
    aoDryrunTool,
    aoSendTool,
    skillsListTool,
    skillsGetTool,
    skillsSearchTool,
    skillsRegisterTool,
    skillsExecuteTool,
    memoryStoreTool,
    memoryRetrieveTool,
    memoryListTool,
    memoryDeleteTool,
    aoSpawnTool,
    aoEvalTool,
    aoInfoTool,
    tokenBalanceTool,
    tokenTransferTool,
    arweaveUploadTool,
    arweaveDeployLuaTool,
    aoMonitorTool,
    tokenMetadataTool,
    arweaveIdUpdateTool,
    networkStatusTool,
    aoInferenceTool,
    aoDexQuoteTool,
    aoDexSwapTool,
    aoCronRegisterTool,
    aoEcosystemSearchTool,
    walletSpawnTool,
    aoKnowledgeQueryTool,
    skillScaffoldTool,
    aoTestTool,
    aoBridgeTool,
    aoAgentExecuteTool
]


/**
 * Register all tools on an McpServer instance.
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 */
export function registerTools(server) {
    for (const tool of ALL_TOOLS) {
        server.tool(tool.name, tool.description, tool.schema.shape, async (args) => {
            try {
                const data = await tool.handler(args)
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(data, null, 2),
                        },
                    ],
                }
            } catch (err) {
                return {
                    content: [
                        {
                            type: 'text',
                            text: `Error: ${err.message}`,
                        },
                    ],
                    isError: true,
                }
            }
        })
    }

    return ALL_TOOLS.map(t => t.name)
}

// Export the tools array for direct access
export { ALL_TOOLS }
