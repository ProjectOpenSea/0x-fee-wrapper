const Caver = require("caver-js");
const dotenv = require('dotenv');

const getContractAddressesForChainOrThrow =
  require("@0x-klaytn/contract-addresses").getContractAddressesForChainOrThrow;
const zeroExFeeWrapper = require("./build/contracts/ZeroExFeeWrapper.json");

dotenv.config()

const chainId = Number(process.env.CHAIN_ID);
const kasAccessKey = process.env.KAS_ACCESS_KEY;
const kasSecretKey = process.env.KAS_SECRET_KEY;
const ownerPrivateKey = process.env.PRIVATE_KEY;
const owner = process.env.ADDRESS;

const endpoint = `https://${kasAccessKey}:${kasSecretKey}@node-api.klaytnapi.com/v1/klaytn?chain-id=${chainId}`;

const contracts = getContractAddressesForChainOrThrow(chainId);
const exchageContract = contracts.exchange;

(async () => {
  const caver = new Caver(endpoint);
  caver.wallet.newKeyring(owner, ownerPrivateKey);
  const contract = new caver.contract(zeroExFeeWrapper.abi);

  const result = await contract.deploy(
    { from: owner, gas: 7000000, value: 0 },
    zeroExFeeWrapper.bytecode,
    exchageContract
  );

  const cont = result._address;
  console.log(`${chainId} Chain: ${cont}`);
})();
