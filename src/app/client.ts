// src/client.ts
import { createThirdwebClient } from "thirdweb";

export const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
  // Configure for localhost development
  config: {
    rpc: {
      // Add any custom RPC endpoints if needed
    },
  },
});
