import { ConnectButton, lightTheme, darkTheme, useActiveAccount } from "thirdweb/react";
import { useTheme } from "next-themes";
import { client } from "@/app/client";
import { celoSepolia } from "@/constants/contract";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { Button } from "@/components/ui/button";
import { Plus, Scale } from "lucide-react";
import { useState } from "react";
import { ProposeMarketForm } from "./propose-market-form";
import { ThemeToggle } from "./theme-toggle";
import Link from "next/link";

export function Navbar() {
    const [showProposeForm, setShowProposeForm] = useState(false);
    const account = useActiveAccount();
    const { theme } = useTheme();


    // Configure wallets
    const wallets = [
        inAppWallet({
            auth: {
                options: ["google", "email", "passkey", "phone", "apple", "facebook"],
            },
            // Configure for localhost development
            partnerId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID,
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

    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-3">
                    <img
                        src={theme === "light" ? "/lightlogo.png" : "/darklogo.png"}
                        alt="Thynk Logo"
                        className="h-10 w-10 sm:h-12 sm:w-12"
                    />
                    <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'var(--font-intro-rust)' }}>THYNK</h1>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <ThemeToggle />
                    {account && (
                        <>
                            <Link href="/juror">
                                <Button
                                    variant="outline"
                                    className="w-full sm:w-auto"
                                >
                                    <Scale className="mr-2 h-4 w-4" />
                                    Juror
                                </Button>
                            </Link>
                            <Button
                                onClick={() => setShowProposeForm(true)}
                                variant="outline"
                                className="w-full sm:w-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Propose Market
                            </Button>
                        </>
                    )}
                    <div className="w-full sm:w-auto">
                        <ConnectButton
                            auth={{
                                doLogin: handleLogin,
                                doLogout: handleLogout,
                                getLoginPayload: getLoginPayload,
                                isLoggedIn: checkLoginStatus,
                            }}
                            client={client}
                            theme={theme === "dark" ? darkTheme() : lightTheme()}
                            chain={celoSepolia}
                            wallets={wallets}
                            connectButton={{
                                label: "Sign In",
                                className: "w-full sm:w-auto",
                            }}
                            connectModal={{
                                size: "compact",
                            }}
                            detailsButton={{
                                displayBalanceToken: {
                                    [celoSepolia.id]: "0xdE9e4C3ce781b4bA68120d6261cbad65ce0aB00b"
                                },
                                className: "w-full sm:w-auto",
                            }}
                        />
                    </div>
                </div>
            </div>
            {showProposeForm && (
                <ProposeMarketForm
                    isOpen={true}
                    onClose={() => setShowProposeForm(false)}
                    onMarketCreated={() => {
                        // Refresh the market count or trigger a refetch
                        window.location.reload();
                    }}
                />
            )}
        </>
    );
}
