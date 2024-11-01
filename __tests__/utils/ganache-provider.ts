import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider'
import { BrowserProvider } from 'ethers';
import { Contract, ContractFactory } from 'ethers'
import { EthereumDIDRegistry } from 'ethr-did-resolver'
import hardhat from 'hardhat'

/**
 * Creates a Web3Provider that connects to a local ganache instance with a bunch of known keys and an ERC1056 contract.
 *
 * This provider can only be used in a single test suite, because of some concurrency issues with ganache.
 */
export async function createGanacheProvider(): Promise<{ provider: BrowserProvider; registry: string }> {

  const provider = new BrowserProvider(hardhat.network.provider);
  const factory = ContractFactory.fromSolidity(EthereumDIDRegistry).connect(await provider.getSigner(0))

  let registryContract: Contract = await factory.deploy()
  registryContract = await registryContract.waitForDeployment()

  const registry = await registryContract.getAddress()
  return { provider, registry }
}
