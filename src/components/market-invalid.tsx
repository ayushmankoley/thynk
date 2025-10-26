import { Button } from "@/components/ui/button";
import { useSendTransaction } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract } from "@/constants/contract";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

interface MarketInvalidProps {
  marketId: number;
}

export function MarketInvalid({ marketId }: MarketInvalidProps) {
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const { toast } = useToast();

  const handleClaimRefund = async () => {
    try {
      const tx = prepareContractCall({
        contract,
        method: "function claimRefund(uint256 _marketId)",
        params: [BigInt(marketId)],
      });

      await sendTransaction(tx);

      toast({
        title: "Refund Claimed!",
        description: "Your funds have been successfully refunded.",
      });
    } catch (error) {
      console.error("Error claiming refund:", error);
      toast({
        title: "Claim Failed",
        description: "There was an error claiming your refund. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="text-center space-y-4">
      <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 dark:text-red-200">
          Market Resolved: Invalid
        </h3>
        <p className="text-sm text-red-600 dark:text-red-300 mt-1">
          This market was deemed invalid or unresolvable. All participants can claim a full refund.
        </p>
      </div>

      <Button
        onClick={handleClaimRefund}
        disabled={isPending}
        variant="outline"
        className="w-full"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Claiming Refund...
          </>
        ) : (
          "Claim Refund"
        )}
      </Button>
    </div>
  );
}

