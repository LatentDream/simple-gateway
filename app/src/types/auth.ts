import { z } from 'zod';

export const AuthenticatedUserSchema = z.object({
    avatar_url: z.string().url().optional(),
    name: z.string(),
});

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;

export const LoginCredentialsSchema = z.object({
    username: z.string().min(1, "Username is required"),
    password: z.string().min(1, "Password is required"),
});

export type LoginCredentials = z.infer<typeof LoginCredentialsSchema>;

export const RouteForwardingConfigSchema = z.object({
    target_url: z.string(),
    rate_limit: z.number(),
    url_rewrite: z.record(z.string()).default({})
});

export const RouteForwardingResponseSchema = z.object({
    routes: z.record(RouteForwardingConfigSchema)
});

export type RouteForwardingConfig = z.infer<typeof RouteForwardingConfigSchema>;
export type RouteForwardingResponse = z.infer<typeof RouteForwardingResponseSchema>;
