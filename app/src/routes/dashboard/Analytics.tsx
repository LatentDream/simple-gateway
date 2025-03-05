import { RequestsOverTime } from "@/components/metrics/RequestsOverTime";
import { StatusCodeDistribution } from "@/components/metrics/StatusCodeDistribution";
import { TopRoutes } from "@/components/metrics/TopRoutes";

export default function AnalyticsView() {
    return (
        <div className="flex flex-col gap-8 p-4">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Analytics</h2>
                <p className="text-muted-foreground">
                    Monitor API traffic, request patterns, and response status codes over time
                </p>
            </div>

            <RequestsOverTime />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <StatusCodeDistribution />
                <TopRoutes />
            </div>
        </div>
    );
}
