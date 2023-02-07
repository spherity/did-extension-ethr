import { IDataStore, IDataStoreORM, IDIDManager, IIdentifier, IKeyManager, IResolver, TAgent } from '@veramo/core'
import { computeAddress } from '@ethersproject/transactions'
import { IEthrDidExtension } from '../../src/types/IEthrDidExtension'

type ConfiguredAgent = TAgent<IDIDManager & IKeyManager & IEthrDidExtension & IDataStore & IDataStoreORM & IResolver>

export default (testContext: {
  getAgent: () => ConfiguredAgent
  setup: () => Promise<boolean>
  tearDown: () => Promise<boolean>
}) => {
  describe('did-extension-ethr', () => {
    let agent: ConfiguredAgent
    let alice: IIdentifier
    let bob: IIdentifier

    beforeEach(async () => {
      await testContext.setup()
      agent = testContext.getAgent()

      alice = await agent.didManagerImport({
        controllerKeyId: 'alice-controller-key',
        did: 'did:ethr:ganache:0x0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        provider: 'did:ethr:ganache',
        alias: 'alice-did-ethr',
        keys: [
          {
            privateKeyHex: '0000000000000000000000000000000000000000000000000000000000000001',
            kms: 'local',
            type: 'Secp256k1',
            kid: 'alice-controller-key',
          },
        ],
      })
      bob = await agent.didManagerImport({
        controllerKeyId: 'bob-controller-key',
        did: 'did:ethr:ganache:0x02c6047f9441ed7d6d3045406e95c07cd85c778e4b8cef3ca7abac09b95c709ee5',
        provider: 'did:ethr:ganache',
        alias: 'bob-did-ethr',
        keys: [
          {
            privateKeyHex: '0000000000000000000000000000000000000000000000000000000000000002',
            kms: 'local',
            type: 'Secp256k1',
            kid: 'bob-controller-key',
          },
        ],
      })
    })
    afterAll(testContext.tearDown)

    it('should change the owner of DID', async () => {
      const aliceDidDoc = await agent.resolveDid({ didUrl: alice.did })
      await agent.ethrChangeControllerKey({ did: alice.did, kid: bob.controllerKeyId! })
      const updatedAliceDidDoc = await agent.resolveDid({ didUrl: alice.did })

      const bobEthAddress = computeAddress(bob.did.split(':')[3])
      const updatedIdentifier = await agent.didManagerGet({ did: alice.did })

      expect(updatedIdentifier.controllerKeyId).toEqual(bob.controllerKeyId)
      expect(updatedAliceDidDoc.didDocument!.id).toEqual(aliceDidDoc.didDocument!.id)
      expect(updatedAliceDidDoc.didDocument!.verificationMethod![0].blockchainAccountId).toContain(bobEthAddress)
    })

    it('should allow new owner to make changes', async () => {

    })

    it('should throw an error if key is not Secp256k1', async () => {
      const newKey = await agent.keyManagerCreate({ kms: 'local', type: 'Ed25519' })
      await expect(agent.ethrChangeControllerKey({
        did: alice.did,
        kid: newKey.kid,
      })).rejects.toThrow('EthrDIDProvider updateControllerKey only supports Secp256k1 keys.')
    })

    it('should throw an error if key is already controller key', async () => {
      await expect(agent.ethrChangeControllerKey({
        did: alice.did,
        kid: alice.controllerKeyId!,
      })).rejects.toThrow('Key is already the controller for identifier.')
    })
  })
}
