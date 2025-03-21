import { useMetrics } from "@/context/MetricsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { useMemo, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import {
    ChartConfig,
    ChartContainer,
    ChartLegend,
    ChartLegendContent,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart";

type TimeRange = {
    label: string;
    value: string;
    duration: number; // in milliseconds
    interval: number; // in milliseconds
    formatTime: (date: Date) => string;
};

const TIME_RANGES: TimeRange[] = [
    {
        label: "Last Hour",
        value: "1h",
        duration: 60 * 60 * 1000,
        interval: 60 * 1000, // 1 minute
        formatTime: (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
        label: "Last 6 Hours",
        value: "6h",
        duration: 6 * 60 * 60 * 1000,
        interval: 5 * 60 * 1000, // 5 minutes
        formatTime: (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
        label: "Last 24 Hours",
        value: "24h",
        duration: 24 * 60 * 60 * 1000,
        interval: 30 * 60 * 1000, // 30 minutes
        formatTime: (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
    {
        label: "Last 7 Days",
        value: "7d",
        duration: 7 * 24 * 60 * 60 * 1000,
        interval: 6 * 60 * 60 * 1000, // 6 hours
        formatTime: (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' }),
    },
];

type BreakdownType = 'route' | 'status';

interface TimeSlotData {
    timestamp: number;
    time: string;
    total: number;
    [key: string]: number | string;
}

type StatusColors = {
    [key: string]: string;
};

const ROUTE_COLORS = ["#2563eb", "#854aba", "#6366f1", "#ea580c", "#16a34a", "#d946ef"] as const;
const STATUS_COLORS: StatusColors = {
    "200": "#16a34a", // Success - Green
    "201": "#22c55e", // Created - Light Green
    "400": "#f59e0b", // Bad Request - Yellow
    "401": "#7c3aed", // Unauthorized - Purple
    "403": "#8b5cf6", // Forbidden - Light Purple
    "404": "#f97316", // Not Found - Orange
    "429": "#6366f1", // Rate Limited - Indigo
    "500": "#dc2626", // Server Error - Purple
    "503": "#ef4444", // Service Unavailable - Light Purple
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-background border rounded-lg shadow-lg p-3">
                <p className="font-medium">{label}</p>
                <div className="space-y-1">
                    {payload.map((entry: any) => (
                        <p key={entry.name} style={{ color: entry.color }}>
                            {entry.name}: {entry.value} requests
                        </p>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const chartConfig = {
    requests: {
        label: "Requests",
    },
    route: {
        label: "By Route",
        color: "hsl(var(--chart-1))",
    },
    status: {
        label: "By Status",
        color: "hsl(var(--chart-2))",
    },
} satisfies ChartConfig;

export function RequestsOverTime() {
    const { metrics, isLoading, error, refreshMetrics } = useMetrics();
    const [selectedRange, setSelectedRange] = useState<TimeRange>(TIME_RANGES[0]);
    const [breakdown, setBreakdown] = useState<BreakdownType>('route');

    console.log('Raw metrics data:', metrics);

    // Generate keys for breakdown (either routes or status codes)
    const breakdownKeys = useMemo(() => {
        if (!metrics) return [];
        if (breakdown === 'route') {
            return Object.keys(metrics.routes);
        } else {
            // Collect unique status codes from all routes
            const statusCodes = new Set<string>();
            Object.values(metrics.routes).forEach(routeMetrics => {
                Object.keys(routeMetrics.status_codes).forEach(code => {
                    statusCodes.add(code);
                });
            });
            return Array.from(statusCodes).sort();
        }
    }, [metrics, breakdown]);

    const chartData = useMemo(() => {
        if (!metrics) return [];

        // Find the latest timestamp in the data
        let latestTimestamp = 0;
        Object.values(metrics.routes).forEach(routeMetrics => {
            routeMetrics.recent_requests.forEach(request => {
                const timestamp = new Date(request.timestamp).getTime();
                latestTimestamp = Math.max(latestTimestamp, timestamp);
            });
        });

        const endTime = latestTimestamp;
        const startTime = endTime - selectedRange.duration;

        console.log('Time range:', {
            start: new Date(startTime).toISOString(),
            end: new Date(endTime).toISOString(),
            interval: selectedRange.interval / 1000 + ' seconds'
        });

        // Create time slots based on the interval with initialized counts
        const timeSlots = new Map<number, TimeSlotData>();
        for (let time = startTime; time <= endTime; time += selectedRange.interval) {
            const slot: TimeSlotData = {
                timestamp: time,
                time: selectedRange.formatTime(new Date(time)),
                total: 0,
            };
            // Initialize all breakdown keys with 0
            breakdownKeys.forEach(key => {
                slot[key] = 0;
            });
            timeSlots.set(time, slot);
        }

        console.log('Empty time slots created:', timeSlots.size);

        // Process each route's recent requests
        Object.entries(metrics.routes).forEach(([path, routeMetrics]) => {
            console.log(`Processing route ${path}:`, {
                totalRequests: routeMetrics.recent_requests.length,
            });

            routeMetrics.recent_requests.forEach((request) => {
                const timestamp = new Date(request.timestamp).getTime();
                if (timestamp < startTime) {
                    console.log('Skipping old request:', {
                        timestamp: new Date(timestamp).toISOString(),
                        path
                    });
                    return;
                }

                // Find the appropriate time slot by rounding down to the nearest interval
                const slotTime = startTime + Math.floor((timestamp - startTime) / selectedRange.interval) * selectedRange.interval;

                if (!timeSlots.has(slotTime)) {
                    console.log('No slot found for timestamp:', {
                        timestamp: new Date(timestamp).toISOString(),
                        slotTime: new Date(slotTime).toISOString(),
                        path,
                        availableSlots: Array.from(timeSlots.keys()).map(t => new Date(t).toISOString())
                    });
                    return;
                }

                const point = timeSlots.get(slotTime)!;
                point.total += 1;

                if (breakdown === 'route') {
                    point[path] = (point[path] as number) + 1;
                } else {
                    const statusCode = request.status_code.toString();
                    point[statusCode] = (point[statusCode] as number) + 1;
                }
            });
        });

        // Convert to array and sort by timestamp
        const processedData = Array.from(timeSlots.values())
            .sort((a, b) => a.timestamp - b.timestamp);

        console.log('Processed chart data:', {
            dataPoints: processedData.length,
            samplePoint: processedData[0],
            routes: Object.keys(processedData[0] || {}).filter(key => key !== 'timestamp' && key !== 'time' && key !== 'total'),
            allData: processedData
        });

        return processedData;
    }, [metrics, selectedRange, breakdown, breakdownKeys]);

    const colors = useMemo(() => {
        return breakdown === 'route' ? ROUTE_COLORS : STATUS_COLORS;
    }, [breakdown]);

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
            <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
                <div className="grid flex-1 gap-1 text-center sm:text-left">
                    <CardTitle>Requests Over Time</CardTitle>
                    <CardDescription>
                        Number of requests per {breakdown}
                    </CardDescription>
                </div>
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={refreshMetrics}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Refresh
                    </Button>
                    <ToggleGroup type="single" value={breakdown} onValueChange={(value: BreakdownType) => value && setBreakdown(value)}>
                        <ToggleGroupItem value="route" aria-label="Show route breakdown">
                            By Route
                        </ToggleGroupItem>
                        <ToggleGroupItem value="status" aria-label="Show status code breakdown">
                            By Status
                        </ToggleGroupItem>
                    </ToggleGroup>
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
                </div>
            </CardHeader>
            <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
                <ChartContainer
                    config={chartConfig}
                    className="aspect-auto h-[350px] w-full"
                >
                    <AreaChart data={chartData}>
                        <defs>
                            {breakdownKeys.map((key, index) => {
                                const color = breakdown === 'route'
                                    ? ROUTE_COLORS[index % ROUTE_COLORS.length]
                                    : STATUS_COLORS[key] || '#94a3b8';
                                return (
                                    <linearGradient key={key} id={`fill${key}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                                        <stop offset="95%" stopColor={color} stopOpacity={0.1} />
                                    </linearGradient>
                                );
                            })}
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="time"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            minTickGap={32}
                        />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                        />
                        <ChartTooltip
                            cursor={false}
                            content={
                                <ChartTooltipContent
                                    labelFormatter={(value) => value}
                                    indicator="dot"
                                />
                            }
                        />
                        {breakdownKeys.map((key, index) => {
                            const color = breakdown === 'route'
                                ? ROUTE_COLORS[index % ROUTE_COLORS.length]
                                : STATUS_COLORS[key] || '#94a3b8';

                            return (
                                <Area
                                    key={key}
                                    type="stepAfter"
                                    dataKey={key}
                                    stroke={color}
                                    fill={`url(#fill${key})`}
                                    stackId="1"
                                    name={breakdown === 'status' ? `${key} (${getStatusCodeLabel(key)})  ` : key}
                                />
                            );
                        })}
                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}

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
