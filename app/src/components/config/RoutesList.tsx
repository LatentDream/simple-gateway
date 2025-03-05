import { useConfig } from "@/context/ConfigContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface RoutesListProps {
    selectedRoute: string | null;
    onRouteSelect: (route: string) => void;
}

export function RoutesList({ selectedRoute, onRouteSelect }: RoutesListProps) {
    const { routes, isLoading, error } = useConfig();
    const [searchQuery, setSearchQuery] = useState("");

    const handleNewRoute = () => {
        onRouteSelect("*new*");
    };

    const filteredRoutes = routes?.routes ? 
        Object.entries(routes.routes).filter(([path]) => 
            path.toLowerCase().includes(searchQuery.toLowerCase())
        ) : [];

    const hasRoutes = routes?.routes && Object.keys(routes.routes).length > 0;

    if (isLoading) {
        return (
            <div className="flex flex-col h-full border-r">
                <div className="p-4 border-b">
                    <div className="text-sm text-muted-foreground">Loading routes...</div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col h-full border-r">
                <div className="p-4 border-b">
                    <div className="text-sm text-destructive">{error}</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full border-r">
            <div className="p-4 border-b">
                <div className="flex items-center gap-2">
                    <div className="flex-1 flex items-center gap-2 bg-background rounded-md border px-2">
                        <Search className="h-4 w-4 text-muted-foreground flex-none" />
                        <Input
                            placeholder="Search routes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="h-8 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
                        />
                    </div>
                    <Button 
                        onClick={handleNewRoute} 
                        size="icon"
                        variant="outline"
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <ScrollArea className="flex-1">
                {filteredRoutes.length > 0 ? (
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
                                        {routes?.routes[path].target_url}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center p-4">
                        <div className="text-center text-sm text-muted-foreground">
                            {searchQuery ? (
                                <>
                                    <p className="font-medium">No matching routes</p>
                                    <p className="text-xs">Try a different search term</p>
                                </>
                            ) : (
                                <>
                                    <p className="font-medium">No routes configured</p>
                                    <p className="text-xs">Click the + button to create your first route</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}
