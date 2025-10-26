import { Button } from "./ui/button";
import { prepareContractCall } from "thirdweb";
import { useSendAndConfirmTransaction } from "thirdweb/react";
import { contract } from "@/constants/contract";

interface SharesBalance {
    optionAShares: bigint;
    optionBShares: bigint;
}

interface MarketResolvedProps {
    marketId: number;
    outcome: number;
    optionA: string;
    optionB: string;
    sharesBalance?: SharesBalance;
}

export function MarketResolved({
    marketId,
    outcome,
    optionA,
    optionB,
    sharesBalance
}: MarketResolvedProps) {
    const { mutateAsync: mutateTransaction } = useSendAndConfirmTransaction();

    // Determine user participation and outcome
    const userParticipation = (() => {
        if (!sharesBalance) return null;

        const winningOption = outcome === 1 ? 'A' : 'B';
        const userWinningShares = winningOption === 'A' ? sharesBalance.optionAShares : sharesBalance.optionBShares;
        const userLosingShares = winningOption === 'A' ? sharesBalance.optionBShares : sharesBalance.optionAShares;

        if (userWinningShares > BigInt(0)) {
            return 'winner';
        } else if (userLosingShares > BigInt(0)) {
            return 'loser';
        }

        return null; // Didn't participate
    })();

    const handleClaimRewards = async () => {
        try {
            const tx = await prepareContractCall({
                contract,
                method: "function claimWinnings(uint256 _marketId)",
                params: [BigInt(marketId)]
            });

            await mutateTransaction(tx);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="flex flex-col gap-2">
            <div className="mb-2 bg-green-400 dark:bg-green-400 p-2 rounded-md text-center text-s text-black">
                Resolved: {outcome === 1 ? optionA : optionB}
            </div>
            {userParticipation === 'winner' ? (
                <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleClaimRewards}
                >
                    Claim Winnings
                </Button>
            ) : userParticipation === 'loser' ? (
                <div className="w-full p-2 bg-red-100 dark:bg-red-900 rounded-md text-center text-sm text-red-800 dark:text-red-200">
                    You Lost
                </div>
            ) : null}
        </div>
    );
}
