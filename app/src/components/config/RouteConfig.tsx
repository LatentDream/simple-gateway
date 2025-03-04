import { RouteForwardingConfig } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RouteConfigProps {
    path: string;
    config: RouteForwardingConfig;
}

export function RouteConfig({ path, config }: RouteConfigProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">{path}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <div className="grid grid-cols-2 items-center">
                    <span className="text-sm font-medium text-muted-foreground">Target URL:</span>
                    <span className="text-sm font-mono">{config.target_url}</span>
                </div>
                <div className="grid grid-cols-2 items-center">
                    <span className="text-sm font-medium text-muted-foreground">Rate Limit:</span>
                    <span className="text-sm">{config.rate_limit} requests/minute</span>
                </div>
            </CardContent>
        </Card>
    );
} 