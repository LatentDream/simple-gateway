import { useMetrics } from "@/context/MetricsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useMemo, useState } from "react";
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

const ROUTE_COLORS = ["#2563eb", "#854aba", "#6366f1", "#ea580c", "#16a34a", "#d946ef"] as const;

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-medium">{data.route}</p>
                <p style={{ color: payload[0].color }}>
                    {data.requests} requests ({(data.percentage * 100).toFixed(1)}%)
                </p>
                <div className="text-sm text-muted-foreground mt-1">
                    Success Rate: {(data.successRate * 100).toFixed(1)}%
                </div>
            </div>
        );
    }
    return null;
};

export function TopRoutes() {
    const { metrics, isLoading, error } = useMetrics();
    const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0]);

    const chartData = useMemo(() => {
        if (!metrics) return [];

        const now = Date.now();
        const startTime = now - selectedRange.duration;
        const routeStats: { [key: string]: { requests: number; successes: number } } = {};
        let totalRequests = 0;

        // Count requests and successful responses per route within the time range
        Object.entries(metrics.routes).forEach(([route, routeMetrics]) => {
            routeStats[route] = { requests: 0, successes: 0 };
            
            routeMetrics.recent_requests.forEach(request => {
                const timestamp = new Date(request.timestamp).getTime();
                if (timestamp >= startTime) {
                    routeStats[route].requests += 1;
                    totalRequests += 1;
                    // Consider 2xx status codes as successful
                    if (request.status_code >= 200 && request.status_code < 300) {
                        routeStats[route].successes += 1;
                    }
                }
            });
        });

        // Transform into chart data format and sort by request count
        return Object.entries(routeStats)
            .map(([route, stats]) => ({
                route,
                requests: stats.requests,
                percentage: stats.requests / totalRequests,
                successRate: stats.requests > 0 ? stats.successes / stats.requests : 0,
                fill: ROUTE_COLORS[0]
            }))
            .filter(data => data.requests > 0)
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 6) // Show top 6 routes
            .map((data, index) => ({
                ...data,
                fill: ROUTE_COLORS[index % ROUTE_COLORS.length]
            }));
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

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Top Routes</CardTitle>
                    <CardDescription>Most frequently accessed endpoints</CardDescription>
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
            <CardContent className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 0, right: 16, left: 16, bottom: 0 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis 
                            type="category" 
                            dataKey="route" 
                            width={120}
                            tick={{ fontSize: 11 }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Bar
                            dataKey="requests"
                            background={{ fill: "#f3f4f6" }}
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
} 