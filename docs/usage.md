# NFT Minter Usage Guide

## Quick Start

This guide will walk you through using the NFT Minter program to create, update, and evolve NFTs on Solana.

## Prerequisites

- Solana wallet with SOL (for transaction fees)
- Access to Solana network (local, devnet, or mainnet)
- Basic understanding of Solana transactions

## Basic Operations

### 1. Minting Your First NFT

#### Step 1: Prepare Metadata

Create a metadata JSON file for your NFT:

```json
{
  "name": "My First NFT",
  "symbol": "MFN",
  "description": "This is my first NFT created with the NFT Minter program",
  "image": "https://example.com/image.png",
  "attributes": [
    {
      "trait_type": "Level",
      "value": "1"
    },
    {
      "trait_type": "Rarity",
      "value": "Common"
    }
  ]
}
```

Upload this to IPFS or your preferred storage service and note the URI.

#### Step 2: Mint the NFT

```typescript
import { Program } from "@coral-xyz/anchor";
import { NftMinter } from "./target/types/nft_minter";
import { Keypair, SystemProgram } from "@solana/web3.js";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";

// Initialize program
const program = new Program<NftMinter>(idl, programId, provider);

// Generate keypairs for asset and collection
const asset = Keypair.generate();
const collection = Keypair.generate();

// Mint NFT
const mintTx = await program.methods
  .mintNft(
    "My First NFT",                    // name
    "https://ipfs.io/ipfs/...",       // metadata URI
    1,                                 // initial level
    "Common"                           // initial rarity
  )
  .accounts({
    payer: wallet.publicKey,
    asset: asset.publicKey,
    collection: collection.publicKey,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([asset, collection])
  .rpc();

console.log("NFT minted! Transaction:", mintTx);
console.log("Asset address:", asset.publicKey.toString());
```

### 2. Updating NFT Metadata

#### Step 1: Update Level and Rarity

```typescript
// Derive PDA for NFT state
const nftState = PublicKey.findProgramAddressSync(
  [Buffer.from("nft_state"), asset.publicKey.toBuffer()],
  program.programId
)[0];

// Update metadata
const updateTx = await program.methods
  .updateNftMetadata(
    5,                    // new level
    3600,                 // minimum time elapsed (1 hour in seconds)
    "Rare"                // new rarity
  )
  .accounts({
    payer: wallet.publicKey,
    asset: asset.publicKey,
    nftState: nftState,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();

console.log("Metadata updated! Transaction:", updateTx);
```

#### Step 2: Check Update Restrictions

The program enforces several rules:

- **Level Progression**: Can only increase levels, never decrease
- **Time Cooldown**: Must wait specified time between updates
- **Authority**: Only the NFT owner can update metadata

```typescript
// This will fail - can't decrease level
try {
  await program.methods
    .updateNftMetadata(1, 0, null) // Level 1 < current level
    .accounts({...})
    .rpc();
} catch (error) {
  console.log("Error:", error.message); // "InvalidLevelProgression"
}

// This will fail - too soon to update
try {
  await program.methods
    .updateNftMetadata(6, 86400, null) // 24 hour cooldown
    .accounts({...})
    .rpc();
} catch (error) {
  console.log("Error:", error.message); // "UpdateTooSoon"
}
```

### 3. NFT Evolution

#### Automatic Evolution

The evolution system automatically upgrades NFTs based on time and level:

```typescript
// Check if NFT is ready for evolution
const nftStateAccount = await program.account.nftState.fetch(nftState);
const currentTime = Math.floor(Date.now() / 1000);
const timeSinceMint = currentTime - nftStateAccount.mintDate.toNumber();
const evolutionThreshold = nftStateAccount.level.toNumber() * 86400; // 1 day per level

if (timeSinceMint >= evolutionThreshold) {
  // Evolve the NFT
  const evolveTx = await program.methods
    .evolveNft()
    .accounts({
      payer: wallet.publicKey,
      asset: asset.publicKey,
      nftState: nftState,
      mplCoreProgram: MPL_CORE_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("NFT evolved! Transaction:", evolveTx);
} else {
  console.log("NFT not ready for evolution yet");
  console.log(`Time remaining: ${evolutionThreshold - timeSinceMint} seconds`);
}
```

#### Evolution Rules

- **Time Requirement**: Each level requires `level × 24 hours` to evolve
- **Rarity Progression**: Common → Uncommon → Rare → Epic → Legendary → Mythic
- **Level Increment**: Each evolution increases level by 1

## Advanced Usage

### 1. Batch Operations

#### Mint Multiple NFTs

```typescript
const batchMint = async (nfts: Array<{name: string, uri: string, level: number, rarity: string}>) => {
  const transactions = [];
  
  for (const nft of nfts) {
    const asset = Keypair.generate();
    
    const tx = await program.methods
      .mintNft(nft.name, nft.uri, nft.level, nft.rarity)
      .accounts({
        payer: wallet.publicKey,
        asset: asset.publicKey,
        collection: collection.publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([asset, collection])
      .transaction();
    
    transactions.push({ tx, asset, collection });
  }
  
  return transactions;
};

// Usage
const nfts = [
  { name: "NFT #1", uri: "https://...", level: 1, rarity: "Common" },
  { name: "NFT #2", uri: "https://...", level: 3, rarity: "Uncommon" },
  { name: "NFT #3", uri: "https://...", level: 5, rarity: "Rare" }
];

const batch = await batchMint(nfts);
console.log(`Created ${batch.length} NFTs`);
```

