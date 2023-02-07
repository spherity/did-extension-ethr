import { IPluginMethodMap, IAgentContext, IDIDManager, IKeyManager } from '@veramo/core'
import { TransactionRequest } from '@ethersproject/providers'
import { Provider } from '@ethersproject/abstract-provider'

/**
 * Extension of did-provider-ethr with method-specific features.
 *
 * Due to the generalized-structure of AbstractIdentifierProvider that is being implemented by EthrDIDProvider,
 * it is not desired to add did:ethr specific functionality to it. This plugin provides some additional
 * functionality that is specific to did:ethr, like changing the owner of an identifier.
 *
 * @beta
 */
export interface IEthrDidExtension extends IPluginMethodMap {
  /**
   * Change controller/ owner of an did:ethr identity
   *
   * @param args - Input parameters for this method
   * @param context - The required context where this method can run.
   *   Declaring a context type here lets other developers know which other plugins
   *   need to also be installed for this method to work.
   * @returns Promise that resolves to a transaction hash
   */
  ethrChangeControllerKey(args: IEthrChangeControllerKeyArgs, context: IRequiredContext): Promise<string>
}

export interface TransactionOptions extends TransactionRequest {
  ttl?: number
  encoding?: string
  metaIdentifierKeyId?: string
}

/**
 * Arguments needed for {@link IEthrDidExtension.ethrChangeControllerKey}
 *
 * @beta
 */
export interface IEthrChangeControllerKeyArgs {
  did: string,
  kid: string,
  options?: TransactionOptions
}

/**
 * Possible options for network configuration for `did:ethr`
 *
 * @beta
 */
export interface EthrNetworkConfiguration {
  /**
   * The name of the network, for example 'mainnet', 'goerli', 'polygon'.
   * If this is present, then DIDs anchored on this network will have a human-readable prefix, like
   * `did:ethr:goerli:0x...`. See the
   * {@link https://github.com/uport-project/ethr-did-registry#contract-deployments | official deployments} for a table
   * of reusable names.
   * If this parameter is not present, `chainId` MUST be specified.
   */
  name?: string

  /**
   * Web3 provider. This is used to interact with the ethereum network.
   * When a web3 wallet is used here, it can also be used to sign transactions.
   * Either a `provider` or a `rpcUrl` must be specified. `provider` takes precedence when both are used.
   */
  provider?: Provider

  /**
   * Equivalent to `provider`
   * Web3 provider. This is used to interact with the ethereum network.
   * When a web3 wallet is used here, it can also be used to sign transactions.
   * Either a `provider` or a `rpcUrl` must be specified. `provider` takes precedence when both are used.
   */
  web3Provider?: Provider

  /**
   * A JSON RPC URL for the ethereum network that is being used.
   * Either a `provider` or a `rpcUrl` must be specified. `provider` takes precedence when both are used.
   */
  rpcUrl?: string

  /**
   * The EIP1056 registry address for the ethereum network being configured.
   *
   * Please See the
   * {@link https://github.com/uport-project/ethr-did-registry#contract-deployments | official deployments} for a table
   * of known deployments.
   */
  registry?: string

  /**
   * The chain ID for the ethereum network being configured. This can be a hex-encoded string starting with `0x`.
   * If `name` is not specified, then the hex encoded `chainId` will be used when creating DIDs, according to the
   * `did:ethr` spec.
   *
   * Example, chainId==42 and name==undefined => DIDs are prefixed with `did:ethr:0x2a:`
   */
  chainId?: string | number

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [index: string]: any
}

/**
 * This context describes the requirements of this plugin.
 * For this plugin to function properly, the agent needs to also have other plugins installed that implement the
 * interfaces declared here.
 * You can also define requirements on a more granular level, for each plugin method or event handler of your plugin.
 *
 * @beta
 */
export type IRequiredContext = IAgentContext<IKeyManager & IDIDManager>