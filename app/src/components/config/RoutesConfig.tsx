import { useConfig } from "@/context/ConfigContext";
import { RouteConfig } from "./RouteConfig";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export function RoutesConfig() {
    const { routes, isLoading, error, refreshRoutes } = useConfig();

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Route Configurations</h2>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-[160px]" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        );
    }

    if (!routes || Object.keys(routes.routes).length === 0) {
        return (
            <Alert>
                <AlertDescription>No route configurations found.</AlertDescription>
            </Alert>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Route Configurations</h2>
                <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => refreshRoutes()}
                >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(routes.routes).map(([path, config]) => (
                    <RouteConfig key={path} path={path} config={config} />
                ))}
            </div>
        </div>
    );
} 