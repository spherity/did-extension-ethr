# Veramo Extension Plugin for did:ethr

This Veramo plugin extends the functionality of `did-provider-ethr` by exposing a new method `ethrChangeControllerKey`
which allows the owner of a `did:ethr` to change its owner and therefor its controller. Meta transactions are support as
well by providing a `metaIdentifierKeyId` in the options.

## Quick start

* Clone this repo
* `npm ci`
* `npm run build`
* `npm run generate-plugin-schema`
* `npm run start` or VSCode Debugger (CMD + Shift + D) > Run `OpenAPI server`

## Usage

```typescript
agent = createAgent<IEthrDidExtension & ...>({
  plugins: [
    ...
    new EthrDidExtension({
      store: new DIDStore(dbConnection),
      defaultKms: 'local',
      networks: [
        {
          chainId: 5,
          name: 'goerli',
          provider: new JsonRpcProvider('http://localhost:8545'),
        },
      ],
    }),
    ...
  ],
})

...

const alice = await agent.didManagerImport({...});
const bob = await agent.didManagerImport({...});
const txHash = await agent.ethrChangeControllerKey({ did: alice.did, kid: bob.controllerKeyId! })
```