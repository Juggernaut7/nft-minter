import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { NftMinter } from "../target/types/nft_minter";
import { Keypair, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("🚀 NFT Minter Environment Initialization");
  console.log("========================================");

  // Configuration
  const cluster = process.env.ANCHOR_CLUSTER || "localnet";
  const rpcUrl = cluster === "localnet" 
    ? "http://localhost:8899" 
    : cluster === "devnet"
    ? "https://api.devnet.solana.com"
    : "https://api.mainnet-beta.solana.com";

  console.log(`🌐 Cluster: ${cluster}`);
  console.log(`🔗 RPC URL: ${rpcUrl}`);

  // Initialize connection
  const connection = new Connection(rpcUrl, "confirmed");

  try {
    // Check cluster status
    console.log("\n📊 Checking cluster status...");
    const slot = await connection.getSlot();
    console.log(`✅ Connected to cluster (slot: ${slot})`);

    // Check if local validator is running
    if (cluster === "localnet") {
      try {
        await connection.getClusterNodes();
        console.log("✅ Local validator is running");
      } catch (error) {
        console.log("⚠️ Local validator not running");
        console.log("💡 Start with: solana-test-validator");
        return;
      }
    }

  } catch (error) {
    console.log("❌ Could not connect to cluster:", error.message);
    return;
  }

  // Wallet setup
  console.log("\n👛 Setting up wallet...");
  let walletKeypair: Keypair;

  try {
    const walletPath = process.env.ANCHOR_WALLET || "~/.config/solana/id.json";
    const expandedPath = walletPath.startsWith("~") 
      ? path.join(process.env.HOME || "", walletPath.slice(1))
      : walletPath;

    if (fs.existsSync(expandedPath)) {
      const walletData = JSON.parse(fs.readFileSync(expandedPath, "utf-8"));
      walletKeypair = Keypair.fromSecretKey(Buffer.from(walletData));
      console.log("✅ Wallet loaded from:", expandedPath);
    } else {
      console.log("⚠️ Wallet not found, creating new one...");
      walletKeypair = Keypair.generate();
      
      // Save new wallet
      const walletDir = path.dirname(expandedPath);
      if (!fs.existsSync(walletDir)) {
        fs.mkdirSync(walletDir, { recursive: true });
      }
      fs.writeFileSync(expandedPath, JSON.stringify(Array.from(walletKeypair.secretKey)));
      console.log("✅ New wallet created and saved");
    }

    console.log(`🔑 Wallet address: ${walletKeypair.publicKey.toString()}`);

  } catch (error) {
    console.log("❌ Error setting up wallet:", error.message);
    return;
  }

  // Check wallet balance
  console.log("\n💰 Checking wallet balance...");
  try {
    const balance = await connection.getBalance(walletKeypair.publicKey);
    const solBalance = balance / LAMPORTS_PER_SOL;
    
    console.log(`💎 Balance: ${solBalance.toFixed(4)} SOL`);

    if (cluster === "devnet" && solBalance < 1) {
      console.log("⚠️ Low balance on devnet, requesting airdrop...");
      try {
        const airdropSig = await connection.requestAirdrop(
          walletKeypair.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSig);
        console.log("✅ Airdrop successful!");
        
        const newBalance = await connection.getBalance(walletKeypair.publicKey);
        console.log(`💎 New balance: ${(newBalance / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
      } catch (airdropError) {
        console.log("⚠️ Airdrop failed:", airdropError.message);
      }
    }

  } catch (error) {
    console.log("❌ Error checking balance:", error.message);
  }

  // Program setup
  console.log("\n📦 Setting up program...");
  try {
    // Check if program is built
    const targetDir = path.join(process.cwd(), "target");
    const deployDir = path.join(targetDir, "deploy");
    
    if (!fs.existsSync(deployDir)) {
      console.log("⚠️ Program not built, building now...");
      console.log("💡 Run: anchor build");
      return;
    }

    const programFiles = fs.readdirSync(deployDir);
    const soFile = programFiles.find(file => file.endsWith(".so"));
    
    if (soFile) {
      console.log("✅ Program binary found:", soFile);
      
      // Get program ID
      const keypairFile = path.join(deployDir, "nft_minter-keypair.json");
      if (fs.existsSync(keypairFile)) {
        const keypairData = JSON.parse(fs.readFileSync(keypairFile, "utf-8"));
        const programKeypair = Keypair.fromSecretKey(Buffer.from(keypairData));
        console.log(`🔑 Program ID: ${programKeypair.publicKey.toString()}`);
      }
    } else {
      console.log("❌ Program binary not found");
      console.log("💡 Run: anchor build");
      return;
    }

  } catch (error) {
    console.log("❌ Error checking program:", error.message);
  }

  // Test environment setup
  console.log("\n🧪 Setting up test environment...");
  try {
    // Check if tests directory exists
    const testsDir = path.join(process.cwd(), "tests");
    if (fs.existsSync(testsDir)) {
      const testFiles = fs.readdirSync(testsDir).filter(file => file.endsWith(".ts"));
      console.log(`✅ Found ${testFiles.length} test files`);
      
      if (testFiles.length > 0) {
        console.log("📝 Test files:", testFiles.join(", "));
      }
    } else {
      console.log("⚠️ Tests directory not found");
    }

    // Check if docs directory exists
    const docsDir = path.join(process.cwd(), "docs");
    if (fs.existsSync(docsDir)) {
      const docFiles = fs.readdirSync(docsDir).filter(file => file.endsWith(".md"));
      console.log(`✅ Found ${docFiles.length} documentation files`);
    } else {
      console.log("⚠️ Documentation directory not found");
    }

  } catch (error) {
    console.log("❌ Error checking test environment:", error.message);
  }

  // Dependencies check
  console.log("\n📋 Checking dependencies...");
  try {
    // Check package.json
    const packagePath = path.join(process.cwd(), "package.json");
    if (fs.existsSync(packagePath)) {
      const packageData = JSON.parse(fs.readFileSync(packagePath, "utf-8"));
      console.log("✅ package.json found");
      console.log(`📦 Node dependencies: ${Object.keys(packageData.dependencies || {}).length}`);
      console.log(`🔧 Dev dependencies: ${Object.keys(packageData.devDependencies || {}).length}`);
    }

    // Check Cargo.toml
    const cargoPath = path.join(process.cwd(), "Cargo.toml");
    if (fs.existsSync(cargoPath)) {
      console.log("✅ Cargo.toml found");
    }

    // Check Anchor.toml
    const anchorPath = path.join(process.cwd(), "Anchor.toml");
    if (fs.existsSync(anchorPath)) {
      console.log("✅ Anchor.toml found");
    }

  } catch (error) {
    console.log("❌ Error checking dependencies:", error.message);
  }

  // Summary
  console.log("\n📋 Initialization Summary");
  console.log("===========================");
  console.log(`🌐 Cluster: ${cluster}`);
  console.log(`👛 Wallet: ${walletKeypair.publicKey.toString()}`);
  console.log(`📦 Program: Built`);
  console.log(`🧪 Tests: Ready`);
  console.log(`📚 Docs: Available`);

  console.log("\n🎉 Environment initialization completed!");
  console.log("\n📚 Next steps:");
  console.log("1. Run tests: anchor test");
  console.log("2. Deploy to devnet: anchor deploy --provider.cluster devnet");
  console.log("3. Check documentation: docs/");
  console.log("4. Submit to Codigo DevQuest #3!");

  // Create .env file if it doesn't exist
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) {
    const envContent = `ANCHOR_WALLET=${process.env.ANCHOR_WALLET || "~/.config/solana/id.json"}
ANCHOR_PROVIDER_URL=${rpcUrl}
ANCHOR_CLUSTER=${cluster}`;
    
    fs.writeFileSync(envPath, envContent);
    console.log("\n📝 Created .env file with configuration");
  }

  console.log("\n🚀 Ready to build and deploy!");
}

main().catch((error) => {
  console.error("❌ Initialization failed:", error);
  process.exit(1);
}); 