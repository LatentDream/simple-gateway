import { AuthenticatedUser } from "@/types/auth";
import { api } from "./request";
import { Project, ProjectsResponse } from "@/types/cloud";
import { LogsResponse } from "@/types/logs";

export async function health_check(): Promise<string> {
    try {
        const data = await api.get<string>("health_check", {
            skipErrorToast: true
        });
        return data;
    } catch (error) {
        console.error('Health check failed:', error);
        return '';
    }
}

export async function me(skipErrorToast: boolean = false): Promise<AuthenticatedUser | null> {
    try {
        const data = await api.get<AuthenticatedUser>("users/me", { skipErrorToast });
        return data;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}

