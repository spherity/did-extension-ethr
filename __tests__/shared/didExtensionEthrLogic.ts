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
    let erika: IIdentifier
    let klaus: IIdentifier

    beforeAll(async () => {
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
      erika = await agent.didManagerImport({
        controllerKeyId: 'erika-controller-key',
        did: 'did:ethr:ganache:0x02f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9',
        provider: 'did:ethr:ganache',
        alias: 'erika-did-ethr',
        keys: [
          {
            privateKeyHex: '0000000000000000000000000000000000000000000000000000000000000003',
            kms: 'local',
            type: 'Secp256k1',
            kid: 'erika-controller-key',
          },
        ],
      })
      klaus = await agent.didManagerImport({
        controllerKeyId: 'klaus-controller-key',
        did: 'did:ethr:ganache:0x02e493dbf1c10d80f3581e4904930b1404cc6c13900ee0758474fa94abe8c4cd13',
        provider: 'did:ethr:ganache',
        alias: 'klaus-did-ethr',
        keys: [
          {
            privateKeyHex: '0000000000000000000000000000000000000000000000000000000000000004',
            kms: 'local',
            type: 'Secp256k1',
            kid: 'klaus-controller-key',
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
      const aliceKey = await agent.keyManagerGet({ kid: alice.controllerKeyId! })
      await agent.ethrChangeControllerKey({ did: bob.did, kid: alice.controllerKeyId! })
      await agent.didManagerAddKey({ did: bob.did, key: aliceKey })
      const updatedBobDidDoc = await agent.resolveDid({ didUrl: bob.did })

      expect(updatedBobDidDoc.didDocument!.verificationMethod![1].id).toContain("delegate-1")
      expect(updatedBobDidDoc.didDocument!.verificationMethod![1].type).toEqual("EcdsaSecp256k1VerificationKey2019")
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
        did: erika.did,
        kid: erika.controllerKeyId!,
      })).rejects.toThrow('Key is already the controller for identifier.')
    })

    it('should change owner via meta transaction', async () => {
      const klausDidDoc = await agent.resolveDid({ didUrl: klaus.did })
      // klaus change his dids controller to alice via meta transaction carried out by erika
      await agent.ethrChangeControllerKey({ did: klaus.did, kid: alice.controllerKeyId!, options: { metaIdentifierKeyId: erika.controllerKeyId } })
      const updatedKlausDidDoc = await agent.resolveDid({ didUrl: klaus.did })

      const aliceEthAddress = computeAddress(alice.did.split(':')[3])
      const updatedIdentifier = await agent.didManagerGet({ did: klaus.did })

      expect(updatedIdentifier.controllerKeyId).toEqual(klaus.controllerKeyId)
      expect(updatedKlausDidDoc.didDocument!.id).toEqual(klausDidDoc.didDocument!.id)
      expect(updatedKlausDidDoc.didDocument!.verificationMethod![0].blockchainAccountId).toContain(aliceEthAddress)
    })
  })
}
