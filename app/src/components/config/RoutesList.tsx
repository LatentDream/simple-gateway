import { useConfig } from "@/context/ConfigContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useState } from "react";

interface RoutesListProps {
    selectedRoute: string | null;
    onRouteSelect: (route: string) => void;
}

export function RoutesList({ selectedRoute, onRouteSelect }: RoutesListProps) {
    const { routes, isLoading, error } = useConfig();
    const [searchQuery, setSearchQuery] = useState("");

    const filteredRoutes = routes?.routes ? 
        Object.entries(routes.routes).filter(([path]) => 
            path.toLowerCase().includes(searchQuery.toLowerCase())
        ) : [];

    if (isLoading) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                    <div className="text-sm text-muted-foreground">Loading routes...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                    <div className="text-sm text-destructive">{error}</div>
                </div>
            </div>
        );
    }

    if (!routes || Object.keys(routes.routes).length === 0) {
        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b">
                    <div className="text-sm text-muted-foreground">No routes configured</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border rounded-md">
            <div className="p-4 border-b">
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search routes..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col">
                    {filteredRoutes.map(([path]) => (
                        <button
                            key={path}
                            onClick={() => onRouteSelect(path)}
                            className={cn(
                                "flex items-center px-4 py-2 text-sm text-left hover:bg-accent transition-colors border-b last:border-b-0",
                                selectedRoute === path && "bg-accent"
                            )}
                        >
                            <div className="flex flex-col">
                                <span className="font-medium">{path}</span>
                                <span className="text-xs text-muted-foreground">
                                    {routes.routes[path].target_url}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}