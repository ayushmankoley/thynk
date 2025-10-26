import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useState, useEffect } from "react";

interface MarketTimeProps {
    endTime: bigint;
    className?: string;
}

const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const formatExactTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
};

const formatTimeRemaining = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export function MarketTime({ endTime, className }: MarketTimeProps) {
    const [timeRemaining, setTimeRemaining] = useState<number>(0);

    useEffect(() => {
        const updateTimeRemaining = () => {
            const now = new Date().getTime();
            const endTimeMs = Number(endTime) * 1000;
            const remaining = Math.max(0, Math.floor((endTimeMs - now) / 1000));
            setTimeRemaining(remaining);
        };

        // Initial calculation
        updateTimeRemaining();

        // Update every second if there's time remaining
        const interval = setInterval(updateTimeRemaining, 1000);

        return () => clearInterval(interval);
    }, [endTime]);

    const isEnded = timeRemaining === 0;
    const isCountdownMode = timeRemaining > 0 && timeRemaining <= 30 * 60; // 30 minutes in seconds
    const formattedDate = formatDate(new Date(Number(endTime) * 1000).toISOString());
    const exactTime = formatExactTime(new Date(Number(endTime) * 1000).toISOString());

    if (isEnded) {
        return (
            <SimpleTooltip content={exactTime}>
                <div
                    className={cn(
                        "mb-2 w-fit px-2 py-1 rounded border text-xs",
                        "bg-red-200 border-red-300 text-red-800 dark:bg-red-900 dark:border-red-700 dark:text-red-200",
                        className
                    )}
                >
                    Ended: {formattedDate}
                </div>
            </SimpleTooltip>
        );
    }

    if (isCountdownMode) {
        return (
            <div className={cn("mb-2 flex gap-2 items-center", className)}>
                <SimpleTooltip content={exactTime}>
                    <div className="px-2 py-1 rounded border text-xs border-gray-300 text-gray-800 dark:border-gray-600 dark:text-gray-200">
                        Ends: {formattedDate}
                    </div>
                </SimpleTooltip>
                <Badge variant="destructive">
                    ⏱{formatTimeRemaining(timeRemaining)}
                </Badge>
            </div>
        );
    }

    return (
        <SimpleTooltip content={exactTime}>
            <div
                className={cn(
                    "mb-2 w-fit px-2 py-1 rounded border text-xs",
                    "border-gray-300 text-gray-800 dark:border-gray-600 dark:text-gray-200",
                    className
                )}
            >
                Ends: {formattedDate}
            </div>
        </SimpleTooltip>
    );
}
