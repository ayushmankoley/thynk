import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { contract } from "@/constants/contract";
import { MarketProgress } from "./market-progress";
import { MarketTime } from "./market-time";
import { MarketCardSkeleton } from "./market-card-skeleton";
import { MarketResolved } from "./market-resolved";
import { MarketBuyInterface } from "./market-buy-interface";
import { MarketSharesDisplay } from "./market-shares-display";
import { MarketInvalid } from "./market-invalid";
import { ProposerActions } from "./proposer-actions";
import { ChanceMeter } from "./chance-meter";
import { ProposeOutcomeButton } from "./propose-outcome-button";
import { DisputeOutcomeForm } from "./dispute-outcome-form";
import { FetchJuryButton } from "./fetch-jury-button";
import { JuryVoteInterface } from "./jury-vote-interface";

// Props for the MarketCard component
// index is the market id
// filter is the filter to apply to the market
interface MarketCardProps {
  index: number;
  filter: 'active' | 'pending' | 'resolved';
}

// Interface for the market data
interface Market {
  question: string;
  optionA: string;
  optionB: string;
  endTime: bigint;
  outcome: number; // 0: UNRESOLVED, 1: OPTION_A, 2: OPTION_B, 3: INVALID
  totalOptionAShares: bigint;
  totalOptionBShares: bigint;
  resolved: boolean;
  feesForCreator: bigint;
}

// Interface for the shares balance
interface SharesBalance {
  optionAShares: bigint;
  optionBShares: bigint;
}

