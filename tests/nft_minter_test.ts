import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftMinter } from "../target/types/nft_minter";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import { expect } from "chai";

describe("🎭 NFT Minter Program", () => {
  // Configure the client to use localhost for testing
  const connection = new anchor.web3.Connection("http://localhost:8899", "confirmed");
  const wallet = new anchor.Wallet(Keypair.generate());
  const provider = new anchor.AnchorProvider(connection, wallet, {});
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
        console.log("Asset address:", newAsset.publicKey.toString());

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ Rare NFT minting failed:", error);
        throw error;
      }
    });
  });

  describe("🔄 Metadata Updates", () => {
    it("Should update NFT level", async () => {
      const newLevel = 10;

      console.log(`\n🎯 Updating NFT level to: ${newLevel}`);

      try {
        const tx = await program.methods
          .updateLevel(newLevel)
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
          })
          .rpc();

        console.log("✅ Level updated successfully!");
        console.log("Transaction signature:", tx);

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ Level update failed:", error);
        throw error;
      }
    });

    it("Should update NFT rarity", async () => {
      const newRarity = "Legendary";

      console.log(`\n🎯 Updating NFT rarity to: ${newRarity}`);

      try {
        const tx = await program.methods
          .updateRarity(newRarity)
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
          })
          .rpc();

        console.log("✅ Rarity updated successfully!");
        console.log("Transaction signature:", tx);

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ Rarity update failed:", error);
        throw error;
      }
    });

    it("Should update NFT URI", async () => {
      const newUri = "https://example.com/updated-nft.json";

      console.log(`\n🎯 Updating NFT URI to: ${newUri}`);

      try {
        const tx = await program.methods
          .updateUri(newUri)
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
          })
          .rpc();

        console.log("✅ URI updated successfully!");
        console.log("Transaction signature:", tx);

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ URI update failed:", error);
        throw error;
      }
    });
  });

  describe("📊 NFT State Queries", () => {
    it("Should fetch NFT state data", async () => {
      console.log("\n🎯 Fetching NFT state data");

      try {
        const nftStateAccount = await program.account.nftState.fetch(nftState);

        console.log("✅ NFT state fetched successfully!");
        console.log("NFT State:", {
          level: nftStateAccount.level,
          rarity: nftStateAccount.rarity,
          uri: nftStateAccount.uri,
          asset: nftStateAccount.asset.toString(),
        });

        // Verify the account exists and has expected structure
        expect(nftStateAccount).to.have.property("level");
        expect(nftStateAccount).to.have.property("rarity");
        expect(nftStateAccount).to.have.property("uri");
        expect(nftStateAccount).to.have.property("asset");

      } catch (error) {
        console.error("❌ NFT state fetch failed:", error);
        throw error;
      }
    });
  });

  describe("🎮 Game Mechanics", () => {
    it("Should level up NFT", async () => {
      console.log("\n🎯 Leveling up NFT");

      try {
        const tx = await program.methods
          .levelUp()
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
          })
          .rpc();

        console.log("✅ NFT leveled up successfully!");
        console.log("Transaction signature:", tx);

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ Level up failed:", error);
        throw error;
      }
    });

    it("Should evolve NFT rarity", async () => {
      console.log("\n🎯 Evolving NFT rarity");

      try {
        const tx = await program.methods
          .evolveRarity()
          .accounts({
            payer: payer.publicKey,
            asset: asset.publicKey,
            nftState: nftState,
          })
          .rpc();

        console.log("✅ NFT rarity evolved successfully!");
        console.log("Transaction signature:", tx);

        // Verify the transaction was successful
        expect(tx).to.be.a("string");
        expect(tx.length).to.be.greaterThan(0);

      } catch (error) {
        console.error("❌ Rarity evolution failed:", error);
        throw error;
      }
    });
  });
}); 