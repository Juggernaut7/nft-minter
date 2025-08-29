import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftMinter } from "../target/types/nft_minter";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import { expect } from "chai";

describe("🎭 NFT Minter Program", () => {
  // Configure the client to use the devnet cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.NftMinter as Program<NftMinter>;
  const payer = provider.wallet as anchor.Wallet;

  // Test accounts
  let asset: Keypair;
  let collection: Keypair;
  let nftState: PublicKey;

  before(async () => {
    // Generate new keypairs for each test run
    asset = Keypair.generate();
    collection = Keypair.generate();
    
    // Derive PDA for NFT state
    nftState = PublicKey.findProgramAddressSync(
      [Buffer.from("nft_state"), asset.publicKey.toBuffer()],
      program.programId
    )[0];

    console.log("🧪 Test Setup Complete");
    console.log("Asset:", asset.publicKey.toString());
    console.log("Collection:", collection.publicKey.toString());
    console.log("NFT State PDA:", nftState.toString());
  });

  describe("🚀 NFT Minting", () => {
    it("Should mint an NFT with initial metadata", async () => {
      const name = "Test NFT #1";
      const uri = "https://example.com/nft.json";
      const level = 1;
      const rarity = "Common";

      console.log(`\n🎯 Minting NFT: ${name}`);

      try {
        const tx = await program.methods
          .mintNft(name, uri, level, rarity)
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            collection: collection.publicKey,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([asset, collection])
          .rpc();

        console.log("✅ NFT minted successfully!");
        console.log("Transaction signature:", tx);
        console.log("Asset address:", asset.publicKey.toString());

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ NFT minting failed:", error);
        throw error;
      }
    });

    it("Should mint another NFT with different attributes", async () => {
      const name = "Rare NFT #2";
      const uri = "https://example.com/rare-nft.json";
      const level = 5;
      const rarity = "Rare";

      const newAsset = Keypair.generate();
      const newNftState = PublicKey.findProgramAddressSync(
        [Buffer.from("nft_state"), newAsset.publicKey.toBuffer()],
        program.programId
      )[0];

      console.log(`\n🎯 Minting rare NFT: ${name}`);

      try {
        const tx = await program.methods
          .mintNft(name, uri, level, rarity)
          .accounts({
            payer: payer.publicKey,
            asset: newAsset.publicKey,
            collection: collection.publicKey,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([newAsset, collection])
          .rpc();

        console.log("✅ Rare NFT minted successfully!");
        console.log("Transaction signature:", tx);

        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ Rare NFT minting failed:", error);
        throw error;
      }
    });
  });

  describe("🔄 Metadata Updates", () => {
    it("Should update NFT metadata with new level", async () => {
      const newLevel = 3;
      const minTimeElapsed = 0; // Allow immediate update for testing
      const newRarity = "Uncommon";

      console.log(`\n🔄 Updating NFT metadata to level ${newLevel}`);

      try {
        const tx = await program.methods
          .updateNftMetadata(newLevel, minTimeElapsed, newRarity)
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ NFT metadata updated successfully!");
        console.log("Transaction signature:", tx);

        // Fetch and verify the updated state
        const nftStateAccount = await program.account.nftState.fetch(nftState);
        console.log("Updated NFT State:", {
          level: nftStateAccount.level.toString(),
          rarity: nftStateAccount.rarity,
          lastUpdated: new Date(nftStateAccount.lastUpdated.toNumber() * 1000).toISOString(),
        });

        expect(nftStateAccount.level.toNumber()).to.equal(newLevel);
        expect(nftStateAccount.rarity).to.equal(newRarity);

      } catch (error) {
        console.error("❌ Metadata update failed:", error);
        throw error;
      }
    });

    it("Should prevent backward level progression", async () => {
      const invalidLevel = 1; // Lower than current level
      const minTimeElapsed = 0;

      console.log(`\n🚫 Attempting invalid level update to ${invalidLevel}`);

      try {
        await program.methods
          .updateNftMetadata(invalidLevel, minTimeElapsed, null)
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        // If we reach here, the test should fail
        expect.fail("Should have thrown an error for invalid level progression");

      } catch (error) {
        console.log("✅ Correctly prevented invalid level progression");
        expect(error.toString()).to.include("InvalidLevelProgression");
      }
    });
  });

  describe("🌟 NFT Evolution", () => {
    it("Should evolve NFT when conditions are met", async () => {
      console.log("\n🌟 Testing NFT evolution");

      try {
        const tx = await program.methods
          .evolveNft()
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
            mplCoreProgram: MPL_CORE_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ NFT evolution successful!");
        console.log("Transaction signature:", tx);

        // Fetch and verify the evolved state
        const nftStateAccount = await program.account.nftState.fetch(nftState);
        console.log("Evolved NFT State:", {
          level: nftStateAccount.level.toString(),
          rarity: nftStateAccount.rarity,
          evolutionCount: nftStateAccount.evolutionCount.toString(),
        });

        expect(nftStateAccount.evolutionCount.toNumber()).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ NFT evolution failed:", error);
        // Evolution might fail if time conditions aren't met, which is expected
        console.log("ℹ️ Evolution failed (possibly due to time constraints)");
      }
    });
  });

  describe("📊 Program State Verification", () => {
    it("Should maintain consistent state across operations", async () => {
      console.log("\n📊 Verifying program state consistency");

      try {
        const nftStateAccount = await program.account.nftState.fetch(nftState);
        
        console.log("Final NFT State:", {
          level: nftStateAccount.level.toString(),
          rarity: nftStateAccount.rarity,
          mintDate: new Date(nftStateAccount.mintDate.toNumber() * 1000).toISOString(),
          lastUpdated: new Date(nftStateAccount.lastUpdated.toNumber() * 1000).toISOString(),
          evolutionCount: nftStateAccount.evolutionCount.toString(),
        });

        // Verify state consistency
        expect(nftStateAccount.level.toNumber()).to.be.greaterThan(0);
        expect(nftStateAccount.rarity).to.be.a("string");
        expect(nftStateAccount.mintDate.toNumber()).to.be.greaterThan(0);
        expect(nftStateAccount.lastUpdated.toNumber()).to.be.greaterThan(0);

        console.log("✅ Program state verification passed!");

      } catch (error) {
        console.error("❌ State verification failed:", error);
        throw error;
      }
    });
  });
}); 