import { DataSource } from 'typeorm'
import { EthrDidExtension, IEthrDidExtension } from '../build'
import { KeyManagementSystem, SecretBox } from '@veramo/kms-local'
import { DataStore, DataStoreORM, DIDStore, Entities, KeyStore, migrations, PrivateKeyStore } from '@veramo/data-store'
import {
  Agent,
  createAgent,
  IAgent,
  IAgentOptions,
  IDataStore,
  IDataStoreORM,
  IDIDManager,
  IKeyManager,
  IResolver,
} from '@veramo/core'
import { DIDManager } from '@veramo/did-manager'
import { KeyManager } from '@veramo/key-manager'
import fs from 'fs'
import { DIDResolverPlugin } from '@veramo/did-resolver'
import { EthrDIDProvider } from '@veramo/did-provider-ethr'
import { AgentRestClient } from '@veramo/remote-client'
import { createGanacheProvider } from './utils/ganache-provider'
import { getResolver as ethrDidResolver } from 'ethr-did-resolver'
import { AgentRouter, RequestWithAgentRouter } from '@veramo/remote-server'
import express from 'express'
import { Server } from 'http'
import DidExtensionEthrLogic from './shared/didExtensionEthrLogic'

const databaseFile = `./tmp/rest-database-${Math.random().toPrecision(5)}.sqlite`
const infuraProjectId = '3586660d179141e3801c3895de1c2eba'
const secretKey = '29739248cad1bd1a0fc4d9b75cd4d2990de535baf5caadfdf8d8f86664aa830c'
const port = 3002
const basePath = '/agent'

let dbConnection: Promise<DataSource>
let serverAgent: IAgent
let restServer: Server

const getAgent = (options?: IAgentOptions) =>
  createAgent<
    IDIDManager &
    IKeyManager &
    IDataStore &
    IDataStoreORM &
    IResolver &
    IEthrDidExtension
  >({
    ...options,
    plugins: [
      new AgentRestClient({
        url: 'http://localhost:' + port + basePath,
        enabledMethods: serverAgent.availableMethods(),
        schema: serverAgent.getSchema(),
      }),
    ],
  })

const setup = async (options?: IAgentOptions): Promise<boolean> => {
  dbConnection = new DataSource({
    name: options?.context?.['dbName'] || 'sqlite-test',
    type: 'sqlite',
    database: databaseFile,
    synchronize: false,
    migrations: migrations,
    migrationsRun: true,
    logging: false,
    entities: Entities,
  }).initialize()
  let didStore = new DIDStore(dbConnection)
  const { provider, registry } = await createGanacheProvider()

  serverAgent = new Agent({
    ...options,
    plugins: [
      new KeyManager({
        store: new KeyStore(dbConnection),
        kms: {
          local: new KeyManagementSystem(new PrivateKeyStore(dbConnection, new SecretBox(secretKey))),
        },
      }),
      new DIDManager({
        store: didStore,
        defaultProvider: 'did:ethr:ganache',
        providers: {
          'did:ethr': new EthrDIDProvider({
            defaultKms: 'local',
            ttl: 60 * 60 * 24 * 30 * 12 + 1,
            networks: [
              {
                chainId: 1337,
                name: 'ganache',
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
            chainId: 1337,
            name: 'ganache',
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
              name: 'ganache',
              chainId: 1337,
              provider,
              registry,
            },
          ],
        }),
      }),
      new DataStore(dbConnection),
      new DataStoreORM(dbConnection),
      ...(options?.plugins || []),
    ],
  })

  const agentRouter = AgentRouter({
    exposedMethods: serverAgent.availableMethods(),
  })

  const requestWithAgent = RequestWithAgentRouter({
    agent: serverAgent,
  })

  return new Promise((resolve) => {
    const app = express()
    app.use(basePath, requestWithAgent, agentRouter)
    restServer = app.listen(port, () => {
      resolve(true)
    })
  })
}

const tearDown = async (): Promise<boolean> => {
  await new Promise((resolve, reject) => restServer.close(resolve))
  try {
    await (await dbConnection).dropDatabase()
    await (await dbConnection).close()
  } catch (e) {
    // nop
  }
  try {
    fs.unlinkSync(databaseFile)
  } catch (e) {
    //nop
  }
  return true
}

const testContext = { getAgent, setup, tearDown }

describe('REST integration tests', () => {
  DidExtensionEthrLogic(testContext)
})