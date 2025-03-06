import { useConfig } from "@/context/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { isEqual } from "lodash";
import { AlertCircle, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { copyToClipboard } from "@/lib/utils";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface RouteDetailsProps {
    routePath: string | null;
    onDelete?: () => void;
}

export function RouteDetails({ routePath, onDelete }: RouteDetailsProps) {
    const { routes, editConfig, deleteConfig, baseUrl } = useConfig();
    const { toast } = useToast();
    const [path, setPath] = useState("");
    const [targetUrl, setTargetUrl] = useState("");
    const [rateLimit, setRateLimit] = useState("");
    const [urlRewrites, setUrlRewrites] = useState<Record<string, string>>({});
    const [newRewriteKey, setNewRewriteKey] = useState("");
    const [newRewriteValue, setNewRewriteValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const isNewRoute = routePath === "*new*";

    // Store the original state for comparison
    const [originalState, setOriginalState] = useState({
        path: "",
        targetUrl: "",
        rateLimit: "",
        urlRewrites: {} as Record<string, string>
    });

    useEffect(() => {
        if (routePath && routes?.routes[routePath]) {
            const config = routes.routes[routePath];
            const newState = {
                path: routePath,
                targetUrl: config.target_url,
                rateLimit: config.rate_limit.toString(),
                urlRewrites: config.url_rewrite || {}
            };
            setPath(newState.path);
            setTargetUrl(newState.targetUrl);
            setRateLimit(newState.rateLimit);
            setUrlRewrites(newState.urlRewrites);
            setOriginalState(newState);
        } else if (isNewRoute) {
            const newState = {
                path: "",
                targetUrl: "",
                rateLimit: "60",
                urlRewrites: {}
            };
            setPath(newState.path);
            setTargetUrl(newState.targetUrl);
            setRateLimit(newState.rateLimit);
            setUrlRewrites(newState.urlRewrites);
            setOriginalState(newState);
        }
    }, [routePath, routes, isNewRoute]);

    // Check if there are any unsaved changes
    const hasChanges = useMemo(() => {
        const currentState = {
            path,
            targetUrl,
            rateLimit,
            urlRewrites
        };
        return !isEqual(currentState, originalState);
    }, [path, targetUrl, rateLimit, urlRewrites, originalState]);

    if (!routePath) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
                <p>Select a route to view and edit its configuration</p>
            </div>
        );
    }

    const handleSave = async () => {
        if (!path) {
            toast({
                description: "Please enter a route path"
            });
            return;
        }

        try {
            setIsSaving(true);
            await editConfig(path, {
                target_url: targetUrl,
                rate_limit: parseInt(rateLimit),
                url_rewrite: urlRewrites
            });
            // Update original state after successful save
            setOriginalState({
                path,
                targetUrl,
                rateLimit,
                urlRewrites
            });
        } catch (error) {
            toast({
                description: "Failed to update route configuration"
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!routePath || isNewRoute) return;
        
        const routeConfig = routes?.routes[routePath];
        if (!routeConfig?.id) return;

        try {
            setIsDeleting(true);
            await deleteConfig(routeConfig.id);
            onDelete?.();
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <div className="flex flex-col h-full">
                <div className="flex flex-col h-full border rounded-md">
                    <div className={cn(
                        "flex items-center justify-between p-4 border-b",
                        hasChanges && "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-900/50"
                    )}>
                        <h3 className="text-lg font-semibold">{isNewRoute ? "New Route" : routePath}</h3>
                        <div className="flex items-center gap-4">
                            {hasChanges && (
                                <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                                    <AlertCircle className="h-4 w-4" />
                                    <span className="text-sm">You have unsaved changes</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                                {!isNewRoute && (
                                    <Button 
                                        onClick={handleDelete}
                                        disabled={isDeleting}
                                        variant="destructive"
                                    >
                                        {isDeleting ? "Deleting..." : "Delete Route"}
                                    </Button>
                                )}
                                <Button 
                                    onClick={handleSave} 
                                    disabled={isSaving || !hasChanges}
                                    variant={hasChanges ? "default" : "secondary"}
                                    className={isSaving || !hasChanges ? "" : "bg-muted-foreground"}
                                >
                                    {isSaving ? "Saving..." : hasChanges ? "Save Changes" : "No Changes"}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <Tabs defaultValue="general" className="flex-1">
                        <div className="border-b px-4 bg-muted py-0.5">
                            <TabsList className="h-12">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
                                <TabsTrigger value="url-rewrites">URL Rewrites</TabsTrigger>
                                <TabsTrigger value="plugins">Plugins</TabsTrigger>
                            </TabsList>
                        </div>
                        <ScrollArea className="flex-1">
                            <div className="p-6">
                                <TabsContent value="general" className="mt-0 space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="path">Path</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="path"
                                                value={path}
                                                onChange={(e) => setPath(e.target.value)}
                                                disabled={!isNewRoute}
                                                placeholder="/api/*"
                                            />
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={async () => {
                                                                const fullUrl = `${baseUrl}${path}`;
                                                                const success = await copyToClipboard(fullUrl);
                                                                if (success) {
                                                                    toast({
                                                                        description: "Gateway URL copied to clipboard",
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Copy gateway URL</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="targetUrl">Target URL</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="targetUrl"
                                                value={targetUrl}
                                                onChange={(e) => setTargetUrl(e.target.value)}
                                                placeholder="https://api.example.com"
                                            />
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={async () => {
                                                                const success = await copyToClipboard(targetUrl);
                                                                if (success) {
                                                                    toast({
                                                                        description: "Target URL copied to clipboard",
                                                                    });
                                                                }
                                                            }}
                                                        >
                                                            <Copy className="h-4 w-4" />
                                                        </Button>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Copy target URL</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="rate-limiting" className="mt-0 space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="rateLimit">Rate Limit (requests per minute)</Label>
                                        <Input
                                            id="rateLimit"
                                            type="number"
                                            value={rateLimit}
                                            onChange={(e) => setRateLimit(e.target.value)}
                                            placeholder="60"
                                            min="1"
                                        />
                                    </div>
                                </TabsContent>

                                <TabsContent value="plugins" className="mt-0">
                                    <div className="text-center text-muted-foreground py-8">
                                        Plugins configuration coming soon
                                    </div>
                                </TabsContent>

                                <TabsContent value="url-rewrites" className="mt-0 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-2">
                                                <Label htmlFor="rewriteKey">Original Path</Label>
                                                <Input
                                                    id="rewriteKey"
                                                    value={newRewriteKey}
                                                    onChange={(e) => setNewRewriteKey(e.target.value)}
                                                    placeholder="/original-path"
                                                />
                                            </div>
                                            <div className="flex-1 space-y-2">
                                                <Label htmlFor="rewriteValue">Rewrite To</Label>
                                                <Input
                                                    id="rewriteValue"
                                                    value={newRewriteValue}
                                                    onChange={(e) => setNewRewriteValue(e.target.value)}
                                                    placeholder="/new-path"
                                                />
                                            </div>
                                            <div className="pt-8">
                                                <Button
                                                    onClick={() => {
                                                        if (newRewriteKey && newRewriteValue) {
                                                            setUrlRewrites(prev => ({
                                                                ...prev,
                                                                [newRewriteKey]: newRewriteValue
                                                            }));
                                                            setNewRewriteKey("");
                                                            setNewRewriteValue("");
                                                        }
                                                    }}
                                                >
                                                    Add Rewrite
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            {Object.entries(urlRewrites).map(([key, value]) => (
                                                <div key={key} className="flex items-center gap-2 p-2 border rounded">
                                                    <span className="flex-1">{key}</span>
                                                    <span className="text-muted-foreground">→</span>
                                                    <span className="flex-1">{value}</span>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            const newRewrites = { ...urlRewrites };
                                                            delete newRewrites[key];
                                                            setUrlRewrites(newRewrites);
                                                        }}
                                                    >
                                                        Remove
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </TabsContent>
                            </div>
                        </ScrollArea>
                    </Tabs>
                </div>
            </div>
        </>
    );
}
