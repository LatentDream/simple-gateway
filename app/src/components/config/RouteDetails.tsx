import { useConfig } from "@/context/ConfigContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RouteDetailsProps {
    routePath: string | null;
}

export function RouteDetails({ routePath }: RouteDetailsProps) {
    const { routes, editConfig } = useConfig();
    const { toast } = useToast();
    const [path, setPath] = useState("");
    const [targetUrl, setTargetUrl] = useState("");
    const [rateLimit, setRateLimit] = useState("");
    const [urlRewrites, setUrlRewrites] = useState<Record<string, string>>({});
    const [newRewriteKey, setNewRewriteKey] = useState("");
    const [newRewriteValue, setNewRewriteValue] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const isNewRoute = routePath === "*new*";

    useEffect(() => {
        if (routePath && routes?.routes[routePath]) {
            const config = routes.routes[routePath];
            setPath(routePath);
            setTargetUrl(config.target_url);
            setRateLimit(config.rate_limit.toString());
            setUrlRewrites(config.url_rewrite || {});
        } else if (isNewRoute) {
            setPath("");
            setTargetUrl("");
            setRateLimit("60"); // Default rate limit
            setUrlRewrites({});
        }
    }, [routePath, routes, isNewRoute]);

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
        } catch (error) {
            toast({
                description: "Failed to update route configuration"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full border rounded-md">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{isNewRoute ? "New Route" : routePath}</h3>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
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
                                <Input
                                    id="path"
                                    value={path}
                                    onChange={(e) => setPath(e.target.value)}
                                    disabled={!isNewRoute}
                                    placeholder="/api/*"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="targetUrl">Target URL</Label>
                                <Input
                                    id="targetUrl"
                                    value={targetUrl}
                                    onChange={(e) => setTargetUrl(e.target.value)}
                                    placeholder="https://api.example.com"
                                />
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
    );
}
