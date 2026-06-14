import client from "prom-client";

// Collect default system/process metrics (CPU, Memory, event loop lag, etc.)
client.collectDefaultMetrics({ register: client.register });

// Metric for HTTP request volume
const httpRequestsTotal = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status_code"],
});

// Metric for HTTP request latency
const httpRequestDurationSeconds = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status_code"],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // Buckets in seconds
});

/**
 * Middleware to collect and track request metrics
 */
export const metricsMiddleware = (req, res, next) => {
  const start = process.hrtime();

  res.on("finish", () => {
    // Exclude /metrics and /health from request latency tracking
    if (req.path === "/metrics" || req.path === "/health") {
      return;
    }

    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    const durationInMs = durationInSeconds * 1000;

    // Standardize route to prevent cardinality explosion (e.g. /api/employee/:id)
    const route = (req.baseUrl || "") + (req.route ? req.route.path : req.path);

    // Record metrics
    httpRequestsTotal.labels(req.method, route, res.statusCode).inc();
    httpRequestDurationSeconds.labels(req.method, route, res.statusCode).observe(durationInSeconds);

    // Format metrics log for PM2
    console.log(`[PM2-Metrics] ${req.method} ${route} ${res.statusCode} - ${durationInMs.toFixed(2)}ms`);
  });

  next();
};

/**
 * Controller to expose metrics to Prometheus
 */
export const metricsEndpoint = async (req, res) => {
  try {
    res.set("Content-Type", client.register.contentType);
    res.end(await client.register.metrics());
  } catch (error) {
    console.error("❌ Error generating metrics:", error);
    res.status(500).send(error.message);
  }
};
