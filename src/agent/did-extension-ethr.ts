import { IAgentPlugin } from '@veramo/core'
import { AbstractDIDStore } from '@veramo/did-manager'
import { IEthrChangeControllerKeyArgs, IEthrDidExtension, IRequiredContext } from '../types/IEthrDidExtension'
import { schema } from '../index'
import { computeAddress } from '@ethersproject/transactions'
import { EthrDIDProvider, EthrNetworkConfiguration } from '@veramo/did-provider-ethr'
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

  private defaultKms: string;
  private store: AbstractDIDStore;
  private networks: EthrNetworkConfiguration[];
  private ehrDidProvider: EthrDIDProvider;

  constructor(options: { store: AbstractDIDStore, defaultKms: string, networks: EthrNetworkConfiguration[] }) {
    this.store = options.store;
    this.defaultKms = options.defaultKms;
    this.networks = options.networks;
    this.ehrDidProvider = new EthrDIDProvider({ defaultKms: this.defaultKms, networks: this.networks })
  }

  /** {@inheritDoc IEthrDidExtension.ethrChangeControllerKey} */
  private async ethrChangeControllerKey(args: IEthrChangeControllerKeyArgs, context: IRequiredContext): Promise<string> {
    const identifier = await this.store.get({ did: args.did })
    const newOwnerKey = await context.agent.keyManagerGet({ kid: args.kid })
    const gasLimit = args.options?.gasLimit || DEFAULT_GAS_LIMIT

    if (newOwnerKey.type !== 'Secp256k1') {
      throw new Error('EthrDIDProvider updateControllerKey only supports Secp256k1 keys.')
    }
    const address = computeAddress(`0x${newOwnerKey.publicKeyHex}`)
    const ethrDid = await this.ehrDidProvider.getEthrDidController(identifier, context)
    const txHash = await ethrDid.changeOwner(address, { ...args.options, gasLimit })
    return txHash;
  }
}
