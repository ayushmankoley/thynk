'use client'

import { Button } from "./ui/button";
import { useState } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract, tokenContract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, AlertTriangle } from "lucide-react";

interface DisputeOutcomeFormProps {
  marketId: number;
  proposedOutcome: number;
  optionA: string;
  optionB: string;
  disputeWindowEnd: bigint;
}

export function DisputeOutcomeForm({ 
  marketId, 
  proposedOutcome, 
  optionA, 
  optionB,
  disputeWindowEnd 
}: DisputeOutcomeFormProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [isApproving, setIsApproving] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  // Read the proposal bond amount from contract
  const { data: proposalBondAmount } = useReadContract({
    contract,
    method: "function proposalBondAmount() view returns (uint256)",
    params: [],
  });

  // Calculate time remaining
  const timeRemaining = () => {
    const now = Date.now() / 1000;
    const end = Number(disputeWindowEnd);
    const remaining = end - now;

    if (remaining <= 0) return "Expired";

    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);

    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  const getProposedOutcomeText = () => {
    switch (proposedOutcome) {
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

  const handleDisputeOutcome = async (counterOutcome: number) => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Step 1: Approve cUSD bond
      setIsApproving(true);
      const bondAmount = proposalBondAmount || BigInt(10**17); // Default to 0.1 cUSD

      toast({
        title: "Approving Bond",
        description: "Please approve the dispute bond...",
      });

      const approveTx = prepareContractCall({
        contract: tokenContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [contract.address, bondAmount],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(approveTx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      setIsApproving(false);

      // Step 2: Dispute outcome (no longer payable, removed CELO payment)
      toast({
        title: "Disputing Outcome",
        description: "Submitting your dispute...",
      });

      const disputeTx = prepareContractCall({
        contract,
        method: "function disputeOutcome(uint256 _marketId, uint8 _counterOutcome)",
        params: [BigInt(marketId), counterOutcome],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(disputeTx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Outcome Disputed!",
        description: "Your dispute has been submitted. A jury will be selected to vote.",
      });

      setShowOptions(false);
    } catch (error) {
      console.error("Error disputing outcome:", error);
      toast({
        title: "Dispute Failed",
        description: error instanceof Error ? error.message : "There was an error disputing the outcome",
        variant: "destructive",
      });
      setIsApproving(false);
    }
  };

  // Get available counter outcomes (exclude the proposed outcome)
  const getCounterOutcomes = () => {
    const outcomes = [
      { value: 1, label: optionA },
      { value: 2, label: optionB },
      { value: 3, label: "Invalid" },
    ];
    return outcomes.filter(o => o.value !== proposedOutcome);
  };

  if (!showOptions) {
    return (
      <div className="text-center space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
        <div className="flex items-center justify-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
            Dispute Window Active
          </h3>
        </div>
        <p className="text-sm text-yellow-700 dark:text-yellow-300">
          Proposed outcome: <span className="font-bold">{getProposedOutcomeText()}</span>
        </p>
        <p className="text-xs text-yellow-600 dark:text-yellow-400">
          Time remaining: {timeRemaining()}
        </p>
        <Button
          onClick={() => setShowOptions(true)}
          variant="outline"
          className="w-full"
        >
          Dispute This Outcome
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-3 p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
      <p className="text-sm font-semibold">Select the correct outcome:</p>
      <div className="grid grid-cols-2 gap-2">
        {getCounterOutcomes().map((outcome) => (
          <Button
            key={outcome.value}
            onClick={() => handleDisputeOutcome(outcome.value)}
            disabled={isPending || isApproving}
            variant="outline"
          >
            {isApproving || isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              outcome.label
            )}
          </Button>
        ))}
      </div>
      <Button
        onClick={() => setShowOptions(false)}
        variant="ghost"
        size="sm"
      >
        Cancel
      </Button>
    </div>
  );
}

