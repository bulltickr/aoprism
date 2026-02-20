import { describe, it, expect } from 'vitest'
import { generateOperationBlockies, Blockies } from '../utils/OperationBlockies.js'

describe('Operation Blockies', () => {
    it('should generate consistent blockies for same operation', () => {
        const operation = {
            action: 'Transfer',
            process: '0x123...',
            amount: '100'
        }
        
        const blockies1 = generateOperationBlockies(operation)
        const blockies2 = generateOperationBlockies(operation)
        
        // Should have same color
        expect(blockies1.color).toBe(blockies2.color)
        // Should have same pattern
        expect(blockies1.pattern).toEqual(blockies2.pattern)
    })

    it('should generate different blockies for different operations', () => {
        const op1 = { action: 'Transfer', amount: '100' }
        const op2 = { action: 'Transfer', amount: '200' }
        
        const blockies1 = generateOperationBlockies(op1)
        const blockies2 = generateOperationBlockies(op2)
        
        // Should have different patterns
        expect(blockies1.pattern).not.toEqual(blockies2.pattern)
    })

    it('should generate valid SVG', () => {
        const operation = { action: 'Test' }
        const blockies = generateOperationBlockies(operation)
        
        const svg = blockies.toSVG(4)
        
        expect(svg).toContain('<svg')
        expect(svg).toContain('</svg>')
        expect(svg).toContain('rect')
        expect(svg).toContain(blockies.color)
    })

    it('should generate canvas renderable output', () => {
        const operation = { action: 'Test' }
        const blockies = generateOperationBlockies(operation)
        
        // Mock canvas
        const mockCanvas = {
            getContext: () => ({
                fillRect: vi.fn(),
                fillStyle: ''
            }),
            width: 0,
            height: 0
        }
        
        blockies.render(mockCanvas, 4)
        
        expect(mockCanvas.width).toBeGreaterThan(0)
        expect(mockCanvas.height).toBeGreaterThan(0)
    })
})
