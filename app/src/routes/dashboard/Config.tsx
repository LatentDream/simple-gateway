import { RoutesConfig } from "@/components/config/RoutesConfig";

export default function ConfigView() {
    return (
        <div className="flex flex-col gap-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Gateway Config</h2>
                <p className="text-muted-foreground">
                    Configure API routes, manage forwarding rules, and set rate limits for your gateway
                </p>
            </div>

            <RoutesConfig />
        </div>
    );
}
