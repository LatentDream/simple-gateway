import { useMetrics } from "@/context/MetricsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useMemo, useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

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

interface TimeSlotData {
    timestamp: number;
    time: string;
    total: number;
    [key: string]: number | string; // Allow dynamic route names as keys
}

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

export function RequestsOverTime() {
    const { metrics, isLoading, error } = useMetrics();
    const [selectedRange, setSelectedRange] = useState<TimeRange>(TIME_RANGES[0]);

    console.log('Raw metrics data:', metrics);

    // Generate unique colors for each route - moved up to be used in chartData
    const routes = useMemo(() => {
        if (!metrics) return [];
        const routeList = Object.keys(metrics.routes);
        console.log('Available routes:', routeList);
        return routeList;
    }, [metrics]);

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

        // Create time slots based on the interval with initialized route counts
        const timeSlots = new Map<number, TimeSlotData>();
        for (let time = startTime; time <= endTime; time += selectedRange.interval) {
            const slot: TimeSlotData = {
                timestamp: time,
                time: selectedRange.formatTime(new Date(time)),
                total: 0,
            };
            // Initialize all routes with 0
            routes.forEach(route => {
                slot[route] = 0;
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
                point[path] = (point[path] as number) + 1;
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
    }, [metrics, selectedRange, routes]);

    const colors = ["#2563eb", "#dc2626", "#16a34a", "#ea580c", "#6366f1", "#d946ef"];

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
                    <CardTitle>Requests Over Time</CardTitle>
                    <CardDescription>Number of requests per route over time</CardDescription>
                </div>
                <Select
                    value={selectedRange.value}
                    onValueChange={(value) => {
                        console.log('Changing time range to:', value);
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
            <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                            dataKey="time" 
                            label={{ value: 'Time', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis 
                            label={{ value: 'Requests', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        {routes.map((route, index) => (
                            <Area
                                key={route}
                                type="monotone"
                                dataKey={route}
                                stroke={colors[index % colors.length]}
                                fill={colors[index % colors.length]}
                                stackId="1"
                                name={route}
                                fillOpacity={0.4}
                            />
                        ))}
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
} 