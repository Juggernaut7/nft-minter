# NFT Minter Program API Documentation

## Overview

The NFT Minter Program is a Solana smart contract built with Anchor framework that leverages Metaplex Core (`mpl-core`) for NFT operations. It provides three main functionalities:

1. **NFT Minting** - Create new NFTs with customizable attributes
2. **Metadata Updates** - Update NFT attributes with time-based restrictions
3. **NFT Evolution** - Automatic evolution system based on time and conditions

## Program ID

```
C9PLf3qMCVqtUCJtEBy8NCcseNp3KTZwFJxAtDdN1bto
```

## Instructions

### 1. Mint NFT

Creates a new NFT with initial metadata and attributes.

**Parameters:**
- `name: String` - The name of the NFT
- `uri: String` - URI pointing to the NFT's metadata JSON
- `level: u64` - Initial level of the NFT
- `rarity: String` - Initial rarity (Common, Uncommon, Rare, Epic, Legendary)

**Accounts:**
- `payer: Signer` - The account paying for the transaction
- `asset: AccountInfo` - The NFT asset account (mut)
- `collection: AccountInfo` - The collection account (mut)
- `mpl_core_program: AccountInfo` - Metaplex Core program
- `system_program: Program<System>` - Solana System Program

**Example:**
```typescript
await program.methods
  .mintNft("My NFT", "https://example.com/metadata.json", 1, "Common")
  .accounts({
    payer: wallet.publicKey,
    asset: assetKeypair.publicKey,
    collection: collectionKeypair.publicKey,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([assetKeypair, collectionKeypair])
  .rpc();
```

### 2. Update NFT Metadata

Updates NFT attributes with validation and time restrictions.

**Parameters:**
- `new_level: u64` - New level for the NFT
- `min_time_elapsed: i64` - Minimum time that must pass since last update
- `new_rarity: Option<String>` - Optional new rarity

**Accounts:**
- `payer: Signer` - The account paying for the transaction
- `asset: AccountInfo` - The NFT asset account (mut)
- `nft_state: Account<NftState>` - PDA tracking NFT state (init_if_needed)
- `mpl_core_program: AccountInfo` - Metaplex Core program
- `system_program: Program<System>` - Solana System Program

**Example:**
```typescript
await program.methods
  .updateNftMetadata(5, 3600, "Rare") // Level 5, 1 hour cooldown, Rare rarity
  .accounts({
    payer: wallet.publicKey,
    asset: nftAsset.publicKey,
    nftState: nftStatePda,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Evolve NFT

Automatically evolves the NFT based on time and current level conditions.

**Parameters:**
None (uses on-chain state and time)

**Accounts:**
- `payer: Signer` - The account paying for the transaction
- `asset: AccountInfo` - The NFT asset account (mut)
- `nft_state: Account<NftState>` - PDA tracking NFT state (mut)
- `mpl_core_program: AccountInfo` - Metaplex Core program
- `system_program: Program<System>` - Solana System Program

**Example:**
```typescript
await program.methods
  .evolveNft()
  .accounts({
    payer: wallet.publicKey,
    asset: nftAsset.publicKey,
    nftState: nftStatePda,
    mplCoreProgram: MPL_CORE_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

## Account Structures

### NftState

PDA account that tracks NFT metadata and evolution state.

```rust
pub struct NftState {
    pub level: u64,           // Current NFT level
    pub rarity: String,       // Current rarity
    pub mint_date: i64,       // Unix timestamp when NFT was minted
    pub last_updated: i64,    // Unix timestamp of last update
    pub evolution_count: u64, // Number of times NFT has evolved
}
```

**PDA Seeds:**
- `["nft_state", asset.key().as_ref()]`

**Space Calculation:**
- `8 + 8 + 8 + 32 + 8 + 8 = 72 bytes`

## Error Codes

| Error | Code | Description |
|-------|------|-------------|
| `UpdateTooSoon` | 0 | Cannot update metadata before cooldown period |
| `InvalidLevelProgression` | 1 | Level must increase, cannot go backwards |
| `EvolutionNotReady` | 2 | NFT doesn't meet evolution requirements |

## Evolution System

The evolution system automatically upgrades NFTs based on:

1. **Time Requirements**: Each level requires `level * 86400` seconds (1 day per level)
2. **Rarity Progression**: Common → Uncommon → Rare → Epic → Legendary → Mythic
3. **Level Increment**: Each evolution increases level by 1

**Evolution Formula:**
```
evolution_threshold = current_level * 86400 seconds
time_since_mint >= evolution_threshold
```

## Integration Examples

### Client-Side Integration

```typescript
import { Program } from "@coral-xyz/anchor";
import { NftMinter } from "./target/types/nft_minter";

// Initialize program
const program = new Program<NftMinter>(idl, programId, provider);

// Mint NFT
const mintTx = await program.methods
  .mintNft("My NFT", "https://example.com/metadata.json", 1, "Common")
  .accounts({...})
  .rpc();

// Update metadata
const updateTx = await program.methods
  .updateNftMetadata(5, 0, "Rare")
  .accounts({...})
  .rpc();
```

### Frontend Integration

```typescript
// React hook for NFT operations
const useNftMinter = () => {
  const mintNft = async (name: string, uri: string, level: number, rarity: string) => {
    try {
      const tx = await program.methods
        .mintNft(name, uri, level, rarity)
        .accounts({...})
        .rpc();
      return { success: true, tx };
    } catch (error) {
      return { success: false, error };
    }
  };

  return { mintNft };
};
```

## Best Practices

1. **Error Handling**: Always handle potential errors from the program
2. **Transaction Confirmation**: Wait for transaction confirmation before proceeding
3. **State Validation**: Verify account states after operations
4. **Gas Estimation**: Estimate transaction costs before execution
5. **Retry Logic**: Implement retry mechanisms for failed transactions

## Security Considerations

1. **Authority Validation**: Ensure proper authority checks
2. **Input Validation**: Validate all user inputs
3. **Time Manipulation**: Be aware of potential time-based attacks
4. **Account Validation**: Verify account ownership and permissions

## Testing

Run the test suite:

```bash
# Run all tests
anchor test

# Run specific test file
anchor test tests/nft_minter_test.ts

# Run with verbose output
anchor test -- --verbose
```

## Deployment

Deploy to different networks:

```bash
# Local development
anchor deploy

# Devnet
anchor deploy --provider.cluster devnet

# Mainnet (use with caution)
anchor deploy --provider.cluster mainnet
``` 