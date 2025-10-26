'use client'

import { useState } from "react";
import { useActiveAccount, useReadContract, useSendTransaction, lightTheme, ConnectButton } from "thirdweb/react";
import { prepareContractCall } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { contract, celoSepolia } from "@/constants/contract";
import { client } from "@/app/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

export function AdminDashboard() {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending } = useSendTransaction();

  // Configure wallets
  const wallets = [
    inAppWallet({
      auth: {
        options: ["google", "email", "passkey", "phone", "apple", "facebook"],
      },
    }),
    createWallet("io.metamask"),
    createWallet("me.rainbow"),
    createWallet("walletConnect"),
    createWallet("app.phantom"),
  ];

  // Authentication handlers
  const handleLogin = async (params: { payload: Record<string, unknown>; signature: string }) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          payload: params.payload,
          signature: params.signature,
        }),
      });

      if (!response.ok) {
        throw new Error("Login failed");
      }

      const data = await response.json();
      console.log("Login successful:", data);
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      console.log("Logout successful");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const getLoginPayload = async (params: { address: string; chainId: number }) => {
    try {
      const response = await fetch("/api/auth/payload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          address: params.address,
          chainId: params.chainId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get login payload");
      }

      const payload = await response.json();
      return payload;
    } catch (error) {
      console.error("Get payload error:", error);
      throw error;
    }
  };

  const checkLoginStatus = async () => {
    try {
      const response = await fetch("/api/auth/status");

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      return data.isLoggedIn || false;
    } catch (error) {
      console.error("Status check error:", error);
      return false;
    }
  };

  // Get current stake amounts
  const { data: marketCreationStake } = useReadContract({
    contract,
    method: "function marketCreationStakeAmount() view returns (uint256)",
    params: []
  });

  const { data: proposalBond } = useReadContract({
    contract,
    method: "function proposalBondAmount() view returns (uint256)",
    params: []
  });

  // Get contract owner
  const { data: contractOwner } = useReadContract({
    contract,
    method: "function owner() view returns (address)",
    params: []
  });

  // Get juror count
  const { data: jurorCount } = useReadContract({
    contract,
    method: "function getJurorCount() view returns (uint256)",
    params: []
  });

  const [newMarketStake, setNewMarketStake] = useState("");
  const [newProposalBond, setNewProposalBond] = useState("");


  const handleSetMarketStake = async () => {
    if (!newMarketStake || parseFloat(newMarketStake) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid stake amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert to 6-decimal token format
      const amountInCUSD = BigInt(Math.floor(parseFloat(newMarketStake) * 1e6));

      const tx = prepareContractCall({
        contract,
        method: "function setMarketCreationStakeAmount(uint256 _newAmount)",
        params: [amountInCUSD],
      });

      await sendTransaction(tx);

      toast({
        title: "Market Stake Updated",
        description: `New market creation stake set to ${newMarketStake}.`,
      });

      setNewMarketStake("");
    } catch (error) {
      console.error("Error setting stake amount:", error);
      toast({
        title: "Transaction Failed",
        description: "Failed to update stake amount. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSetProposalBond = async () => {
    if (!newProposalBond || parseFloat(newProposalBond) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid bond amount.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Convert to 6-decimal token format
      const amountInCUSD = BigInt(Math.floor(parseFloat(newProposalBond) * 1e6));

      const tx = prepareContractCall({
        contract,
        method: "function setProposalBondAmount(uint256 _newAmount)",
        params: [amountInCUSD],
      });

      await sendTransaction(tx);

      toast({
        title: "Proposal Bond Updated",
        description: `New proposal bond set to ${newProposalBond}.`,
      });

      setNewProposalBond("");
    } catch (error) {
      console.error("Error setting bond amount:", error);
      toast({
        title: "Transaction Failed",
        description: "Failed to update bond amount. Please try again.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="flex justify-end mb-6">
        <ConnectButton
          auth={{
            doLogin: handleLogin,
            doLogout: handleLogout,
            getLoginPayload: getLoginPayload,
            isLoggedIn: checkLoginStatus,
          }}
          client={client}
          theme={lightTheme()}
          chain={celoSepolia}
          connectButton={{
            label: "Sign In",
          }}
          connectModal={{
            size: "compact",
          }}
          detailsButton={{
            displayBalanceToken: {
              [celoSepolia.id]: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b"
            }
          }}
          wallets={wallets}
        />
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage contract settings for the optimistic oracle system. Only the contract owner can execute admin transactions.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Set Market Creation Stake */}
        <Card>
          <CardHeader>
            <CardTitle>Market Creation Stake</CardTitle>
            <CardDescription>
              Amount required to create a new market (returned if resolved fairly)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentMarketStake">Current Amount</Label>
              <div className="text-sm text-muted-foreground">
                {marketCreationStake ? `${Number(marketCreationStake) / 10**6}` : "Loading..."}
              </div>
            </div>

            <div>
              <Label htmlFor="newMarketStake">New Amount</Label>
              <Input
                id="newMarketStake"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.10"
                value={newMarketStake}
                onChange={(e) => setNewMarketStake(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSetMarketStake}
              disabled={isPending || !newMarketStake}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Market Stake"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Set Proposal Bond */}
        <Card>
          <CardHeader>
            <CardTitle>Proposal Bond Amount</CardTitle>
            <CardDescription>
              Amount required to propose or dispute an outcome
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="currentProposalBond">Current Amount</Label>
              <div className="text-sm text-muted-foreground">
                {proposalBond ? `${Number(proposalBond) / 10**6}` : "Loading..."}
              </div>
            </div>

            <div>
              <Label htmlFor="newProposalBond">New Amount</Label>
              <Input
                id="newProposalBond"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.10"
                value={newProposalBond}
                onChange={(e) => setNewProposalBond(e.target.value)}
              />
            </div>

            <Button
              onClick={handleSetProposalBond}
              disabled={isPending || !newProposalBond}
              className="w-full"
            >
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Proposal Bond"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Contract Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>Contract Address:</strong> {contract.address}</div>
            <div><strong>Owner:</strong> {contractOwner}</div>
            <div><strong>Your Address:</strong> {account?.address}</div>
            <div><strong>Is Owner:</strong> {account?.address?.toLowerCase() === contractOwner?.toLowerCase() ? "Yes" : "No"}</div>
            <div><strong>Total Jurors:</strong> {jurorCount?.toString() || "0"}</div>
          </div>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>How the Optimistic Oracle Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p><strong>1. Propose:</strong> Anyone can propose an outcome after market ends (requires bond)</p>
          <p><strong>2. Dispute Window:</strong> 5-minute window for anyone to dispute the proposed outcome</p>
          <p><strong>3. Jury Selection:</strong> If disputed, 10 random jurors are selected from the staked pool</p>
          <p><strong>4. Jury Voting:</strong> Jurors vote on the correct outcome over 15 minutes</p>
          <p><strong>5. Finalization:</strong> Market resolves based on jury decision, rewards distributed</p>
        </CardContent>
      </Card>
    </div>
  );
}
