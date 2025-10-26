'use client'

import { Button } from "./ui/button";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Check } from "lucide-react";

interface FinalizeButtonsProps {
  marketId: number;
  resolutionStatus: number; // 2: DISPUTE_WINDOW, 4: JURY_VOTING
  disputeWindowEnd?: bigint;
  votingEnd?: bigint;
}

export function FinalizeButtons({ 
  marketId, 
  resolutionStatus,
  disputeWindowEnd,
  votingEnd 
}: FinalizeButtonsProps) {
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const canFinalize = () => {
    const now = Date.now() / 1000;
    
    if (resolutionStatus === 2 && disputeWindowEnd) {
      // DISPUTE_WINDOW - can finalize if window has ended
      return now >= Number(disputeWindowEnd);
    }
    
    if (resolutionStatus === 4 && votingEnd) {
      // JURY_VOTING - can finalize if voting has ended
      return now >= Number(votingEnd);
    }
    
    return false;
  };

  const handleFinalizeUndisputed = async () => {
    try {
      toast({
        title: "Finalizing Market",
        description: "Finalizing the undisputed outcome...",
      });

      const tx = prepareContractCall({
        contract,
        method: "function finalizeUndisputed(uint256 _marketId)",
        params: [BigInt(marketId)],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(tx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Market Finalized!",
        description: "The market outcome has been finalized.",
      });
    } catch (error) {
      console.error("Error finalizing:", error);
      toast({
        title: "Finalization Failed",
        description: error instanceof Error ? error.message : "There was an error finalizing the market",
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

  if (!canFinalize()) {
    return null;
  }

  return (
    <div className="mt-2">
      <Button
        onClick={resolutionStatus === 2 ? handleFinalizeUndisputed : handleFinalizeDispute}
        disabled={isPending}
        variant="default"
        className="w-full"
        size="sm"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Finalizing...
          </>
        ) : (
          <>
            <Check className="mr-2 h-4 w-4" />
            {resolutionStatus === 2 ? "Finalize (No Dispute)" : "Finalize Dispute"}
          </>
        )}
      </Button>
    </div>
  );
}