### 2. Event Monitoring

#### Listen to Program Events

```typescript
// Listen for NFT minted events
const subscriptionId = connection.onProgramAccountChange(
  program.programId,
  (accountInfo, context) => {
    console.log("Program account changed:", accountInfo.accountId.toString());
    
    // Parse the account data
    try {
      const nftState = program.coder.accounts.decode(
        "NftState",
        accountInfo.accountInfo.data
      );
      console.log("NFT State updated:", nftState);
    } catch (error) {
      // Not an NftState account
    }
  }
);

// Clean up subscription
connection.removeProgramAccountChangeListener(subscriptionId);
```

### 3. Error Handling

#### Comprehensive Error Handling

```typescript
const mintNftWithRetry = async (name: string, uri: string, level: number, rarity: string, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const asset = Keypair.generate();
      const collection = Keypair.generate();
      
      const tx = await program.methods
        .mintNft(name, uri, level, rarity)
        .accounts({
          payer: wallet.publicKey,
          asset: asset.publicKey,
          collection: collection.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([asset, collection])
        .rpc();
      
      return { success: true, tx, asset, collection };
      
    } catch (error) {
      console.log(`Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        return { success: false, error };
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Usage
const result = await mintNftWithRetry("Retry NFT", "https://...", 1, "Common");
if (result.success) {
  console.log("NFT minted after retries:", result.tx);
} else {
  console.error("Failed after all retries:", result.error);
}
```

## Integration Examples

### 1. React Hook

```typescript
import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Program } from '@coral-xyz/anchor';

export const useNftMinter = (program: Program<NftMinter>) => {
  const { publicKey, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mintNft = useCallback(async (
    name: string,
    uri: string,
    level: number,
    rarity: string
  ) => {
    if (!publicKey) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const asset = Keypair.generate();
      const collection = Keypair.generate();
      
      const tx = await program.methods
        .mintNft(name, uri, level, rarity)
        .accounts({
          payer: publicKey,
          asset: asset.publicKey,
          collection: collection.publicKey,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([asset, collection])
        .rpc();

      return { success: true, tx, asset, collection };
      
    } catch (err) {
      const errorMessage = err.message || "Failed to mint NFT";
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  return { mintNft, loading, error };
};
```

### 2. Next.js API Route

```typescript
// pages/api/mint-nft.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { Program } from '@coral-xyz/anchor';
import { NftMinter } from '../../../target/types/nft_minter';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, uri, level, rarity, walletPublicKey } = req.body;

    // Validate input
    if (!name || !uri || !level || !rarity || !walletPublicKey) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Initialize program (you'll need to set up the provider)
    const program = new Program<NftMinter>(idl, programId, provider);

    // Mint NFT
    const asset = Keypair.generate();
    const collection = Keypair.generate();
    
    const tx = await program.methods
      .mintNft(name, uri, level, rarity)
      .accounts({
        payer: new PublicKey(walletPublicKey),
        asset: asset.publicKey,
        collection: collection.publicKey,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .signers([asset, collection])
      .rpc();

    res.status(200).json({
      success: true,
      transaction: tx,
      asset: asset.publicKey.toString(),
      collection: collection.publicKey.toString()
    });

  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      error: error.message 
    });
  }
}
```

## Best Practices

### 1. Transaction Management

- **Confirm Transactions**: Always wait for transaction confirmation
- **Handle Failures**: Implement proper error handling and retry logic
- **Gas Estimation**: Estimate transaction costs before execution

### 2. Security

- **Validate Inputs**: Always validate user inputs on both client and server
- **Authority Checks**: Verify account ownership before operations
- **Error Messages**: Don't expose sensitive information in error messages

### 3. Performance

- **Batch Operations**: Group multiple operations when possible
- **Connection Management**: Reuse connections and providers
- **Caching**: Cache frequently accessed data

### 4. User Experience

- **Loading States**: Show loading indicators during operations
- **Progress Updates**: Provide feedback on transaction progress
- **Error Recovery**: Guide users on how to resolve errors

## Testing Your Integration

### 1. Local Testing

```bash
# Start local validator
solana-test-validator

# Run tests
anchor test

# Test your integration
npm run test:integration
```

### 2. Devnet Testing

```bash
# Deploy to devnet
anchor deploy --provider.cluster devnet

# Test against devnet
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com npm run test
```

### 3. Test Scenarios

- **Happy Path**: Successful NFT minting and updates
- **Error Cases**: Invalid inputs, insufficient funds, unauthorized access
- **Edge Cases**: Maximum values, boundary conditions
- **Performance**: Large batches, concurrent operations

## Troubleshooting

### Common Issues

1. **Transaction Failed**: Check wallet balance and network status
2. **Account Not Found**: Verify account addresses and program deployment
3. **Invalid Instruction**: Check instruction parameters and account structure
4. **Insufficient Funds**: Ensure wallet has enough SOL for fees

### Debug Tips

1. **Enable Logs**: Use `--verbose` flag with anchor test
2. **Check Explorer**: Verify transactions on Solana Explorer
3. **Program Logs**: Monitor program logs for detailed error information
4. **Account State**: Inspect account data to understand current state

---

**Need Help?** Check the [Setup Guide](setup.md) or [API Documentation](api.md) for more details. 