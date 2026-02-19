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

export const skillScaffoldTool = {
    name: 'skill_scaffold',
    description: 'Scaffolds a new PRISM Skill (Lua) with AI-enhanced boilerplate. Returns the path of the created file.',
    schema: z.object({
        name: z.string().describe('The name of the skill (CamelCase, e.g., "VotingSystem").'),
        description: z.string().describe('A detailed description of what the skill should do.'),
        model_hint: z.string().optional().describe('Optional hint for the AI to include specific patterns (e.g., "Use JSON state").')
    }),
    handler: async ({ name, description, model_hint }) => {
        try {
            // 1. Read Template
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
                preview: fileContent.slice(0, 500) + "..."
            };

        } catch (error) {
            throw new Error(`Failed to scaffold skill: ${error.message}`);
        }
    }
};
