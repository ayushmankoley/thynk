'use client'

import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Scale } from "lucide-react";

interface JuryVoteInterfaceProps {
  marketId: number;
  proposedOutcome: number;
  disputedOutcome: number;
  optionA: string;
  optionB: string;
  votingEnd: bigint;
  votesForProposer: bigint;
  votesForDisputer: bigint;
}

export function JuryVoteInterface({ 
  marketId, 
  proposedOutcome,
  disputedOutcome,
  optionA, 
  optionB,
  votingEnd,
  votesForProposer,
  votesForDisputer
}: JuryVoteInterfaceProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [hasVoted, setHasVoted] = useState(false);

  // Get the jury for this market
  const { data: juryData } = useReadContract({
    contract,
    method: "function getJury(uint256 _marketId) view returns (address[10])",
    params: [BigInt(marketId)],
  });

  // Check if the current user is a juror
  const isJuror = juryData && account?.address ? 
    juryData.some((juror: string) => juror.toLowerCase() === account.address.toLowerCase()) : 
    false;

  // Check localStorage for voted status on mount
  useEffect(() => {
    if (account?.address) {
      const voteKey = `voted_${marketId}_${account.address.toLowerCase()}`;
      const hasVotedBefore = localStorage.getItem(voteKey) === 'true';
      if (hasVotedBefore) {
        setHasVoted(true);
      }
    }
  }, [account?.address, marketId]);

  // Check if voting has ended
  const isVotingEnded = () => {
    const now = Date.now() / 1000;
    const end = Number(votingEnd);
    return now >= end;
  };

  // Calculate time remaining
  const timeRemaining = () => {
    const now = Date.now() / 1000;
    const end = Number(votingEnd);
    const remaining = end - now;

    if (remaining <= 0) return "Voting Ended";

    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getOutcomeText = (outcome: number) => {
    switch (outcome) {
      case 1:
        return optionA;
      case 2:
        return optionB;
      case 3:
        return "Invalid";
      default:
        return "Unknown";
    }
  };

  const handleVote = async (votedOutcome: number) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!isJuror) {
      toast({
        title: "Not a Juror",
        description: "You are not selected as a juror for this dispute",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Submitting Vote",
        description: "Recording your vote on-chain...",
      });

      const tx = prepareContractCall({
        contract,
        method: "function submitJuryVote(uint256 _marketId, uint8 _votedOutcome)",
        params: [BigInt(marketId), votedOutcome],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(tx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Vote Submitted!",
        description: "Your vote has been recorded successfully.",
      });

      // Store voted status in localStorage and state
      if (account?.address) {
        const voteKey = `voted_${marketId}_${account.address.toLowerCase()}`;
        localStorage.setItem(voteKey, 'true');
      }
      setHasVoted(true);
    } catch (error) {
      console.error("Error voting:", error);
      toast({
        title: "Vote Failed",
        description: error instanceof Error ? error.message : "There was an error submitting your vote",
        variant: "destructive",
      });
    }
  };

  const handleFinalizeDispute = async () => {
    try {
      toast({
        title: "Finalizing Dispute",
        description: "Processing jury votes and finalizing outcome...",
      });

      const tx = prepareContractCall({
        contract,
        method: "function finalizeDispute(uint256 _marketId)",
        params: [BigInt(marketId)],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(tx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Dispute Finalized!",
        description: "The jury's decision has been processed and the market is now resolved.",
      });
    } catch (error) {
      console.error("Error finalizing dispute:", error);
      toast({
        title: "Finalization Failed",
        description: error instanceof Error ? error.message : "There was an error finalizing the dispute",
        variant: "destructive",
      });
    }
  };

  // If voting has ended, show finalize button
  if (isVotingEnded()) {
    return (
      <div className="text-center space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <Scale className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            Voting Period Ended
          </h3>
        </div>
        <div className="text-sm text-green-700 dark:text-green-300 space-y-1">
          <p>Proposer&apos;s choice: <span className="font-bold">{getOutcomeText(proposedOutcome)}</span> ({Number(votesForProposer)} votes)</p>
          <p>Disputer&apos;s choice: <span className="font-bold">{getOutcomeText(disputedOutcome)}</span> ({Number(votesForDisputer)} votes)</p>
        </div>
        <Button
          onClick={handleFinalizeDispute}
          disabled={isPending}
          variant="default"
          className="w-full"
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Finalizing...
            </>
          ) : (
            "Finalize Dispute"
          )}
        </Button>
      </div>
    );
  }

  // If not a juror, show info only
  if (!isJuror) {
    return (
      <div className="text-center space-y-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <Scale className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-purple-800 dark:text-purple-200">
            Jury Voting in Progress
          </h3>
        </div>
        <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
          <p>Proposer&apos;s choice: <span className="font-bold">{getOutcomeText(proposedOutcome)}</span> ({Number(votesForProposer)} votes)</p>
          <p>Disputer&apos;s choice: <span className="font-bold">{getOutcomeText(disputedOutcome)}</span> ({Number(votesForDisputer)} votes)</p>
        </div>
        <p className="text-xs text-purple-600 dark:text-purple-400">
          Time remaining: {timeRemaining()}
        </p>
        <p className="text-xs text-muted-foreground">
          A jury is voting to resolve this dispute.
        </p>
      </div>
    );
  }

  // If juror has voted, show confirmation
  if (hasVoted) {
    return (
      <div className="text-center space-y-3 p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <Scale className="h-5 w-5 text-green-600" />
          <h3 className="font-semibold text-green-800 dark:text-green-200">
            Vote Submitted
          </h3>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300">
          Thank you for participating as a juror. Your vote has been recorded.
        </p>
      </div>
    );
  }

  // Show voting interface for jurors
  return (
    <div className="text-center space-y-3 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg">
      <div className="flex items-center justify-center gap-2">
        <Scale className="h-5 w-5 text-purple-600" />
        <h3 className="font-semibold text-purple-800 dark:text-purple-200">
          You are a Juror - Vote Now
        </h3>
      </div>
      <div className="text-sm text-purple-700 dark:text-purple-300 space-y-1">
        <p>Proposer&apos;s choice: <span className="font-bold">{getOutcomeText(proposedOutcome)}</span> ({Number(votesForProposer)} votes)</p>
        <p>Disputer&apos;s choice: <span className="font-bold">{getOutcomeText(disputedOutcome)}</span> ({Number(votesForDisputer)} votes)</p>
      </div>
      <p className="text-xs text-purple-600 dark:text-purple-400">
        Time remaining: {timeRemaining()}
      </p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <Button
          onClick={() => handleVote(proposedOutcome)}
          disabled={isPending}
          variant="outline"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `Vote: ${getOutcomeText(proposedOutcome)}`
          )}
        </Button>
        <Button
          onClick={() => handleVote(disputedOutcome)}
          disabled={isPending}
          variant="outline"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            `Vote: ${getOutcomeText(disputedOutcome)}`
          )}
        </Button>
      </div>
    </div>
  );
}

