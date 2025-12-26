import { run } from "hardhat";

async function main() {
  const contractAddress = "0xA40f7F77497d4519285cfcC30A7876d74FB80f03"; // ChiperProtocol deployment Nov 4, 2025
  
  console.log("🔍 Verifying ChiperProtocol contract on Etherscan...");
  console.log("📍 Address:", contractAddress);
  console.log("🌐 Network: Sepolia Testnet");
  console.log("");
  
  try {
    await run("verify:verify", {
      address: contractAddress,
      constructorArguments: [], // ChiperProtocol has no constructor arguments
      contract: "contracts/PrivateVault.sol:ChiperProtocol",
    });
    
    console.log("");
    console.log("✅ Contract verified successfully!");
    console.log("🔗 View on Etherscan:");
    console.log(`   https://sepolia.etherscan.io/address/${contractAddress}#code`);
  } catch (error: any) {
    if (error.message.includes("Already Verified")) {
      console.log("");
      console.log("✅ Contract already verified!");
      console.log("🔗 View on Etherscan:");
      console.log(`   https://sepolia.etherscan.io/address/${contractAddress}#code`);
    } else if (error.message.includes("Invalid API Key")) {
      console.error("");
      console.error("❌ Verification failed: Invalid Etherscan API Key");
      console.error("");
      console.error("📝 To fix:");
      console.error("   1. Get API key from: https://etherscan.io/myapikey");
      console.error("   2. Add to .env file: ETHERSCAN_API_KEY=your_key_here");
      console.error("   3. Run this script again");
    } else {
      console.error("");
      console.error("❌ Verification failed:");
      console.error(error.message);
      console.error("");
      console.error("💡 Try manual verification:");
      console.error("   1. Run: npx hardhat flatten contracts/PrivateVault.sol > PrivateVault_flat.sol");
      console.error("   2. Visit: https://sepolia.etherscan.io/verifyContract");
      console.error("   3. Upload flattened source code");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
