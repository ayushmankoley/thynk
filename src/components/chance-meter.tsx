"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface ChanceMeterProps {
    percentage: number;
}

const COLORS = ['#03FC5E','#FF4136'];

export function ChanceMeter({ percentage }: ChanceMeterProps) {
    const data = [
        { name: 'Chance', value: percentage },
        { name: 'Remaining', value: 100 - percentage },
    ];

    return (
        <div className="relative w-24 h-16">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="100%"
                        innerRadius={42}
                        outerRadius={48}
                        startAngle={180}
                        endAngle={0}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
                <span className="text-lg font-bold">{`${percentage}%`}</span>
                <span className="text-xs text-muted-foreground -mt-1">chance</span>
            </div>
        </div>
    );
}
