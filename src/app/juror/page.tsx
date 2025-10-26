'use client'

import { useState } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { contract, tokenContract } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Scale, Lock, Unlock, Trophy } from "lucide-react";

export default function JurorPage() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();
  const [isApproving, setIsApproving] = useState(false);

  // Read juror stake info
  const { data: jurorStakeData, refetch: refetchJurorStake } = useReadContract({
    contract,
    method: "function getJurorStake(address _juror) view returns (uint256 stake, uint256 unlockTime)",
    params: account?.address ? [account.address] : ["0x0000000000000000000000000000000000000000"],
  });

  // Read MIN_JUROR_STAKE
  const { data: minJurorStake } = useReadContract({
    contract,
    method: "function MIN_JUROR_STAKE() view returns (uint256)",
    params: [],
  });

  // Read juror count
  const { data: jurorCount } = useReadContract({
    contract,
    method: "function getJurorCount() view returns (uint256)",
    params: [],
  });

  // Read user's cUSD balance
  const { data: cUSDBalance } = useReadContract({
    contract: tokenContract,
    method: "function balanceOf(address account) view returns (uint256)",
    params: account?.address ? [account.address] : ["0x0000000000000000000000000000000000000000"],
  });

  const jurorStake = jurorStakeData?.[0] || BigInt(0);
  const unlockTime = jurorStakeData?.[1] || BigInt(0);
  const isStaked = jurorStake > BigInt(0);
  const canUnstake = isStaked && Date.now() / 1000 >= Number(unlockTime);

  const handleStake = async () => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsApproving(true);
      const stakeAmount = minJurorStake || BigInt(5 * 10**17); // Default to 0.5 cUSD

      // Check balance
      if (cUSDBalance && cUSDBalance < stakeAmount) {
        toast({
          title: "Insufficient Balance",
          description: `You need at least ${Number(stakeAmount) / 10**18} cUSD to stake`,
          variant: "destructive",
        });
        setIsApproving(false);
        return;
      }

      // Step 1: Approve cUSD
      toast({
        title: "Approving cUSD",
        description: "Please approve the stake amount...",
      });

      const approveTx = prepareContractCall({
        contract: tokenContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [contract.address, stakeAmount],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(approveTx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      setIsApproving(false);

      // Step 2: Stake
      toast({
        title: "Staking",
        description: "Joining the juror pool...",
      });

      const stakeTx = prepareContractCall({
        contract,
        method: "function stakeForJury()",
        params: [],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(stakeTx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Staked Successfully!",
        description: "You are now eligible to be selected as a juror for disputes.",
      });

      refetchJurorStake();
    } catch (error) {
      console.error("Error staking:", error);
      toast({
        title: "Staking Failed",
        description: error instanceof Error ? error.message : "There was an error staking",
        variant: "destructive",
      });
      setIsApproving(false);
    }
  };

  const handleUnstake = async () => {
    if (!account) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    if (!canUnstake) {
      toast({
        title: "Stake Locked",
        description: "Your stake is currently locked. Please wait until the lock period expires.",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Unstaking",
        description: "Removing your stake from the juror pool...",
      });

      const unstakeTx = prepareContractCall({
        contract,
        method: "function unstakeFromJury()",
        params: [],
      });

      await new Promise((resolve, reject) => {
        sendTransaction(unstakeTx, {
          onSuccess: resolve,
          onError: reject,
        });
      });

      toast({
        title: "Unstaked Successfully!",
        description: "Your stake has been returned to your wallet.",
      });

      refetchJurorStake();
    } catch (error) {
      console.error("Error unstaking:", error);
      toast({
        title: "Unstaking Failed",
        description: error instanceof Error ? error.message : "There was an error unstaking",
        variant: "destructive",
      });
    }
  };

  const formatTimestamp = (timestamp: bigint) => {
    if (timestamp === BigInt(0)) return "Not locked";
    const date = new Date(Number(timestamp) * 1000);
    return date.toLocaleString();
  };

  if (!account) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Juror Dashboard</CardTitle>
            <CardDescription>Connect your wallet to participate as a juror</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Please connect your wallet to stake and participate in the juror system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Juror Dashboard</h1>
        <p className="text-muted-foreground">
          Stake cUSD to become eligible for selection as a juror in market disputes
        </p>
      </div>

      {/* Stake Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Your Juror Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Stake</p>
              <p className="text-2xl font-bold">
                {(Number(jurorStake) / 10**18).toFixed(2)} cUSD
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Total Jurors</p>
              <p className="text-2xl font-bold">
                {jurorCount?.toString() || "0"}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Your Balance</p>
              <p className="text-2xl font-bold">
                {cUSDBalance ? (Number(cUSDBalance) / 10**18).toFixed(2) : "0.00"} cUSD
              </p>
            </div>
          </div>

          {isStaked && (
            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                {canUnstake ? (
                  <Unlock className="h-4 w-4 text-green-600" />
                ) : (
                  <Lock className="h-4 w-4 text-blue-600" />
                )}
                <p className="font-semibold">
                  {canUnstake ? "Stake Unlocked" : "Stake Locked"}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                {canUnstake 
                  ? "You can now unstake your funds"
                  : `Unlock time: ${formatTimestamp(unlockTime)}`
                }
              </p>
            </div>
          )}

          <div className="flex gap-4">
            {!isStaked ? (
              <Button
                onClick={handleStake}
                disabled={isPending || isApproving}
                className="flex-1"
              >
                {isApproving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Approving...
                  </>
                ) : isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Staking...
                  </>
                ) : (
                  `Stake ${minJurorStake ? (Number(minJurorStake) / 10**18).toFixed(2) : "0.5"} cUSD`
                )}
              </Button>
            ) : (
              <Button
                onClick={handleUnstake}
                disabled={isPending || !canUnstake}
                variant="outline"
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Unstaking...
                  </>
                ) : (
                  "Unstake"
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
              1
            </div>
            <div>
              <p className="font-semibold mb-1">Stake to Join</p>
              <p className="text-muted-foreground">
                Stake the minimum required cUSD to join the juror pool and become eligible for selection.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
              2
            </div>
            <div>
              <p className="font-semibold mb-1">Get Selected</p>
              <p className="text-muted-foreground">
                When a market outcome is disputed, 10 jurors are randomly selected from the pool.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0 mt-0.5">
              3
            </div>
            <div>
              <p className="font-semibold mb-1">Vote & Earn</p>
              <p className="text-muted-foreground">
                Vote on the correct outcome. Jurors who vote with the majority earn rewards. Those who don&apos;t vote or vote incorrectly get slashed.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Trophy className="text-yellow-600 w-6 h-6 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-1">Claim Rewards</p>
              <p className="text-muted-foreground">
                After a dispute is finalized, claim your rewards from the market page if you voted with the majority.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

