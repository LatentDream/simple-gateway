import { RoutesConfig } from "@/components/config/RoutesConfig";
import { RequestsOverTime } from "@/components/metrics/RequestsOverTime";

export default function HomeView() {
    return (
        <div className="flex flex-col gap-8 p-4">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Overview</h2>
                <p className="text-muted-foreground">
                    Monitor API traffic and manage route configurations for your Gateway service
                </p>
            </div>

            <RequestsOverTime />
            <RoutesConfig />
        </div>
    );
}