export function MarketCard({ index, filter }: MarketCardProps) {
    // Get the active account
    const account = useActiveAccount();

    // State for off-chain market details
    const [marketDetails, setMarketDetails] = useState<{
        description: string;
        image_url: string;
    } | null>(null);


    // Get the market data
    const { data: marketData, isLoading: isLoadingMarketData, refetch: refetchMarketData } = useReadContract({
        contract,
        method: "function getMarketInfo(uint256 _marketId) view returns (string question, string optionA, string optionB, uint256 endTime, uint8 outcome, uint256 totalOptionAShares, uint256 totalOptionBShares, bool resolved, uint256 feesForCreator)",
        params: [BigInt(index)],
    });

    // Get the market proposer
    const { data: marketProposer, refetch: refetchMarketProposer } = useReadContract({
        contract,
        method: "function marketProposers(uint256) view returns (address)",
        params: [BigInt(index)],
    });

    // Get the resolution info (new oracle system)
    const { data: resolutionData, refetch: refetchResolutionInfo } = useReadContract({
        contract,
        method: "function getResolutionInfo(uint256 _marketId) view returns (uint8 status, address proposer, uint8 proposedOutcome, address disputer, uint8 disputedOutcome, uint256 disputeWindowEnd, uint256 votingEnd, uint256 votesForProposer, uint256 votesForDisputer)",
        params: [BigInt(index)],
    });

    // Parse the market data
    const market: Market | undefined = marketData ? {
        question: marketData[0],
        optionA: marketData[1],
        optionB: marketData[2],
        endTime: marketData[3],
        outcome: marketData[4],
        totalOptionAShares: marketData[5],
        totalOptionBShares: marketData[6],
        resolved: marketData[7],
        feesForCreator: marketData[8]
    } : undefined;

    // Get the shares balance
    const { data: sharesBalanceData, refetch: refetchSharesBalance } = useReadContract({
        contract,
        method: "function getSharesBalance(uint256 _marketId, address _user) view returns (uint256 optionAShares, uint256 optionBShares)",
        params: [BigInt(index), account?.address as string],
    });

    // Fetch off-chain market details once after 5 second delay
    useEffect(() => {
        if (marketDetails) return;

        const timeoutId = setTimeout(async () => {
            try {
                const response = await fetch(`/api/markets?market_id=${index}`);
                if (response.ok) {
                    const data = await response.json();
                    if (data && data.description && data.image_url) {
                        setMarketDetails({
                            description: data.description,
                            image_url: data.image_url,
                        });
                    }
                }
            } catch (error) {
                console.error('Failed to fetch market details:', error);
            }
        }, 500); // 5 second delay to reduce API load

        return () => clearTimeout(timeoutId);
    }, [index, marketDetails]);

    // Auto-refresh individual market data every 3 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            refetchMarketData();
            refetchMarketProposer();
            refetchResolutionInfo();
            if (account?.address) {
                refetchSharesBalance();
            }
        }, 3000); // 3 seconds for individual market data

        return () => clearInterval(interval);
    }, [refetchMarketData, refetchMarketProposer, refetchResolutionInfo, refetchSharesBalance, account?.address]);

    // Parse the shares balance
    const sharesBalance: SharesBalance | undefined = sharesBalanceData ? {
        optionAShares: sharesBalanceData[0],
        optionBShares: sharesBalanceData[1]
    } : undefined;

    // Parse the resolution data
    const resolutionInfo = resolutionData ? {
        status: resolutionData[0], // 0: PENDING, 1: AWAITING_PROPOSAL, 2: DISPUTE_WINDOW, 3: IN_DISPUTE, 4: JURY_VOTING, 5: FINALIZED
        proposer: resolutionData[1],
        proposedOutcome: resolutionData[2],
        disputer: resolutionData[3],
        disputedOutcome: resolutionData[4],
        disputeWindowEnd: resolutionData[5],
        votingEnd: resolutionData[6],
        votesForProposer: resolutionData[7],
        votesForDisputer: resolutionData[8]
    } : undefined;

    // Check if the market is expired
    const isExpired = new Date(Number(market?.endTime) * 1000) < new Date();

    // Check if the market should be shown based on new oracle resolution system
    const shouldShow = () => {
        if (!market) return false;
        
        // If resolutionInfo is not loaded yet, show loading state but don't filter out
        if (!resolutionInfo) return true;

        switch (filter) {
            case 'active':
                // Show markets that are still in trading period (not expired yet)
                return !isExpired && resolutionInfo.status === 0; // 0 = PENDING
            case 'pending':
                // Show markets that have ended and need resolution:
                // 1. Markets that ended but no outcome proposed yet (PENDING but expired)
                // 2. Markets in oracle resolution process (AWAITING_PROPOSAL through JURY_VOTING)
                return (isExpired && resolutionInfo.status === 0) || 
                       (resolutionInfo.status >= 1 && resolutionInfo.status <= 4);
            case 'resolved':
                // Show finalized markets
                return resolutionInfo.status === 5; // 5 = FINALIZED
            default:
                return true;
        }
    };

    // If the market should not be shown, return null
    if (!shouldShow()) {
        return null;
    }

    // Calculate total volume and chance percentage
    const totalVolumeBigInt = market ? market.totalOptionAShares + market.totalOptionBShares : BigInt(0);
    // Token has 6 decimal places
    const totalVolume = Number(totalVolumeBigInt) / 1e6;

    const formatVolume = (vol: number) => {
        if (vol >= 1_000_000) return `${(vol / 1_000_000).toFixed(1)}m`;
        if (vol >= 1_000) return `${(vol / 1_000).toFixed(1)}k`;
        return vol.toFixed(2);
    };

    const percentage = market && totalVolume > 0
        ? Math.round((Number(market.totalOptionAShares) / Number(totalVolumeBigInt)) * 100)
        : 0;

    return (
        <Card key={index} className="flex flex-col">
            {isLoadingMarketData ? (
                <MarketCardSkeleton />
            ) : (
                <>
                    <CardHeader>
                        {market && <MarketTime endTime={market.endTime} />}
                        <div className="flex items-start justify-between gap-4 mt-2">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <Image
                                    src={marketDetails?.image_url || '/defaultimg.jpg'}
                                    alt="Market image"
                                    width={64}
                                    height={64}
                                    className="w-16 h-16 object-cover rounded-lg border flex-shrink-0"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src !== '/defaultimg.jpg') {
                                            target.src = '/defaultimg.jpg';
                                        }
                                    }}
                                />
                                <CardTitle className="text-left leading-tight">{market?.question}</CardTitle>
                            </div>
                            <div className="flex-shrink-0 w-24 flex justify-center">
                                <ChanceMeter percentage={percentage} />
                            </div>
                        </div>
                        {marketDetails?.description && (
                            <p className="text-sm text-muted-foreground mt-2">
                                {marketDetails.description}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        {market && (
                            <MarketProgress 
                                optionA={market.optionA}
                                optionB={market.optionB}
                                totalOptionAShares={market.totalOptionAShares}
                                totalOptionBShares={market.totalOptionBShares}
                            />
                        )}
                        {(() => {
                            if (!market) return null;
                            
                            // Show loading state if resolutionInfo is not yet loaded
                            if (!resolutionInfo) {
                                return (
                                    <div className="text-center py-4 text-sm text-muted-foreground">
                                        Loading market status...
                                    </div>
                                );
                            }

                            // Check if user is the market proposer
                            const isUserProposer = account?.address?.toLowerCase() === marketProposer?.toLowerCase();

                            // Switch based on resolution status
                            switch (resolutionInfo.status) {
                                case 0: // PENDING - market is still active for trading
                                    return <MarketBuyInterface marketId={index} market={market} />;

                                case 1: // AWAITING_PROPOSAL - waiting for someone to propose outcome
                                    return (
                                        <ProposeOutcomeButton
                                            marketId={index}
                                            optionA={market.optionA}
                                            optionB={market.optionB}
                                        />
                                    );

                                case 2: // DISPUTE_WINDOW - outcome proposed, can be disputed
                                    return (
                                        <DisputeOutcomeForm
                                            marketId={index}
                                            proposedOutcome={resolutionInfo.proposedOutcome}
                                            optionA={market.optionA}
                                            optionB={market.optionB}
                                            disputeWindowEnd={resolutionInfo.disputeWindowEnd}
                                        />
                                    );

                                case 3: // IN_DISPUTE - waiting for jury selection
                                    return <FetchJuryButton marketId={index} />;

                                case 4: // JURY_VOTING - jury is voting
                                    return (
                                        <JuryVoteInterface
                                            marketId={index}
                                            proposedOutcome={resolutionInfo.proposedOutcome}
                                            disputedOutcome={resolutionInfo.disputedOutcome}
                                            optionA={market.optionA}
                                            optionB={market.optionB}
                                            votingEnd={resolutionInfo.votingEnd}
                                            votesForProposer={resolutionInfo.votesForProposer}
                                            votesForDisputer={resolutionInfo.votesForDisputer}
                                        />
                                    );

                                case 5: // FINALIZED - market is resolved
                                    if (market.outcome === 3) {
                                        // INVALID market
                                        return <MarketInvalid marketId={index} />;
                                    } else {
                                        // OPTION_A or OPTION_B
                                        // Check if user has winnings from betting
                                        const hasWinnings = (() => {
                                            if (!sharesBalance) return false;
                                            const winningOption = market.outcome === 1 ? 'A' : 'B';
                                            const userWinningShares = winningOption === 'A' ? sharesBalance.optionAShares : sharesBalance.optionBShares;
                                            return userWinningShares > BigInt(0);
                                        })();

                                        if (isUserProposer && hasWinnings) {
                                            // User is both proposer and bettor with winnings - show both claim options
                                            return (
                                                <div className="space-y-3">
                                                    <ProposerActions
                                                        marketId={index}
                                                        outcome={market.outcome}
                                                        optionA={market.optionA}
                                                        optionB={market.optionB}
                                                        feesEarned={market.feesForCreator}
                                                    />
                                                    <MarketResolved
                                                        marketId={index}
                                                        outcome={market.outcome}
                                                        optionA={market.optionA}
                                                        optionB={market.optionB}
                                                        sharesBalance={sharesBalance}
                                                    />
                                                </div>
                                            );
                                        } else if (isUserProposer) {
                                            // User is only proposer
                                            return (
                                                <ProposerActions
                                                    marketId={index}
                                                    outcome={market.outcome}
                                                    optionA={market.optionA}
                                                    optionB={market.optionB}
                                                    feesEarned={market.feesForCreator}
                                                />
                                            );
                                        } else {
                                            // User is bettor (not proposer)
                                            return (
                                                <MarketResolved
                                                    marketId={index}
                                                    outcome={market.outcome}
                                                    optionA={market.optionA}
                                                    optionB={market.optionB}
                                                    sharesBalance={sharesBalance}
                                                />
                                            );
                                        }
                                    }

                                default:
                                    return null;
                            }
                        })()}
                    </CardContent>
                    <CardFooter className="flex justify-between items-center">
                        <div>
                            {market && sharesBalance && (
                                <MarketSharesDisplay
                                    market={{
                                        ...market,
                                        outcome: market.outcome,
                                        resolved: market.resolved
                                    }}
                                    sharesBalance={sharesBalance}
                                />
                            )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                            ${formatVolume(totalVolume)} Vol.
                        </div>
                    </CardFooter>
                </>
            )}
        </Card>
    )
}