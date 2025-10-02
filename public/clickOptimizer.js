// Click optimizer and batch processor
class ClickOptimizer {
    constructor(batchSize = 10, batchDelay = 100) {
        this.clickQueue = [];
        this.batchSize = batchSize;
        this.batchDelay = batchDelay;
        this.processingBatch = false;
        this.lastClickTime = 0;
        this.clickCount = 0;
        this.pendingBatch = null;
    }

    // Add click to queue
    addClick() {
        const now = performance.now();
        this.clickCount++;
        
        // Add to queue
        this.clickQueue.push({
            timestamp: now,
            count: 1
        });

        // Process batch if we've reached batch size
        if (this.clickQueue.length >= this.batchSize) {
            this.processBatch();
        } else if (!this.pendingBatch) {
            // Set up delayed batch processing
            this.pendingBatch = setTimeout(() => this.processBatch(), this.batchDelay);
        }

        // Return local click count immediately for UI feedback
        return this.clickCount;
    }

    // Process batch of clicks
    async processBatch() {
        if (this.processingBatch || this.clickQueue.length === 0) return;
        
        this.processingBatch = true;
        if (this.pendingBatch) {
            clearTimeout(this.pendingBatch);
            this.pendingBatch = null;
        }

        // Combine all clicks in queue
        const batchClicks = this.clickQueue.reduce((sum, click) => sum + click.count, 0);
        this.clickQueue = [];

        try {
            // Send batch to server
            const response = await fetch('/click', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ clicks: batchClicks })
            });

            if (!response.ok) {
                throw new Error('Click processing failed');
            }

            // Process response
            const data = await response.json();
            this.processingBatch = false;

            // Schedule next batch if needed
            if (this.clickQueue.length > 0) {
                this.processBatch();
            }

            return data;
        } catch (error) {
            console.error('Error processing clicks:', error);
            // Requeue failed clicks
            this.clickQueue.unshift({ timestamp: performance.now(), count: batchClicks });
            this.processingBatch = false;
            
            // Retry after delay
            setTimeout(() => this.processBatch(), 1000);
        }
    }

    // Get click rate (clicks per second)
    getClickRate() {
        const now = performance.now();
        const recentClicks = this.clickQueue.filter(click => now - click.timestamp < 1000);
        return recentClicks.reduce((sum, click) => sum + click.count, 0);
    }
}

// Create click sound pool for better performance
class SoundPool {
    constructor(soundUrl, poolSize = 10) {
        this.sounds = [];
        this.currentIndex = 0;
        
        // Create audio pool
        for (let i = 0; i < poolSize; i++) {
            const audio = new Audio(soundUrl);
            audio.preload = 'auto';
            this.sounds.push(audio);
        }
    }

    play() {
        // Get next sound in pool
        const sound = this.sounds[this.currentIndex];
        
        // Reset and play
        sound.currentTime = 0;
        sound.volume = 0.5;
        
        // Use Promise to handle play
        const playPromise = sound.play();
        if (playPromise !== undefined) {
            playPromise.catch(error => {
                console.log('Sound play failed:', error);
            });
        }

        // Move to next sound in pool
        this.currentIndex = (this.currentIndex + 1) % this.sounds.length;
    }
}

// Export instances
export const clickOptimizer = new ClickOptimizer();
export const soundPool = new SoundPool('wolol.mp3');