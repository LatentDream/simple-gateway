import { useState } from "react";
import { useConfig } from "@/context/ConfigContext";
import { RoutesList } from "@/components/config/RoutesList";
import { RouteDetails } from "@/components/config/RouteDetails";

export default function ConfigView() {
    const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

    const handleRouteDelete = () => {
        setSelectedRoute(null);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold mb-2">Gateway Config</h2>
                <p className="text-muted-foreground">
                    Configure API routes, manage forwarding rules, and set rate limits for your gateway
                </p>
            </div>

            <div className="flex flex-1 min-h-0 border-t">
                <div className="w-80 min-h-0">
                    <RoutesList selectedRoute={selectedRoute} onRouteSelect={setSelectedRoute} />
                </div>
                <div className="flex-1 min-h-0">
                    <RouteDetails routePath={selectedRoute} onDelete={handleRouteDelete} />
                </div>
            </div>
        </div>
    );
}
