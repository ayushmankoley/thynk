import { MarketMultisigStatus } from "./market-multisig-status";

interface MarketPendingProps {
    marketId: number;
    endTime: bigint;
    resolved: boolean;
    optionA: string;
    optionB: string;
}

export function MarketPending({ marketId, endTime, resolved, optionA, optionB }: MarketPendingProps) {
    return (
        <div className="flex flex-col gap-2">
            <div className="mb-2 bg-yellow-200 dark:bg-yellow-900 p-2 rounded-md text-center text-xs text-yellow-800 dark:text-yellow-200">
                Pending multisig resolution
            </div>
            <MarketMultisigStatus
                marketId={marketId}
                endTime={endTime}
                resolved={resolved}
                optionA={optionA}
                optionB={optionB}
            />
        </div>
    );
}
