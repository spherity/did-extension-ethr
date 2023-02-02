import { IPluginMethodMap, IAgentContext, IDIDManager, IKeyManager } from '@veramo/core'

/**
 * My Agent Plugin description.
 *
 * This is the interface that describes what your plugin can do.
 * The methods listed here, will be directly available to the veramo agent where your plugin is going to be used.
 * Depending on the agent configuration, other agent plugins, as well as the application where the agent is used
 * will be able to call these methods.
 *
 * To build a schema for your plugin using standard tools, you must link to this file in package.json.
 * Example:
 * ```
 * "veramo": {
 *    "pluginInterfaces": {
 *      "IMyAgentPlugin": "./src/types/IEthrDidExtension.ts"
 *    }
 *  },
 * ```
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

/**
 * Arguments needed for {@link EthrDidExtension.ethrChangeControllerKey}
 *
 * @beta
 */
export interface IEthrChangeControllerKeyArgs {
  did: string,
  kid: string
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