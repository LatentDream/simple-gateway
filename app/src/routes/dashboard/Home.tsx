import { RoutesConfig } from "@/components/config/RoutesConfig";

export default function HomeView() {
    return (
        <div className="flex flex-col gap-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Rate Limiter</h2>
                <p className="text-muted-foreground">
                    Manage and monitor your rate limiting configurations
                </p>
            </div>
            <RoutesConfig />
        </div>
    );
}
