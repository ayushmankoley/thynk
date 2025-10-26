import { Button } from "@/components/ui/button";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Trophy, AlertTriangle } from "lucide-react";

interface ProposerActionsProps {
  marketId: number;
  outcome: number; // 1: OPTION_A, 2: OPTION_B, 3: INVALID
  optionA: string;
  optionB: string;
  feesEarned: bigint;
}

export function ProposerActions({ marketId, outcome, optionA, optionB, feesEarned }: ProposerActionsProps) {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const { toast } = useToast();

  const getOutcomeText = () => {
    switch (outcome) {
      case 1:
        return `Market Resolved: ${optionA}`;
      case 2:
        return `Market Resolved: ${optionB}`;
      case 3:
        return "Market Slashed: Invalid";
      default:
        return "Unknown Outcome";
    }
  };

  const getOutcomeIcon = () => {
    switch (outcome) {
      case 1:
      case 2:
        return <Trophy className="h-5 w-5 text-green-600" />;
      case 3:
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      default:
        return null;
    }
  };

  const getFeesText = () => {
    if (outcome === 3) {
      return "Stake was slashed due to invalid market";
    }
    const feesInUSDC = Number(feesEarned) / 10**6; // Convert from 6-decimal token
    return `Fees earned: $${feesInUSDC.toFixed(2)}`;
  };

  const handleClaimRewards = async () => {
    try {
      const tx = prepareContractCall({
        contract,
        method: "function claimProposerRewardsAndStake(uint256 _marketId)",
        params: [BigInt(marketId)],
      });

      await sendTransaction(tx);

      toast({
        title: "Proposer Rewards Claimed!",
        description: outcome === 3
          ? "Your stake has been slashed."
          : "Your proposer stake and creator fees have been successfully claimed.",
      });
    } catch (error) {
      console.error("Error claiming rewards:", error);
      toast({
        title: "Claim Failed",
        description: "There was an error claiming your rewards. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="text-center space-y-4">
      <div className={`p-4 rounded-lg ${
        outcome === 3
          ? "bg-red-50 dark:bg-red-950/20"
          : "bg-green-50 dark:bg-green-950/20"
      }`}>
        <div className="flex items-center justify-center gap-2 mb-2">
          {getOutcomeIcon()}
          <h3 className={`text-lg font-semibold ${
            outcome === 3
              ? "text-red-800 dark:text-red-200"
              : "text-green-800 dark:text-green-200"
          }`}>
            {getOutcomeText()}
          </h3>
        </div>
        <p className={`text-sm ${
          outcome === 3
            ? "text-red-600 dark:text-red-300"
            : "text-green-600 dark:text-green-300"
        }`}>
          {getFeesText()}
        </p>
      </div>

      <Button
        onClick={handleClaimRewards}
        disabled={isPending}
        variant="outline"
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Claiming Rewards...
          </>
        ) : outcome === 3 ? (
          "Accept Stake Loss"
        )         : (
          "Claim Proposer Stake & Fees"
        )}
      </Button>
    </div>
  );
}

