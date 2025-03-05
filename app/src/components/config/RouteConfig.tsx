import { RouteForwardingConfig } from "@/types/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import { useConfig } from "@/context/ConfigContext";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface RouteConfigProps {
    path: string;
    config: RouteForwardingConfig;
}

export function RouteConfig({ path, config }: RouteConfigProps) {
    const { baseUrl } = useConfig();
    const { toast } = useToast();

    const fullUrl = `${baseUrl}${path}`;

    const handleCopy = async () => {
        const success = await copyToClipboard(fullUrl);
        if (success) {
            toast({
                description: "API URL copied to clipboard",
            });
        }
    };

    return (
        <Card className="rounded-sm">
            <CardHeader className="pb-2">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <CardTitle 
                                className="text-lg font-semibold cursor-pointer hover:text-primary flex items-center gap-2 group"
                                onClick={handleCopy}
                            >
                                {path}
                                <Copy className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </CardTitle>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Click to copy: {fullUrl}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </CardHeader>
            <CardContent className="grid gap-1">
                <div className="grid grid-cols-2 items-center">
                    <span className="text-sm font-medium text-muted-foreground">Target URL:</span>
                    <span className="text-sm font-mono truncate" title={config.target_url}>{config.target_url}</span>
                </div>
                <div className="grid grid-cols-2 items-center">
                    <span className="text-sm font-medium text-muted-foreground">Rate Limit:</span>
                    <span className="text-sm">{config.rate_limit} requests/minute</span>
                </div>
            </CardContent>
        </Card>
    );
} 
