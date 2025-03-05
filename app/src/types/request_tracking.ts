import { z } from "zod";

// RequestMetric schema
export const RequestMetricSchema = z.object({
  timestamp: z.string().datetime(), // datetime will be serialized as ISO string
  status_code: z.number().int(),
  path: z.string(),
  method: z.string(),
  client_ip: z.string(),
  is_rate_limited: z.boolean().default(false),
});

// RouteMetrics schema
export const RouteMetricsSchema = z.object({
  total_requests: z.number().int(),
  success_count: z.number().int(),
  error_count: z.number().int(),
  rate_limited_count: z.number().int(),
  status_codes: z.record(z.string(), z.number().int()), // Dict[str, int]
  recent_requests: z.array(RequestMetricSchema),
});

// RequestTrackingResponse schema
export const RequestTrackingResponseSchema = z.object({
  routes: z.record(z.string(), RouteMetricsSchema),
});

// TypeScript types inferred from the schemas
export type RequestMetric = z.infer<typeof RequestMetricSchema>;
export type RouteMetrics = z.infer<typeof RouteMetricsSchema>;
export type RequestTrackingResponse = z.infer<typeof RequestTrackingResponseSchema>; 