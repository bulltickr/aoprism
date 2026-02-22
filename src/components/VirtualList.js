export class VirtualList {
    constructor(options = {}) {
        this.itemHeight = options.itemHeight || 100
        this.bufferSize = options.bufferSize || 5
        this.items = options.items || []
        this.renderItem = options.renderItem
        this.containerHeight = options.containerHeight || 600
        this.estimatedHeight = options.estimatedHeight || true
        this.heightMap = new Map()
        this.scrollTop = 0
    }

    setItems(items) {
        this.items = items
        this.heightMap.clear()
        this.totalHeight = this.calculateTotalHeight()
    }

    calculateTotalHeight() {
        if (!this.estimatedHeight) {
            return this.items.length * this.itemHeight
        }
        let total = 0
        for (let i = 0; i < this.items.length; i++) {
            total += this.heightMap.get(i) || this.itemHeight
        }
        return total || this.items.length * this.itemHeight
    }

    getVisibleRange(scrollTop) {
        this.scrollTop = scrollTop
        const startIndex = this.findStartIndex(scrollTop)
        const visibleHeight = this.containerHeight
        let endIndex = startIndex
        let accumulatedHeight = 0

        for (let i = startIndex; i < this.items.length; i++) {
            const itemHeight = this.heightMap.get(i) || this.itemHeight
            accumulatedHeight += itemHeight
            endIndex = i
            if (accumulatedHeight > visibleHeight + this.itemHeight * this.bufferSize) {
                break
            }
        }

        return {
            start: Math.max(0, startIndex - this.bufferSize),
            end: Math.min(this.items.length - 1, endIndex + this.bufferSize)
        }
    }

    findStartIndex(scrollTop) {
        let accumulatedHeight = 0
        for (let i = 0; i < this.items.length; i++) {
            const itemHeight = this.heightMap.get(i) || this.itemHeight
            if (accumulatedHeight + itemHeight > scrollTop) {
                return i
            }
            accumulatedHeight += itemHeight
        }
        return Math.max(0, this.items.length - 1)
    }

    getItemOffset(index) {
        let offset = 0
        for (let i = 0; i < index; i++) {
            offset += this.heightMap.get(i) || this.itemHeight
        }
        return offset
    }

    render(scrollTop = 0) {
        this.totalHeight = this.calculateTotalHeight()
        const { start, end } = this.getVisibleRange(scrollTop)
        
        let html = `<div class="virtual-list-inner" style="height: ${this.totalHeight}px; position: relative;">`
        
        for (let i = start; i <= end; i++) {
            const offset = this.getItemOffset(i)
            const itemHtml = this.renderItem(this.items[i], i)
            html += `<div class="virtual-list-item" data-index="${i}" style="position: absolute; top: ${offset}px; left: 0; right: 0;" data-offset="${offset}">${itemHtml}</div>`
        }
        
        html += `</div>`
        
        return {
            html,
            totalHeight: this.totalHeight,
            visibleCount: end - start + 1,
            totalCount: this.items.length
        }
    }

    updateItemHeight(index, height) {
        if (this.heightMap.get(index) !== height) {
            this.heightMap.set(index, height)
            this.totalHeight = this.calculateTotalHeight()
        }
    }
}

export function createVirtualScroll(containerId, options) {
    const virtualList = new VirtualList(options)
    const container = document.getElementById(containerId)
    
    if (!container) return null

    const scrollElement = container.querySelector('.scroll-container') || container

    const render = (items, renderFn) => {
        virtualList.setItems(items)
        virtualList.renderItem = renderFn
        
        const result = virtualList.render(scrollElement.scrollTop)
        container.innerHTML = result.html
        
        requestAnimationFrame(() => {
            container.querySelectorAll('.virtual-list-item').forEach(el => {
                const index = parseInt(el.dataset.index, 10)
                const height = el.getBoundingClientRect().height
                if (height > 0) {
                    virtualList.updateItemHeight(index, height)
                }
            })
            
            const newResult = virtualList.render(scrollElement.scrollTop)
            container.innerHTML = newResult.html
        })
    }

    scrollElement.addEventListener('scroll', () => {
        const scrollTop = scrollElement.scrollTop
        const result = virtualList.render(scrollTop)
        container.querySelector('.virtual-list-inner').style.height = `${result.totalHeight}px`
        
        container.querySelectorAll('.virtual-list-item').forEach(el => {
            const index = parseInt(el.dataset.index, 10)
            const height = el.getBoundingClientRect().height
            if (height > 0 && height !== virtualList.heightMap.get(index)) {
                virtualList.updateItemHeight(index, height)
                const newResult = virtualList.render(scrollElement.scrollTop)
                container.querySelector('.virtual-list-inner').style.height = `${newResult.totalHeight}px`
            }
        })
    }, { passive: true })

    return { virtualList, render }
}

export default VirtualList
