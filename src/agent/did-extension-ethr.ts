import { IAgentPlugin } from '@veramo/core'
import { IEthrChangeControllerKeyArgs, IEthrDidExtension, IRequiredContext } from '../types/IEthrDidExtension'
import { schema } from '../index'

/**
 * {@inheritDoc IEthrDidExtension}
 * @beta
 */
export class EthrDidExtension implements IAgentPlugin {
  readonly schema = schema.IEthrDidExtension

  // map the methods your plugin is declaring to their implementation
  readonly methods: IEthrDidExtension = {
    ethrChangeControllerKey: this.ethrChangeControllerKey.bind(this),
  }

  /** {@inheritDoc IEthrDidExtension.ethrChangeControllerKey} */
  private async ethrChangeControllerKey(args: IEthrChangeControllerKeyArgs, context: IRequiredContext): Promise<string> {
    return "";
  }
}
