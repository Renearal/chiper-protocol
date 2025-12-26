import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { postDeploy } from "postdeploy";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const chainId = await hre.getChainId();
  const chainName = hre.network.name;

  console.log(`Deploying to ${chainName} (chainId: ${chainId})`);

  // Deploy ChiperProtocol (constructor initializes TVL)
  const vaultContract = await deploy("ChiperProtocol", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: chainName === "sepolia" ? 5 : 1,
    contract: "contracts/ChiperProtocol.sol:ChiperProtocol",
  });

  console.log(`ChiperProtocol deployed at: ${vaultContract.address}`);

  // Generate ABI files for frontend
  postDeploy(chainName, "ChiperProtocol");

  console.log("\n=== Deployment Summary ===");
  console.log(`Network: ${chainName}`);
  console.log(`ChainId: ${chainId}`);
  console.log(`ChiperProtocol: ${vaultContract.address}`);
};

export default func;

func.id = "deploy_chiperProtocol";
func.tags = ["ChiperProtocol"];

