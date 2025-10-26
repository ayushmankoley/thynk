'use client'

import { Button } from "./ui/button";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Users } from "lucide-react";

interface FetchJuryButtonProps {
  marketId: number;
}

export function FetchJuryButton({ marketId }: FetchJuryButtonProps) {
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  const handleFetchJury = async () => {
    try {
      toast({
        title: "Selecting Jury",
        description: "Fetching random jury selection from blockchain...",
      });

      const tx = prepareContractCall({
        contract,
        method: "function fetchJurySelection(uint256 _marketId)",
        params: [BigInt(marketId)],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(tx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Jury Selected!",
        description: "10 jurors have been randomly selected to vote on this dispute.",
      });
    } catch (error) {
      console.error("Error fetching jury:", error);
      const errorMessage = error instanceof Error ? error.message : "There was an error selecting the jury";
      
      // Check if error is due to blockhash expiry (>256 blocks)
      if (errorMessage.includes("Blockhash not available") || errorMessage.includes("256 blocks")) {
        // Mark this market as expired in localStorage
        localStorage.setItem(`market_expired_${marketId}`, 'true');
        
        toast({
          title: "Market Expired",
          description: "This dispute has expired (>256 blocks passed). The market will be hidden.",
          variant: "destructive",
        });
        
        // Reload page to hide the market
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast({
          title: "Jury Selection Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="text-center space-y-3 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
      <div className="flex items-center justify-center gap-2">
        <Users className="h-5 w-5 text-blue-600" />
        <h3 className="font-semibold text-blue-800 dark:text-blue-200">
          Dispute Initiated
        </h3>
      </div>
      <p className="text-sm text-blue-700 dark:text-blue-300">
        A dispute has been raised. Click below to select a random jury to vote on the outcome.
      </p>
      <Button
        onClick={handleFetchJury}
        disabled={isPending}
        variant="default"
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Selecting Jury...
          </>
        ) : (
          "Fetch Jury Selection"
        )}
      </Button>
    </div>
  );
}

