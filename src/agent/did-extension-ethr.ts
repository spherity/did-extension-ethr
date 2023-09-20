import { IAgentPlugin, IIdentifier } from '@veramo/core'
import { AbstractDIDStore } from '@veramo/did-manager'
import {
  EthrNetworkConfiguration,
  IEthrChangeControllerKeyArgs,
  IEthrDidExtension,
  IRequiredContext,
} from '../types/IEthrDidExtension'
import { schema } from '../index'
import { computeAddress, Signature } from 'ethers'
import { KmsEthereumSigner } from './kms-eth-signer'
import { EthrDID } from '@spherity/ethr-did'

export const DEFAULT_GAS_LIMIT = 100000

/**
 * {@inheritDoc IEthrDidExtension}
 * @beta
 */
export class EthrDidExtension implements IAgentPlugin {
  readonly schema = schema.IEthrDidExtension
  readonly methods: IEthrDidExtension = {
    ethrChangeControllerKey: this.ethrChangeControllerKey.bind(this),
  }

  private defaultKms: string
  private store: AbstractDIDStore
  private networks: EthrNetworkConfiguration[]

  constructor(options: { store: AbstractDIDStore, defaultKms: string, networks: EthrNetworkConfiguration[] }) {
    this.store = options.store
    this.defaultKms = options.defaultKms
    this.networks = options.networks
  }

  /** {@inheritDoc IEthrDidExtension.ethrChangeControllerKey} */
  private async ethrChangeControllerKey(args: IEthrChangeControllerKeyArgs, context: IRequiredContext): Promise<string> {
    const identifier = await this.store.get({ did: args.did })
    const newOwnerKey = await context.agent.keyManagerGet({ kid: args.kid })
    const gasLimit = args.options?.gasLimit || DEFAULT_GAS_LIMIT

    if (newOwnerKey.type !== 'Secp256k1') {
      throw new Error('EthrDIDProvider updateControllerKey only supports Secp256k1 keys.')
    }
    if (identifier.controllerKeyId === args.kid) {
      throw new Error('Key is already the controller for identifier.')
    }

    const address = computeAddress(`0x${newOwnerKey.publicKeyHex}`)
    const ethrDid = await this.getEthrDidController(identifier, context)
    let txHash: string;

    if (args.options?.metaIdentifierKeyId) {
      const metaHash = await ethrDid.createChangeOwnerHash(address)
      const canonicalSignature = await EthrDidExtension.createMetaSignature(context, identifier, metaHash)

      const metaEthrDid = await this.getEthrDidController(identifier, context, args.options.metaIdentifierKeyId)
      delete args.options.metaIdentifierKeyId;
      txHash = await metaEthrDid.changeOwnerSigned(address, {
        sigV: canonicalSignature.v,
        sigR: canonicalSignature.r,
        sigS: canonicalSignature.s,
      }, { ...args.options, gasLimit })
    } else {
      txHash = await ethrDid.changeOwner(address, { ...args.options, gasLimit })
    }

    // Update the identifier in the store
    identifier.keys = identifier.keys.filter((key) => key.kid !== identifier.controllerKeyId)
    identifier.controllerKeyId = args.kid
    identifier.keys.push(newOwnerKey)
    await this.store.import(identifier)

    return txHash
  }

  private async getEthrDidController(
    identifier: IIdentifier,
    context: IRequiredContext,
    metaIdentifierKeyId?: string,
  ): Promise<EthrDID> {
    if (identifier.controllerKeyId == null) {
      throw new Error('invalid_argument: identifier does not list a `controllerKeyId`')
    }
    const controllerKey = await context.agent.keyManagerGet({ kid: identifier.controllerKeyId })
    if (typeof controllerKey === 'undefined') {
      throw new Error('invalid_argument: identifier.controllerKeyId is not managed by this agent')
    }

    // find network
    const networkStringMatcher = /^did:ethr(:.+)?:(0x[0-9a-fA-F]{40}|0x[0-9a-fA-F]{66}).*$/
    const matches = identifier.did.match(networkStringMatcher)
    let network = this.getNetworkFor(matches?.[1]?.substring(1))
    if (!matches || !network) {
      throw new Error(`invalid_argument: cannot find network for ${identifier.did}`)
    }
    if (!network.provider) {
      throw new Error(`The network's provider is not set: ${network.name || network.chainId}`)
    }

    if (metaIdentifierKeyId) {
      const metaControllerKey = await context.agent.keyManagerGet({ kid: metaIdentifierKeyId })
      if (typeof metaControllerKey === 'undefined') {
        throw new Error('invalid_argument: identifier.controllerKeyId is not managed by this agent')
      }

      // Identity owner signs payload but metaIdentifier send the tx (meta transaction; signed methods)
      return new EthrDID({
        identifier: identifier.did,
        provider: network.provider,
        chainNameOrId: network.name || network.chainId,
        rpcUrl: network.rpcUrl,
        registry: network.registry,
        txSigner: new KmsEthereumSigner(metaControllerKey, context, network.provider),
      })
    }

    if (controllerKey.meta?.algorithms?.includes('eth_signTransaction')) {
      return new EthrDID({
        identifier: identifier.did,
        provider: network.provider,
        chainNameOrId: network.name || network.chainId,
        rpcUrl: network.rpcUrl,
        registry: network.registry,
        txSigner: new KmsEthereumSigner(controllerKey, context, network.provider),
      })
    } else {
      // Web3Provider should perform signing and sending transaction
      return new EthrDID({
        identifier: identifier.did,
        provider: network.provider,
        chainNameOrId: network.name || network.chainId,
        rpcUrl: network.rpcUrl,
        registry: network.registry,
      })
    }
  }

  private getNetworkFor(networkSpecifier: string | bigint | undefined): EthrNetworkConfiguration | undefined {
    let networkNameOrId: string | bigint = networkSpecifier || 'mainnet'
    if (
      typeof networkNameOrId === 'string' &&
      (networkNameOrId.startsWith('0x') || parseInt(networkNameOrId) > 0)
    ) {
    }
    let network = this.networks.find(
      (n) => n.chainId === networkNameOrId || n.name === networkNameOrId || n.description === networkNameOrId,
    )
    if (!network && !networkSpecifier && this.networks.length === 1) {
      network = this.networks[0]
    }
    return network
  }

  private static async createMetaSignature(
    context: IRequiredContext,
    identifier: IIdentifier,
    metaHash: string,
  ) {
    const controllerKey = await context.agent.keyManagerGet({ kid: identifier.controllerKeyId! })
    if (typeof controllerKey === 'undefined') {
      throw new Error('invalid_argument: identifier.controllerKeyId is not managed by this agent')
    }
    const signature = await context.agent.keyManagerSign({
      keyRef: controllerKey.kid,
      data: metaHash,
      algorithm: 'eth_rawSign',
      encoding: 'hex',
    })
    return Signature.from(signature)
  }
}

