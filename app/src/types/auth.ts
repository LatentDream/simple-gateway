import { z } from 'zod';

export const AuthenticatedUserSchema = z.object({
    user_id: z.string(),
    email: z.string().email(),
    avatar_url: z.string().url(),
    name: z.string(),
    type: z.enum(['pro', 'teams', 'community', 'enterprise']),
    permissions: z.array(z.string()),
});

export type AuthenticatedUser = z.infer<typeof AuthenticatedUserSchema>;
