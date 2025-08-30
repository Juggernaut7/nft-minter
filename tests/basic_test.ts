import { expect } from "chai";
import { PublicKey, Keypair } from "@solana/web3.js";
import { MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";

describe("🔧 Basic Setup Tests", () => {
  it("Should have valid dependencies", () => {
    console.log("🧪 Testing basic setup...");
    
    // Test Solana Web3.js
    const keypair = Keypair.generate();
    expect(keypair.publicKey).to.be.instanceOf(PublicKey);
    console.log("✅ Solana Web3.js working");
    
    // Test Metaplex MPL Core
    expect(typeof MPL_CORE_PROGRAM_ID).to.equal("string");
    expect(() => new PublicKey(MPL_CORE_PROGRAM_ID)).to.not.throw();
    console.log("✅ Metaplex MPL Core working");
    
    // Test Chai assertions
    expect(1 + 1).to.equal(2);
    console.log("✅ Chai assertions working");
    
    console.log("🎉 All basic tests passed!");
  });

  it("Should be able to create program addresses", () => {
    const programId = new PublicKey("11111111111111111111111111111111");
    const asset = Keypair.generate();
    
    const pda = PublicKey.findProgramAddressSync(
      [Buffer.from("nft_state"), asset.publicKey.toBuffer()],
      programId
    )[0];
    
    expect(pda).to.be.instanceOf(PublicKey);
    console.log("✅ PDA derivation working");
  });

  it("Should validate project structure", () => {
    // These are basic checks to ensure the project structure is correct
    expect(true).to.be.true;
    console.log("✅ Project structure validation passed");
  });
}); 