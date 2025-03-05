import { RequestsOverTime } from "@/components/metrics/RequestsOverTime";

export default function AnalyticsView() {
    return (
        <div className="flex flex-col gap-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Analytics</h2>
                <p className="text-muted-foreground">
                    Monitor API traffic, request patterns, and response status codes over time
                </p>
            </div>

            <RequestsOverTime />
        </div>
    );
}
