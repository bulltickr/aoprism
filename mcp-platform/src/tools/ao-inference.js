/**
 * Tool: ao_inference
 * Run AI inference on AO (Llama-AO).
 */

import { z } from 'zod'
import { aoSend } from '../ao-client.js'

export const aoInferenceTool = {
    name: 'ao_inference',
    description: 'Run AI inference queries against on-chain model processes (e.g. Llama-AO).',
    schema: z.object({
        modelProcess: z.string().describe('The AO process ID of the AI model'),
        prompt: z.string().describe('The text prompt for inference'),
        temperature: z.number().optional().default(0.7).describe('Sampling temperature')
    }),
    async handler({ modelProcess, prompt, temperature }) {
        try {
            const result = await aoSend({
                process: modelProcess,
                tags: [
                    { name: 'Action', value: 'Inference' },
                    { name: 'Temperature', value: String(temperature) }
                ],
                data: prompt
            })

            // Extract inference response with defensive checks
            const messages = result.result?.Messages || []
            const responseMsg = messages.find(m =>
                m.Tags?.some(t => t.name === 'Action' && t.value === 'InferenceResponse')
            )

            const responseData = responseMsg?.Data || (messages.length > 0 ? messages[0].Data : null)

            return {
                status: 'success',
                response: responseData || 'Inference completed. No text returned from model.',
                messageId: result.messageId,
                details: result.result
            }
        } catch (e) {
            console.error(`[ao_inference] Error: ${e.message}`, e)
            throw new Error(`AI Inference failed: ${e.message}`)
        }
    }
}
