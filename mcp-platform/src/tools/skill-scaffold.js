import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Paths
const TEMPLATE_PATH = path.resolve(__dirname, '../../lua/skills/template.lua');
const SNIPPETS_DIR = path.resolve(__dirname, '../../../docs/snippets');
const SKILLS_DIR = path.resolve(__dirname, '../../lua/skills');
const MARKETPLACE_PROCESSES_PATH = path.resolve(__dirname, '../../../data/marketplace/processes.json');

class StandaloneDependencyResolver {
  constructor(processes = []) {
    this.processes = new Map();
    for (const process of processes) {
      this.addProcess(process);
    }
  }

  addProcess(process) {
    this.processes.set(process.id, process);
  }

  resolve(processIdOrName, resolved = new Set(), unresolved = new Set()) {
    let process = this.processes.get(processIdOrName);
    
    if (!process) {
      for (const p of this.processes.values()) {
        if (p.name?.toLowerCase() === processIdOrName.toLowerCase()) {
          process = p;
          break;
        }
      }
    }
    
    if (!process) {
      return [];
    }
    
    const processId = process.id;
    
    if (unresolved.has(processId)) {
      return [];
    }

    unresolved.add(processId);
    const dependencies = [];
    
    for (const dep of (process.dependencies || [])) {
      if (resolved.has(dep.processId)) {
        continue;
      }
      const subDeps = this.resolve(dep.processId, resolved, unresolved);
      dependencies.push(...subDeps);
    }

    unresolved.delete(processId);
    resolved.add(processId);
    dependencies.push({
      id: process.id,
      name: process.name,
      version: process.version,
      code: process.code,
      dependencies: process.dependencies
    });
    
    return dependencies;
  }

  getProcess(idOrName) {
    for (const process of this.processes.values()) {
      if (process.id === idOrName || process.name?.toLowerCase() === idOrName.toLowerCase()) {
        return process;
      }
    }
    return null;
  }
}

let marketplaceResolver = null;

async function getMarketplaceResolver() {
  if (marketplaceResolver) return marketplaceResolver;
  
  try {
    const processesData = await fs.readFile(MARKETPLACE_PROCESSES_PATH, 'utf8');
    const processes = JSON.parse(processesData);
    marketplaceResolver = new StandaloneDependencyResolver(processes);
    return marketplaceResolver;
  } catch (e) {
    return null;
  }
}

export const skillScaffoldTool = {
    name: 'skill_scaffold',
    description: 'Scaffolds a new PRISM Skill (Lua) with AI-enhanced boilerplate. Returns the path of the created file.',
    schema: z.object({
        name: z.string().describe('The name of the skill (CamelCase, e.g., "VotingSystem").'),
        description: z.string().describe('A detailed description of what the skill should do.'),
        model_hint: z.string().optional().describe('Optional hint for the AI to include specific patterns (e.g., "Use JSON state").'),
        dependencies: z.array(z.string()).optional().describe('Optional list of Marketplace process IDs or names to include as dependencies.')
    }),
    handler: async ({ name, description, model_hint, dependencies }) => {
        try {
            // 1. Resolve Marketplace Dependencies
            let dependencyInfo = "";
            let resolvedDeps = [];
            
            if (dependencies && dependencies.length > 0) {
                const resolver = await getMarketplaceResolver();
                if (resolver) {
                    for (const depId of dependencies) {
                        const resolved = resolver.resolve(depId);
                        if (resolved.length > 0) {
                            resolvedDeps.push(...resolved);
                        }
                    }
                }
                
                if (resolvedDeps.length > 0) {
                    dependencyInfo = `\n-- MARKETPLACE DEPENDENCIES (Auto-included)\n`;
                    dependencyInfo += `-- Required: ${resolvedDeps.map(d => d.name).join(', ')}\n\n`;
                    
                    for (const dep of resolvedDeps) {
                        dependencyInfo += `-- Dependency: ${dep.name} (${dep.id})\n`;
                        if (dep.version) {
                            dependencyInfo += `--   Version: ${dep.version}\n`;
                        }
                        if (dep.dependencies && dep.dependencies.length > 0) {
                            dependencyInfo += `--   Sub-deps: ${dep.dependencies.map(d => d.processId || d.name).join(', ')}\n`;
                        }
                    }
                }
            }

            // 2. Read Template
            let template = await fs.readFile(TEMPLATE_PATH, 'utf8');

            // 2. Read RAG Snippets (Context for the Developer)
            let context = "-- AI CONTEXT: \n";
            try {
                const api = await fs.readFile(path.join(SNIPPETS_DIR, 'kernel_api.lua'), 'utf8');
                const bestPractices = await fs.readFile(path.join(SNIPPETS_DIR, 'best_practices.lua'), 'utf8');
                context += api + "\n" + bestPractices + "\n";
            } catch (e) {
                console.warn("Could not load RAG snippets:", e.message);
            }

            // 3. Simple Substitution (The "Dumb" Part)
            let code = template.replace('MySkill', name);
            code = code.replace('A description of what this skill does', description);
            code = code.replace('MyAction', name);

            // 4. Inject Context as Comments (The "Smart" Part)
            // We append the context at the bottom or top so the AI Agent (the user of this tool) 
            // has it handy when they decide to EDIT the file.

            // Actually, better pattern: 
            // If I am the AI calling this tool, I want to SEE the code I just created 
            // AND the snippets, so I can immediately call `replace_file_content` to finish the job.

            const fileContent = `--[[ 
  SKILL: ${name}
  DESC: ${description}
  HINT: ${model_hint || 'None'}
]]
${code}
${dependencyInfo}
-- ============================================================
-- RAG CONTEXT (Delete before production)
-- ============================================================
${context}
`;

            const fileName = `${name.toLowerCase()}.lua`;
            const filePath = path.resolve(SKILLS_DIR, fileName);

            // Ensure dir exists
            try { await fs.mkdir(SKILLS_DIR, { recursive: true }); } catch (e) { }

            await fs.writeFile(filePath, fileContent);

            return {
                status: "success",
                path: filePath,
                message: "Skill scaffolded. Please EDIT the file to implement logical requirements.",
                dependencies: resolvedDeps.map(d => ({ id: d.id, name: d.name, version: d.version })),
                preview: fileContent.slice(0, 500) + "..."
            };

        } catch (error) {
            throw new Error(`Failed to scaffold skill: ${error.message}`);
        }
    }
};
