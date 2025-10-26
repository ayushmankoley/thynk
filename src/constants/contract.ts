import { client } from "@/app/client";
import { getContract } from "thirdweb";
import { defineChain } from "thirdweb/chains";

// Define Celo Sepolia testnet
export const celoSepolia = defineChain({
    id: 11142220,
    name: "Celo Sepolia",
    rpc: "https://forno.celo-sepolia.celo-testnet.org",
    nativeCurrency: {
        name: "CELO",
        symbol: "CELO",
        decimals: 18,
    },
    blockExplorers: [
        {
            name: "Celo Explorer",
            url: "https://explorer.celo.org/sepolia",
        },
    ],
});

export const contractAddress = "0x3a68C64f9d10Fe755e02cF6273cB4603CFf1c398";
export const tokenAddress = "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b"; // cUSD on Celo Sepolia

export const contract = getContract({
    client: client,
    chain: celoSepolia,
    address: contractAddress
});

export const tokenContract = getContract({
    client: client,
    chain: celoSepolia,
    address: tokenAddress
});