'use client'

import { useState } from "react";
import { useActiveAccount, useSendTransaction, useReadContract } from "thirdweb/react";
import { prepareContractCall, parseEventLogs, prepareEvent, waitForReceipt } from "thirdweb";
import { contract, tokenContract } from "@/constants/contract";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, X, AlertCircle, Upload } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import Image from "next/image";

interface ProposeMarketFormProps {
  isOpen: boolean;
  onClose: () => void;
  onMarketCreated: () => void;
}

export function ProposeMarketForm({ isOpen, onClose, onMarketCreated }: ProposeMarketFormProps) {
  const account = useActiveAccount();
  const { toast } = useToast();
  const { mutate: sendTransaction, isPending: isTransactionPending } = useSendTransaction();

  // Check user's USDC balance
  const { data: usdcBalance } = useReadContract({
    contract: tokenContract,
    method: "function balanceOf(address account) view returns (uint256)",
    params: [account?.address || "0x0000000000000000000000000000000000000000"] as const,
  });

  const [formData, setFormData] = useState({
    question: "",
    optionA: "",
    optionB: "",
    resolutionTimestamp: "",
    description: "",
  });

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [isApproving, setIsApproving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const requiredUSDC = BigInt(10**5); // 0.1 token (6 decimals)
  const hasEnoughBalance = usdcBalance ? usdcBalance >= requiredUSDC : false;

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage || !account) return null;

    try {
      setIsUploading(true);
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${Date.now()}-${account.address}.${fileExt}`;

      const { error } = await supabase.storage
        .from('market-images')
        .upload(fileName, selectedImage);

      if (error) {
        console.error('Upload error:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('market-images')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Image upload failed:', error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const validateForm = () => {
    if (!formData.question.trim()) return "Question is required";
    if (!formData.optionA.trim()) return "Option A is required";
    if (!formData.optionB.trim()) return "Option B is required";
    if (!formData.resolutionTimestamp) return "Resolution time is required";
    if (!formData.description.trim()) return "Description is required";
    if (!selectedImage) return "Image is required";

    const resolutionTime = new Date(formData.resolutionTimestamp).getTime();
    const now = Date.now();

    if (resolutionTime <= now) return "Resolution time must be in the future";

    // Minimum 10 minutes, maximum 365 days
    const tenMinutes = 10 * 60 * 1000;
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    if (resolutionTime - now < tenMinutes) return "Market must run for at least 10 minutes";
    if (resolutionTime - now > oneYear) return "Market cannot run for more than 365 days";

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validateForm();
    if (validationError) {
      toast({
        title: "Validation Error",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    if (!account) {
      toast({
        title: "Error",
        description: "Please connect your wallet first",
        variant: "destructive",
      });
      return;
    }

    try {
      // Step 1: Upload image to Supabase storage
      toast({
        title: "Uploading Image",
        description: "Please wait while we upload your image...",
      });

      const imageUrl = await uploadImage();
      if (!imageUrl) {
        throw new Error("Failed to upload image");
      }

      toast({
        title: "Image Uploaded",
        description: "Now approving USDC for market creation...",
      });

      setIsApproving(true);

      // Step 2: Approve token transfer
      // Approve 100,000 tokens to avoid repeated approvals (100,000 * 10^6 with 6 decimals)
      const approvalAmount = BigInt(100_000) * BigInt(10**6);

      const approveTx = prepareContractCall({
        contract: tokenContract,
        method: "function approve(address spender, uint256 amount) returns (bool)",
        params: [contract.address, approvalAmount],
      });

      // Wait for approval transaction to complete
      await new Promise((resolve, reject) => {
        sendTransaction(approveTx, {
          onSuccess: (result) => {
            console.log("Approval successful:", result);
            resolve(result);
          },
          onError: (error) => {
            console.error("Approval failed:", error);
            reject(error);
          }
        });
      });

      setIsApproving(false);

      toast({
        title: "USDC Approved",
        description: "Now creating your market on-chain...",
      });

      // Step 3: Send on-chain transaction to propose market
      const resolutionTimestamp = Math.floor(new Date(formData.resolutionTimestamp).getTime() / 1000);

      const proposeTx = prepareContractCall({
        contract,
        method: "function proposeMarket(string _question, string _optionA, string _optionB, uint256 _resolutionTimestamp) returns (uint256)",
        params: [
          formData.question.trim(),
          formData.optionA.trim(),
          formData.optionB.trim(),
          BigInt(resolutionTimestamp)
        ],
      });

      // Send the transaction and wait for it to be mined
      const txResult = await new Promise<{ transactionHash: `0x${string}` }>((resolve, reject) => {
        sendTransaction(proposeTx, {
          onSuccess: (result) => {
            console.log("Market creation transaction sent:", result);
            resolve(result);
          },
          onError: (error) => {
            console.error("Market creation transaction failed:", error);
            reject(error);
          }
        });
      });

      // Wait for the transaction to be mined and get the receipt
      const receipt = await waitForReceipt({
        transactionHash: txResult.transactionHash,
        chain: contract.chain,
        client: contract.client,
      });
      console.log("Market creation transaction mined:", receipt);

      // Parse the event logs to get the marketId with retry logic
      let marketId: bigint | null = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries && !marketId) {
        try {
          // Add a small delay between retries to allow for potential network delays
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }

          const marketCreatedEvent = prepareEvent({
            signature: "event MarketCreated(uint256 indexed marketId, address indexed proposer, string question, uint256 endTime)",
          });

          const events = parseEventLogs({
            logs: receipt.logs,
            events: [marketCreatedEvent],
          });

          console.log(`Parsed ${events.length} events from transaction logs`);

          // Find our event and extract the marketId
          if (events.length > 0) {
            marketId = events[0].args.marketId;
            console.log("Market ID extracted:", marketId, "from event:", events[0]);
          } else {
            console.log("Available logs in transaction:", receipt.logs.map((log, index) => ({
              index,
              address: log.address,
              topicsCount: log.topics?.length || 0,
              dataLength: log.data?.length || 0
            })));
            throw new Error("MarketCreated event not found in transaction logs.");
          }
        } catch (e) {
          console.error(`Failed to parse logs (attempt ${retryCount + 1}/${maxRetries}):`, e);
          retryCount++;

          if (retryCount >= maxRetries) {
            throw new Error("Failed to parse transaction logs to get market ID after multiple attempts.");
          }
        }
      }

      if (!marketId) {
        throw new Error("Failed to extract market ID from transaction logs.");
      }

      // Close form immediately after successful on-chain creation
      toast({
        title: "Market Created Successfully!",
        description: "Your market has been created on-chain. Saving additional details...",
      });

      // Reset form and close modal immediately
      setFormData({
        question: "",
        optionA: "",
        optionB: "",
        resolutionTimestamp: "",
        description: "",
      });
      setSelectedImage(null);
      setImagePreview(null);
      onClose();
      onMarketCreated();

      // Step 4: Save off-chain data to API
      const response = await fetch('/api/markets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          market_id: Number(marketId),
          description: formData.description.trim(),
          image_url: imageUrl,
          proposer_address: account.address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save market details');
      }

      // Market details saved successfully - show a subtle success message
      toast({
        title: "Details Saved",
        description: "Market image and description have been saved.",
      });

    } catch (error) {
      console.error("Error proposing market:", error);
      toast({
        title: "Transaction Failed",
        description: error instanceof Error ? error.message : "There was an error creating your market. Please try again.",
        variant: "destructive",
      });
      setIsApproving(false);
      setIsUploading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-background p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Propose a New Market</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="question">Question</Label>
            <Textarea
              id="question"
              placeholder="What do you want to predict?"
              value={formData.question}
              onChange={(e) => handleInputChange("question", e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Provide more details about your market..."
              value={formData.description}
              onChange={(e) => handleInputChange("description", e.target.value)}
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="image">Market Image</Label>
            <div className="flex flex-col space-y-2">
              <div className="relative flex items-center">
                <Input
                  id="image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full"
                />
              </div>
              {imagePreview && (
                <div className="relative w-full h-48">
                  <Image
                    src={imagePreview}
                    alt="Preview"
                    fill
                    className="object-cover rounded-lg border"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 z-10"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="optionA">Option A</Label>
              <Input
                id="optionA"
                placeholder="Yes / Option A"
                value={formData.optionA}
                onChange={(e) => handleInputChange("optionA", e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="optionB">Option B</Label>
              <Input
                id="optionB"
                placeholder="No / Option B"
                value={formData.optionB}
                onChange={(e) => handleInputChange("optionB", e.target.value)}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="resolutionTime">Resolution Time</Label>
            <Input
              id="resolutionTime"
              type="datetime-local"
              value={formData.resolutionTimestamp}
              onChange={(e) => handleInputChange("resolutionTimestamp", e.target.value)}
            />
            <p className="text-sm text-muted-foreground mt-1">
              Market must end between 10 minutes and 365 days from now
            </p>
          </div>

          <div className="bg-muted p-3 rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              <strong>Stake Required:</strong> 0.1 tokens will be locked as collateral.
              You&apos;ll get it back if your market is resolved fairly, or it may be slashed for invalid/spam markets.
            </p>
            {usdcBalance !== undefined && (
              <div className="text-sm">
                <span className="text-muted-foreground">Your Token Balance: </span>
                <span className={hasEnoughBalance ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                  {(Number(usdcBalance) / 1e6).toFixed(2)}
                </span>
              </div>
            )}
            {!hasEnoughBalance && usdcBalance !== undefined && (
              <div className="flex items-start gap-2 text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <p>
                  Insufficient token balance. You need 0.1 tokens to create a market. 
                  Please get testnet tokens from a faucet first.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isApproving || isTransactionPending || isUploading || !hasEnoughBalance}
            >
              {isUploading ? (
                <>
                  <Upload className="mr-2 h-4 w-4 animate-spin" />
                Uploading Image...
              </>
              ) : isApproving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving Tokens...
                </>
              ) : isTransactionPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Market...
                </>
              ) : !hasEnoughBalance ? (
                "Insufficient Tokens"
              ) : (
                "Create Market"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
