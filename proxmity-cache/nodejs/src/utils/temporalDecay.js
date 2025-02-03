class TemporalDecay {
    constructor(config = {
      decayFactor: 0.1,
      timeThreshold: 3600000, // 1 hour
      minimumPriority: 0.2
    }) {
      this.config = config;
    }
  
    calculatePriority(lastAccessTime, queryCount) {
      const timeDiff = Date.now() - lastAccessTime.getTime();
      const timeDecay = Math.exp(-this.config.decayFactor * (timeDiff / this.config.timeThreshold));
      const queryFactor = Math.log(queryCount + 1);
      
      const priority = timeDecay * queryFactor;
      return Math.max(priority, this.config.minimumPriority);
    }
  
    shouldEvict(priority) {
      return priority <= this.config.minimumPriority;
    }
  }
  
  module.exports = TemporalDecay;
  