'use client'

import { Button } from "./ui/button";
import { useState } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract, tokenContract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface ProposeOutcomeButtonProps {
  marketId: number;
  optionA: string;
  optionB: string;
}

export function ProposeOutcomeButton({ marketId, optionA, optionB }: ProposeOutcomeButtonProps) {
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

  const handleProposeOutcome = async (outcome: number) => {
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
        description: "Please approve the proposal bond...",
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

      // Step 2: Propose outcome
      toast({
        title: "Proposing Outcome",
        description: "Submitting your outcome proposal...",
      });

      const proposeTx = prepareContractCall({
        contract,
        method: "function proposeOutcome(uint256 _marketId, uint8 _outcome)",
        params: [BigInt(marketId), outcome],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(proposeTx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Outcome Proposed!",
        description: `Successfully proposed outcome: ${outcome === 1 ? optionA : outcome === 2 ? optionB : 'Invalid'}`,
      });

      setShowOptions(false);
    } catch (error) {
      console.error("Error proposing outcome:", error);
      toast({
        title: "Proposal Failed",
        description: error instanceof Error ? error.message : "There was an error proposing the outcome",
        variant: "destructive",
      });
      setIsApproving(false);
    }
  };

  if (!showOptions) {
    return (
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          Market has ended. Propose an outcome to start the resolution process.
        </p>
        <Button
          onClick={() => setShowOptions(true)}
          variant="default"
          className="w-full"
        >
          Propose Outcome
        </Button>
      </div>
    );
  }

  return (
    <div className="text-center space-y-3">
      <p className="text-sm font-semibold">Select the correct outcome:</p>
      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={() => handleProposeOutcome(1)}
          disabled={isPending || isApproving}
          variant="outline"
        >
          {isApproving || isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            optionA
          )}
        </Button>
        <Button
          onClick={() => handleProposeOutcome(2)}
          disabled={isPending || isApproving}
          variant="outline"
        >
          {isApproving || isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            optionB
          )}
        </Button>
        <Button
          onClick={() => handleProposeOutcome(3)}
          disabled={isPending || isApproving}
          variant="outline"
        >
          {isApproving || isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            'Invalid'
          )}
        </Button>
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

