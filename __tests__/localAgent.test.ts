import { DataSource } from 'typeorm'
import DidExtensionEthrLogic from '../__tests__/shared/didExtensionEthrLogic'
import {
  createAgent,
  IAgentOptions,
  IDataStore,
  IDataStoreORM,
  IDIDManager,
  IKeyManager,
  IResolver,
  TAgent,
} from '@veramo/core'
import { IEthrDidExtension } from '../src/types/IEthrDidExtension'
import { DataStore, DataStoreORM, DIDStore, Entities, KeyStore, migrations, PrivateKeyStore } from '@veramo/data-store'
import { KeyManager } from '@veramo/key-manager'
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'
import { DIDManager } from '@veramo/did-manager'
import { createGanacheProvider } from './utils/ganache-provider'
import fs from 'fs'
import { EthrDIDProvider } from '@veramo/did-provider-ethr'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
import { EthrDidExtension } from '../src'
import { jest } from '@jest/globals'

jest.setTimeout(30000)

const secretKey = '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c'
const infuraProjectId = '3586660d179141e3801c3895de1c2eba'

let agent: TAgent<IDIDManager & IKeyManager & IEthrDidExtension & IDataStore & IDataStoreORM & IResolver>
let dbConnection: Promise<DataSource>
let databaseFile: string
let didStore: DIDStore

const setup = async (options?: IAgentOptions): Promise<boolean> => {
  databaseFile = options?.context?.databaseFile || `./tmp/local-database-${Math.random().toPrecision(5)}.sqlite`
  dbConnection = new DataSource({
    name: options?.context?.['dbName'] || 'test',
    type: 'sqlite',
    database: databaseFile,
    synchronize: false,
    migrations: migrations,
    migrationsRun: true,
    logging: false,
    entities: Entities,
  }).initialize()
  didStore = new DIDStore(dbConnection)

  const { provider, registry } = await createGanacheProvider()

  agent = createAgent<IDIDManager & IKeyManager & IEthrDidExtension & IDataStore & IDataStoreORM & IResolver>({
    plugins: [
      new KeyManager({
        store: new KeyStore(dbConnection),
        kms: {
          local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(secretKey))),
        },
      }),
      new DIDManager({
        store: didStore,
        defaultProvider: 'did:ethr:hardhat',
        providers: {
          'did:ethr': new EthrDIDProvider({
            defaultKms: 'local',
            ttl: 60 * 60 * 24 * 30 * 12 + 1,
            networks: [
              {
                chainId: BigInt(1337),
                name: 'hardhat',
                provider,
                registry,
              },
            ],
          }),
        },
      }),
      new EthrDidExtension({
        store: didStore,
        defaultKms: 'local',
        networks: [
          {
            chainId: BigInt(1337),
            name: 'hardhat',
            provider,
            registry,
          },
        ],
      }),
      new DIDResolverPlugin({
        ...ethrDidResolver({
          infuraProjectId,
          networks: [
            {
              name: 'hardhat',
              chainId: BigInt(1337),
              provider,
              registry,
            },
          ],
        }),
      }),
      new DataStore(dbConnection),
      new DataStoreORM(dbConnection)
    ],
  })
  return true
}

const tearDown = async (): Promise<boolean> => {
  try {
    await (await dbConnection).dropDatabase()
    await (await dbConnection).close()
  } catch (e) {
    // nop
  }
  try {
    fs.unlinkSync(databaseFile)
  } catch (e) {
    // nop
  }
  return true
}

const getAgent = () => agent

const testContext = { getAgent, setup, tearDown }

describe('Local integration tests', () => {
  DidExtensionEthrLogic(testContext)
})
