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
    const [targetUrl, setTargetUrl] = useState("");
    const [rateLimit, setRateLimit] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (routePath && routes?.routes[routePath]) {
            const config = routes.routes[routePath];
            setTargetUrl(config.target_url);
            setRateLimit(config.rate_limit.toString());
        }
    }, [routePath, routes]);

    if (!routePath || !routes?.routes[routePath]) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-muted-foreground">
                <p>Select a route to view and edit its configuration</p>
            </div>
        );
    }

    const handleSave = async () => {
        if (!routePath) return;

        try {
            setIsSaving(true);
            await editConfig(routePath, {
                target_url: targetUrl,
                rate_limit: parseInt(rateLimit)
            });
            toast({
                description: "Route configuration updated successfully",
            });
        } catch (error) {
            toast({
                description: "Failed to update route configuration",
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full border rounded-md">
            <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{routePath}</h3>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
            <Tabs defaultValue="general" className="flex-1">
                <div className="border-b px-4">
                    <TabsList className="h-12">
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="rate-limiting">Rate Limiting</TabsTrigger>
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
                                    value={routePath}
                                    disabled
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
                    </div>
                </ScrollArea>
            </Tabs>
        </div>
    );
}