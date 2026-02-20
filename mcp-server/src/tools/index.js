/**
 * tools/index.js
 * Tool registry for MCP Server Hub
 * Imports all 34 tools from mcp-platform and exports them as a registry
 */

// Import all tools from mcp-platform (using the centralized index)
import {
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
    gatewayConfigTool
} from '../../../mcp-platform/src/tools/index.js'

// Build the tool registry
export const toolRegistry = {
    // AO Core Operations
    'ao_spawn': aoSpawnTool,
    'ao_send': aoSendTool,
    'ao_dryrun': aoDryrunTool,
    'ao_eval': aoEvalTool,
    'ao_info': aoInfoTool,
    'ao_monitor': aoMonitorTool,
    
    // Token Operations
    'token_balance': tokenBalanceTool,
    'token_transfer': tokenTransferTool,
    'token_metadata': tokenMetadataTool,
    
    // DEX Operations
    'ao_dex_quote': aoDexQuoteTool,
    'ao_dex_swap': aoDexSwapTool,
    
    // Arweave Operations
    'arweave_query': arweaveQueryTool,
    'arweave_upload': arweaveUploadTool,
    'arweave_deploy_lua': arweaveDeployLuaTool,
    'arweave_id_update': arweaveIdUpdateTool,
    
    // Skills/Process Management
    'skills_list': skillsListTool,
    'skills_get': skillsGetTool,
    'skills_search': skillsSearchTool,
    'skills_register': skillsRegisterTool,
    'skills_execute': skillsExecuteTool,
    'skill_scaffold': skillScaffoldTool,
    
    // Memory Operations
    'memory_store': memoryStoreTool,
    'memory_retrieve': memoryRetrieveTool,
    'memory_list': memoryListTool,
    'memory_delete': memoryDeleteTool,
    
    // AI & Inference
    'ao_inference': aoInferenceTool,
    'ao_knowledge_query': aoKnowledgeQueryTool,
    
    // Social
    'social_post': socialPostTool,
    'social_feed': socialFeedTool,
    
    // Utilities
    'network_status': networkStatusTool,
    'gateway_config': gatewayConfigTool,
    'wallet_spawn': walletSpawnTool,
    'ao_cron_register': aoCronRegisterTool,
    'ao_ecosystem_search': aoEcosystemSearchTool
}

// Tool categories for organization
export const toolCategories = {
    'AO Core': ['ao_spawn', 'ao_send', 'ao_dryrun', 'ao_eval', 'ao_info', 'ao_monitor'],
    'Tokens': ['token_balance', 'token_transfer', 'token_metadata'],
    'DEX': ['ao_dex_quote', 'ao_dex_swap'],
    'Arweave': ['arweave_query', 'arweave_upload', 'arweave_deploy_lua', 'arweave_id_update'],
    'Skills': ['skills_list', 'skills_get', 'skills_search', 'skills_register', 'skills_execute', 'skill_scaffold'],
    'Memory': ['memory_store', 'memory_retrieve', 'memory_list', 'memory_delete'],
    'AI': ['ao_inference', 'ao_knowledge_query'],
    'Social': ['social_post', 'social_feed'],
    'Utilities': ['network_status', 'gateway_config', 'wallet_spawn', 'ao_cron_register', 'ao_ecosystem_search']
}

/**
 * Get a tool by name
 * @param {string} name - Tool name
 * @returns {object|undefined} The tool object or undefined
 */
export function getTool(name) {
    return toolRegistry[name]
}

/**
 * Get all tool names
 * @returns {string[]} Array of tool names
 */
export function getToolNames() {
    return Object.keys(toolRegistry)
}

/**
 * Get tools by category
 * @param {string} category - Category name
 * @returns {object[]} Array of tools in that category
 */
export function getToolsByCategory(category) {
    const names = toolCategories[category] || []
    return names.map(name => toolRegistry[name]).filter(Boolean)
}

/**
 * Search tools by name or description
 * @param {string} query - Search query
 * @returns {object[]} Array of matching tools
 */
export function searchTools(query) {
    const lowerQuery = query.toLowerCase()
    return Object.entries(toolRegistry)
        .filter(([name, tool]) => {
            return name.toLowerCase().includes(lowerQuery) ||
                   tool.description.toLowerCase().includes(lowerQuery)
        })
        .map(([name, tool]) => ({ name, ...tool }))
}

// Export count for verification
export const TOOL_COUNT = Object.keys(toolRegistry).length
