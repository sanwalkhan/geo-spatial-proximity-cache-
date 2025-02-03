import prometheus from 'prom-client';

// Create a Registry to register metrics
const register = new prometheus.Registry();

// Define metrics
const httpRequestDurationMicroseconds = new prometheus.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
});

const cacheHitCounter = new prometheus.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
});

const cacheMissCounter = new prometheus.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
});

const errorCounter = new prometheus.Counter({
  name: 'errors_total',
  help: 'Total number of errors',
  labelNames: ['type'],
});

// Register metrics
register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(cacheHitCounter);
register.registerMetric(cacheMissCounter);
register.registerMetric(errorCounter);

export const monitoringService = {
  register,
  
  recordRequestDuration(method, route, statusCode, duration) {
    httpRequestDurationMicroseconds
      .labels(method, route, statusCode)
      .observe(duration);
  },

  recordCacheHit() {
    cacheHitCounter.inc();
  },

  recordCacheMiss() {
    cacheMissCounter.inc();
  },

  recordError(type) {
    errorCounter.labels(type).inc();
  },

  // Middleware to track request duration
  requestDurationMiddleware(req, res, next) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      monitoringService.recordRequestDuration(
        req.method,
        req.route?.path || req.path,
        res.statusCode,
        duration
      );
    });
    next();
  },
};