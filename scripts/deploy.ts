import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftMinter } from "../target/types/nft_minter";
import { Keypair, Connection, PublicKey } from "@solana/web3.js";
import * as fs from "fs";

async function main() {
  console.log("🚀 Starting NFT Minter Program Deployment...");

  // Configure connection to Devnet
  const connection = new Connection(
    "https://api.devnet.solana.com",
    "confirmed"
  );

  // Load wallet keypair
  const walletPath = process.env.ANCHOR_WALLET || "~/.config/solana/id.json";
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log("👛 Wallet loaded:", walletKeypair.publicKey.toString());

  // Create provider
  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(walletKeypair),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);

  // Load program
  const program = anchor.workspace.NftMinter as Program<NftMinter>;
  console.log("📦 Program ID:", program.programId.toString());

  try {
    // Check program deployment status
    const programInfo = await connection.getAccountInfo(program.programId);
    
    if (programInfo) {
      console.log("✅ Program already deployed!");
      console.log("Program address:", program.programId.toString());
      console.log("Program size:", programInfo.data.length, "bytes");
    } else {
      console.log("⚠️ Program not found on Devnet");
      console.log("Please run 'anchor deploy' first");
    }

    // Display deployment information
    console.log("\n📋 Deployment Summary:");
    console.log("Network: Solana Devnet");
    console.log("Program ID:", program.programId.toString());
    console.log("Wallet:", walletKeypair.publicKey.toString());
    console.log("Connection:", connection.rpcEndpoint);

    // Test basic program functionality
    console.log("\n🧪 Testing program connection...");
    try {
      const programAccount = await connection.getAccountInfo(program.programId);
      if (programAccount) {
        console.log("✅ Program connection successful!");
      }
    } catch (error) {
      console.log("❌ Program connection failed:", error);
    }

  } catch (error) {
    console.error("❌ Deployment check failed:", error);
    process.exit(1);
  }

  console.log("\n🎉 Deployment check completed successfully!");
  console.log("\n📚 Next steps:");
  console.log("1. Run 'anchor test' to verify functionality");
  console.log("2. Use the program ID in your client applications");
  console.log("3. Check program logs on Solana Explorer");
}

main().catch((error) => {
  console.error("❌ Deployment script failed:", error);
  process.exit(1);
}); 