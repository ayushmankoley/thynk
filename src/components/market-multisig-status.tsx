'use client'

import { useActiveAccount, useReadContract } from "thirdweb/react";
import { contract } from "@/constants/contract";
import { VoteCounts } from "@/types/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { prepareContractCall, sendTransaction } from "thirdweb";
import { Loader2, Vote } from "lucide-react";
import { useState } from "react";

interface MarketMultisigStatusProps {
    marketId: number;
    endTime: bigint;
    resolved: boolean;
    optionA: string;
    optionB: string;
    showVotingButtons?: boolean;
}

export function MarketMultisigStatus({
    marketId,
    endTime,
    resolved,
    optionA,
    optionB,
    showVotingButtons = false
}: MarketMultisigStatusProps) {
    const account = useActiveAccount();
    const { toast } = useToast();
    const [voting, setVoting] = useState(false);

    // Get vote counts
    const { data: voteCountsData, refetch: refetchVotes } = useReadContract({
        contract,
        method: "function getVoteCounts(uint256 _marketId) view returns (uint256, uint256, uint256)",
        params: [BigInt(marketId)],
    });

    // Check if current user is a resolver
    const { data: isResolver } = useReadContract({
        contract,
        method: "function isResolver(address) view returns (bool)",
        params: [account?.address as string],
    });

    // Check if user has already voted on this market
    const { data: hasVoted } = useReadContract({
        contract,
        method: "function hasVotedOnMarket(uint256, address) view returns (bool)",
        params: [BigInt(marketId), account?.address as string],
    });

    const voteCounts: VoteCounts | undefined = voteCountsData ? {
        optionAVotes: Number(voteCountsData[0]),
        optionBVotes: Number(voteCountsData[1]),
        invalidVotes: Number(voteCountsData[2]),
    } : undefined;

    const isExpired = new Date(Number(endTime) * 1000) < new Date();
    const canVote = isResolver && !hasVoted && isExpired && !resolved;

    const handleVote = async (outcome: number) => {
        if (!account || voting) return;

        setVoting(true);
        try {
            await sendTransaction({
                transaction: prepareContractCall({
                    contract,
                    method: "function submitResolution(uint256 _marketId, uint8 _outcome)",
                    params: [BigInt(marketId), outcome],
                }),
                account: account,
            });

            toast({
                title: "Vote Submitted",
                description: "Your resolution vote has been recorded.",
            });

            // Refetch vote counts
            refetchVotes();
        } catch (error) {
            console.error("Error submitting vote:", error);
            toast({
                title: "Vote Failed",
                description: "Failed to submit your vote. Please try again.",
                variant: "destructive",
            });
        } finally {
            setVoting(false);
        }
    };

    if (!voteCounts || !isExpired) return null;

    const totalVotes = voteCounts.optionAVotes + voteCounts.optionBVotes + voteCounts.invalidVotes;
    const threshold = 3; // RESOLUTION_THRESHOLD

    return (
        <div className="space-y-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                <div className="flex items-center gap-2 mb-2">
                    <Vote className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Multisig Resolution Progress
                    </span>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {voteCounts.optionAVotes}
                        </div>
                        <div className="text-xs text-muted-foreground">{optionA}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {voteCounts.optionBVotes}
                        </div>
                        <div className="text-xs text-muted-foreground">{optionB}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                            {voteCounts.invalidVotes}
                        </div>
                        <div className="text-xs text-muted-foreground">Invalid</div>
                    </div>
                </div>

                <div className="text-xs text-muted-foreground text-center mb-2">
                    {totalVotes}/5 votes submitted • {threshold}/5 needed to resolve
                </div>

                {resolved && (
                    <Badge variant="secondary" className="w-full justify-center">
                        Market Resolved
                    </Badge>
                )}
            </div>

            {showVotingButtons && canVote && (
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground text-center">
                        Cast your vote as a resolver:
                    </p>
                    <div className="flex gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(1)}
                            disabled={voting}
                            className="flex-1"
                        >
                            {voting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {optionA}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(2)}
                            disabled={voting}
                            className="flex-1"
                        >
                            {voting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {optionB}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleVote(3)}
                            disabled={voting}
                            className="flex-1"
                        >
                            {voting ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Invalid
                        </Button>
                    </div>
                </div>
            )}

            {isResolver && hasVoted && !resolved && (
                <Badge variant="outline" className="w-full justify-center">
                    Vote Submitted ✓
                </Badge>
            )}
        </div>
    );
}
