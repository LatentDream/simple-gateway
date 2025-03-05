import { useMetrics } from "@/context/MetricsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Label } from "recharts";
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const TIME_RANGES = [
    {
        label: "Last Hour",
        value: "1h",
        duration: 60 * 60 * 1000,
    },
    {
        label: "Last 6 Hours",
        value: "6h",
        duration: 6 * 60 * 60 * 1000,
    },
    {
        label: "Last 24 Hours",
        value: "24h",
        duration: 24 * 60 * 60 * 1000,
    },
    {
        label: "Last 7 Days",
        value: "7d",
        duration: 7 * 24 * 60 * 60 * 1000,
    },
];

const STATUS_COLORS: { [key: string]: string } = {
    "200": "#16a34a", // Success - Green
    "201": "#22c55e", // Created - Light Green
    "400": "#f59e0b", // Bad Request - Yellow
    "401": "#7c3aed", // Unauthorized - Purple
    "403": "#8b5cf6", // Forbidden - Light Purple
    "404": "#f97316", // Not Found - Orange
    "429": "#6366f1", // Rate Limited - Indigo
    "500": "#dc2626", // Server Error - Red
    "503": "#ef4444", // Service Unavailable - Light Red
};

function getStatusCodeLabel(code: string): string {
    const labels: Record<string, string> = {
        "200": "OK",
        "201": "Created",
        "400": "Bad Request",
        "401": "Unauthorized",
        "403": "Forbidden",
        "404": "Not Found",
        "429": "Rate Limited",
        "500": "Server Error",
        "503": "Service Unavailable"
    };
    return labels[code] || "Unknown";
}

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-medium">{data.statusCode} ({getStatusCodeLabel(data.statusCode)})</p>
                <p style={{ color: data.fill }}>
                    {data.value} requests ({(data.percentage * 100).toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

export function StatusCodeDistribution() {
    const { metrics, isLoading, error } = useMetrics();
    const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0]);

    const { chartData, totalRequests, successRate } = useMemo(() => {
        if (!metrics) return { chartData: [], totalRequests: 0, successRate: 0 };

        const now = Date.now();
        const startTime = now - selectedRange.duration;
        const statusCounts: { [key: string]: number } = {};
        let total = 0;
        let successes = 0;

        // Count status codes within the selected time range
        Object.values(metrics.routes).forEach(routeMetrics => {
            routeMetrics.recent_requests.forEach(request => {
                const timestamp = new Date(request.timestamp).getTime();
                if (timestamp >= startTime) {
                    const statusCode = request.status_code.toString();
                    statusCounts[statusCode] = (statusCounts[statusCode] || 0) + 1;
                    total += 1;
                    if (request.status_code >= 200 && request.status_code < 300) {
                        successes += 1;
                    }
                }
            });
        });

        // Transform into chart data format
        const data = Object.entries(statusCounts)
            .map(([statusCode, count]) => ({
                statusCode,
                value: count,
                percentage: count / total,
                fill: STATUS_COLORS[statusCode] || "#94a3b8"
            }))
            .sort((a, b) => b.value - a.value);

        return {
            chartData: data,
            totalRequests: total,
            successRate: total > 0 ? (successes / total) * 100 : 0
        };
    }, [metrics, selectedRange]);

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Loading metrics...</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Error</CardTitle>
                    <CardDescription>{error}</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    if (!metrics || chartData.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>No data available</CardTitle>
                    <CardDescription>No request metrics have been recorded yet.</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const isHealthy = successRate >= 95;

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                    <CardTitle>Status Code Distribution</CardTitle>
                    <CardDescription>Distribution of response status codes</CardDescription>
                </div>
                <Select
                    value={selectedRange.value}
                    onValueChange={(value) => {
                        const range = TIME_RANGES.find(r => r.value === value);
                        if (range) setSelectedRange(range);
                    }}
                >
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select time range" />
                    </SelectTrigger>
                    <SelectContent>
                        {TIME_RANGES.map((range) => (
                            <SelectItem key={range.value} value={range.value}>
                                {range.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                <div className="mx-auto aspect-square max-h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip content={<CustomTooltip />} />
                            <Pie
                                data={chartData}
                                dataKey="value"
                                nameKey="statusCode"
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                strokeWidth={4}
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                                <Label
                                    content={({ viewBox }) => {
                                        if (viewBox && "cx" in viewBox && "cy" in viewBox && viewBox.cy !== undefined) {
                                            return (
                                                <text
                                                    x={viewBox.cx}
                                                    y={viewBox.cy}
                                                    textAnchor="middle"
                                                    dominantBaseline="middle"
                                                >
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy - 12}
                                                        className="fill-foreground text-2xl font-bold"
                                                    >
                                                        {totalRequests.toLocaleString()}
                                                    </tspan>
                                                    <tspan
                                                        x={viewBox.cx}
                                                        y={viewBox.cy + 12}
                                                        className="fill-muted-foreground text-sm"
                                                    >
                                                        Requests
                                                    </tspan>
                                                </text>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
            <CardFooter className="flex-col gap-2 text-sm pt-4">
                <div className="flex items-center gap-2 font-medium leading-none">
                    {isHealthy ? (
                        <>
                            Healthy API performance
                            <TrendingUp className="h-4 w-4 text-green-500" />
                        </>
                    ) : (
                        <>
                            High error rate detected
                            <TrendingDown className="h-4 w-4 text-red-500" />
                        </>
                    )}
                </div>
                <div className="leading-none text-muted-foreground">
                    {successRate.toFixed(1)}% success rate in the selected time range
                </div>
            </CardFooter>
        </Card>
    );
}