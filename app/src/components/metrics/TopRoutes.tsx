import { useMetrics } from "@/context/MetricsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { useMemo, useState } from "react";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChartContainer } from "@/components/ui/chart";

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

const chartConfig = {
    requests: {
        label: "Requests",
        color: "hsl(var(--chart-1))",
    },
    label: {
        color: "hsl(var(--foreground))",
    },
    value: {
        color: "hsl(var(--muted-foreground))",
    },
    background: {
        color: "hsl(var(--muted))",
    },
};

export function TopRoutes() {
    const { metrics, isLoading, error } = useMetrics();
    const [selectedRange, setSelectedRange] = useState(TIME_RANGES[0]);

    const { chartData, totalRequests, previousTotal, trend } = useMemo(() => {
        if (!metrics) return { chartData: [], totalRequests: 0, previousTotal: 0, trend: 0 };

        const now = Date.now();
        const startTime = now - selectedRange.duration;
        const previousStartTime = startTime - selectedRange.duration;
        const routeStats: { [key: string]: { requests: number; successes: number } } = {};
        let total = 0;
        let previousTotal = 0;

        // Count current period requests
        Object.entries(metrics.routes).forEach(([route, routeMetrics]) => {
            routeStats[route] = { requests: 0, successes: 0 };
            
            routeMetrics.recent_requests.forEach(request => {
                const timestamp = new Date(request.timestamp).getTime();
                if (timestamp >= startTime) {
                    routeStats[route].requests += 1;
                    total += 1;
                    if (request.status_code >= 200 && request.status_code < 300) {
                        routeStats[route].successes += 1;
                    }
                } else if (timestamp >= previousStartTime) {
                    previousTotal += 1;
                }
            });
        });

        // Calculate trend
        const trend = previousTotal > 0 
            ? ((total - previousTotal) / previousTotal) * 100 
            : 0;

        // Transform into chart data format and sort by request count
        const data = Object.entries(routeStats)
            .map(([route, stats]) => ({
                route: route.replace(/^\//, ''), // Remove leading slash
                requests: stats.requests,
                successRate: stats.requests > 0 ? (stats.successes / stats.requests) * 100 : 0,
            }))
            .filter(data => data.requests > 0)
            .sort((a, b) => b.requests - a.requests)
            .slice(0, 6); // Show top 6 routes

        return {
            chartData: data,
            totalRequests: total,
            previousTotal,
            trend
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

    return (
        <Card className="flex flex-col">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
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
            <CardContent>
                <ChartContainer config={chartConfig}>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={chartData}
                                layout="vertical"
                                margin={{ top: 0, right: 48, bottom: 0, left: 0 }}
                                barSize={40}
                            >
                                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                                <YAxis
                                    dataKey="route"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={false}
                                    width={0}
                                />
                                <XAxis type="number" hide />
                                <Bar
                                    dataKey="requests"
                                    fill={chartConfig.requests.color}
                                    radius={[4, 4, 4, 4]}
                                    background={{ fill: chartConfig.background.color }}
                                >
                                    <LabelList
                                        dataKey="route"
                                        position="left"
                                        offset={-160}
                                        fill={chartConfig.label.color}
                                        fontSize={12}
                                        formatter={(value: string) => value}
                                    />
                                    <LabelList
                                        dataKey="requests"
                                        position="right"
                                        offset={16}
                                        fill={chartConfig.value.color}
                                        fontSize={12}
                                        formatter={(value: number) => value.toLocaleString()}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartContainer>
            </CardContent>
            <CardFooter className="flex-col items-start gap-2 text-sm">
                <div className="flex items-center gap-2 font-medium leading-none">
                    {trend > 0 ? (
                        <>
                            Traffic increased by {Math.abs(trend).toFixed(1)}% 
                            <TrendingUp className="h-4 w-4 text-success" />
                        </>
                    ) : trend < 0 ? (
                        <>
                            Traffic decreased by {Math.abs(trend).toFixed(1)}%
                            <TrendingDown className="h-4 w-4 text-destructive" />
                        </>
                    ) : (
                        <>Traffic unchanged</>
                    )}
                </div>
                <div className="leading-none text-muted-foreground">
                    {totalRequests.toLocaleString()} total requests in the selected time range
                </div>
            </CardFooter>
        </Card>
    );
} 