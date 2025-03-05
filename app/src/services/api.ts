import { AuthenticatedUser, LoginCredentials, RouteForwardingResponse } from "@/types/auth";
import { RequestTrackingResponse } from "@/types/request_tracking";
import { api } from "./request";

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
        const data = await api.get<AuthenticatedUser>("admin/me", { skipErrorToast });
        return data;
    } catch (error) {
        console.error('Failed to fetch user:', error);
        return null;
    }
}

export async function login(credentials: LoginCredentials): Promise<AuthenticatedUser | null> {
    try {
        const data = await api.post<AuthenticatedUser>("admin/login", credentials);
        return data;
    } catch (error) {
        console.error('Login failed:', error);
        return null;
    }
}

export async function getRoutes(): Promise<RouteForwardingResponse | null> {
    try {
        const data = await api.get<RouteForwardingResponse>("admin/routes");
        return data;
    } catch (error) {
        console.error('Failed to fetch routes:', error);
        return null;
    }
}

export async function updateRoutes(routes: RouteForwardingResponse): Promise<RouteForwardingResponse | null> {
    try {
        const data = await api.put<RouteForwardingResponse>("admin/routes", routes);
        return data;
    } catch (error) {
        console.error('Failed to update routes:', error);
        return null;
    }
}

export async function getMetrics(): Promise<RequestTrackingResponse | null> {
    try {
        const data = await api.get<RequestTrackingResponse>("admin/metrics");
        return data;
    } catch (error) {
        console.error('Failed to fetch metrics:', error);
        return null;
    }
}

export async function deleteRoute(routeId: number): Promise<boolean> {
    try {
        await api.delete(`admin/routes/${routeId}`);
        return true;
    } catch (error) {
        console.error('Failed to delete route:', error);
        return false;
    }
}

