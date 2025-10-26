import { Badge } from "./ui/badge";
import { useEffect, useState, useCallback } from "react";
import { toFixed } from "@/lib/utils";

interface MarketSharesDisplayProps {
    market: {
        optionA: string;
        optionB: string;
        totalOptionAShares: bigint;
        totalOptionBShares: bigint;
        outcome?: number; // 0: UNRESOLVED, 1: OPTION_A, 2: OPTION_B, 3: INVALID
        resolved?: boolean;
    };
    sharesBalance: {
        optionAShares: bigint;
        optionBShares: bigint;
    };
}

// Convert token (6 decimals) to readable number
function fromUSDC(value: bigint): number {
    return Number(value) / 10**6;
}

export function MarketSharesDisplay({
    market,
    sharesBalance,
}: MarketSharesDisplayProps) {
    const [winnings, setWinnings] = useState<{ A: bigint; B: bigint }>({ 
        A: BigInt(0), 
        B: BigInt(0) 
    });

    const calculateWinnings = useCallback((option: 'A' | 'B') => {
        if (!sharesBalance || !market) return BigInt(0);

        const userShares = option === 'A' ? sharesBalance.optionAShares : sharesBalance.optionBShares;
        const totalSharesForOption = option === 'A' ? market.totalOptionAShares : market.totalOptionBShares;
        const totalLosingShares = option === 'A' ? market.totalOptionBShares : market.totalOptionAShares;

        if (totalSharesForOption === BigInt(0)) return BigInt(0);

        // Calculate user's proportion of the winning side
        const userProportion = (userShares * BigInt(1000000)) / totalSharesForOption; // Multiply by 1M for precision

        // Calculate their share of the losing side's shares
        const winningsFromLosingShares = (totalLosingShares * userProportion) / BigInt(1000000);

        // Total winnings is their original shares plus their proportion of losing shares
        return userShares + winningsFromLosingShares;
    }, [sharesBalance, market]);

    useEffect(() => {
        if (!sharesBalance || !market) return;

        const newWinnings = {
            A: calculateWinnings('A'),
            B: calculateWinnings('B')
        };

        // Only update if values actually changed
        if (newWinnings.A !== winnings.A || newWinnings.B !== winnings.B) {
            setWinnings(newWinnings);
        }
    }, [calculateWinnings, winnings.A, winnings.B, market, sharesBalance]);

    const totalUserShares = (sharesBalance?.optionAShares || BigInt(0)) + (sharesBalance?.optionBShares || BigInt(0));
    const hasShares = totalUserShares > 0;

    // For INVALID markets, show refundable amount
    if (market.outcome === 3 && market.resolved && hasShares) {
        const refundAmount = fromUSDC(totalUserShares);
        return (
            <div className="flex flex-col gap-2">
                <div className="w-full text-sm text-muted-foreground">
                    Your shares: {market.optionA} - {toFixed(fromUSDC(sharesBalance?.optionAShares), 2)}, {market.optionB} - {toFixed(fromUSDC(sharesBalance?.optionBShares), 2)}
                </div>
                <div className="flex flex-col gap-1">
                    <div className="text-xs text-muted-foreground">Refundable:</div>
                    <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        {toFixed(refundAmount, 2)}
                    </Badge>
                </div>
            </div>
        );
    }

    // For resolved markets with winnings
    if (market.resolved && market.outcome && market.outcome !== 3) {
        // Only show winnings for the winning option
        const winningOption = market.outcome === 1 ? 'A' : 'B';
        const winningShares = winningOption === 'A' ? winnings.A : winnings.B;
        const displayWinnings = toFixed(fromUSDC(winningShares), 2);
        const winningOptionName = winningOption === 'A' ? market.optionA : market.optionB;

        return (
            <div className="flex flex-col gap-2">
                <div className="w-full text-sm text-muted-foreground">
                    Your shares: {market.optionA} - {toFixed(fromUSDC(sharesBalance?.optionAShares), 2)}, {market.optionB} - {toFixed(fromUSDC(sharesBalance?.optionBShares), 2)}
                </div>
                {winningShares > 0 && (
                    <div className="flex flex-col gap-1">
                        <div className="text-xs text-muted-foreground">Winnings:</div>
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            {winningOptionName}: {displayWinnings}
                        </Badge>
                    </div>
                )}
            </div>
        );
    }

    // For unresolved markets or markets that haven't started
    return (
        <div className="flex flex-col gap-2">
            <div className="w-full text-sm text-muted-foreground">
                Your shares: {market.optionA} - {toFixed(fromUSDC(sharesBalance?.optionAShares), 2)}, {market.optionB} - {toFixed(fromUSDC(sharesBalance?.optionBShares), 2)}
            </div>
        </div>
    );
}
