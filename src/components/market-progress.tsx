import { Progress } from "@/components/ui/progress";

interface MarketProgressProps {
    optionA: string;
    optionB: string;
    totalOptionAShares: bigint;
    totalOptionBShares: bigint;
}

// Convert token (6 decimals) to readable number
function fromUSDC(value: bigint): number {
    return Number(value) / 10**6;
}

export function MarketProgress({ 
    optionA, 
    optionB, 
    totalOptionAShares, 
    totalOptionBShares 
}: MarketProgressProps) {
    const totalShares = Number(totalOptionAShares) + Number(totalOptionBShares);
    const yesPercentage = totalShares > 0 
        ? (Number(totalOptionAShares) / totalShares) * 100 
        : 50;

    return (
        <div className="mb-4">
            <div className="flex justify-between mb-2">
                <span>
                    <span className="font-bold text-sm">
                        {optionA}: {fromUSDC(totalOptionAShares).toFixed(2)}
                    </span>
                    {totalShares > 0 && (
                        <span className="text-xs text-gray-500"> {Math.floor(yesPercentage)}%</span>
                    )}
                </span>
                <span>
                    <span className="font-bold text-sm">
                        {optionB}: {fromUSDC(totalOptionBShares).toFixed(2)}
                    </span>
                    {totalShares > 0 && (
                        <span className="text-xs text-gray-500"> {Math.floor(100 - yesPercentage)}%</span>
                    )}
                </span>
            </div>
            <Progress value={yesPercentage} className="h-2" />
        </div>
    );
}