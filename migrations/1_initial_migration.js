const Migrations = artifacts.require("Migrations");
const ExchangeMock = artifacts.require("ExchangeMock");
const ZeroExFeeWrapper = artifacts.require("ZeroExFeeWrapper");

const zeroExExchangeAddresses = {
	ethereum: "0x61935cbdd02287b511119ddb11aeb42f1593b7ef",
	rinkeby: "0xf8becacec90bfc361c0a2c720839e08405a72f6d",
	matic: "0xfede379e48c873c75f3cc0c81f7c784ad730a8f7",
	mumbai: "0x533dc89624dcc012c7323b41f286bd2df478800b",
	klaytn: "0xaadefaa2b05fc765902a92121abb6ad9e8233c2c",
	baobab: "0x3887cf551a1Bd89f04775e224e6954083A23380D"
}

module.exports = async (deployer,network) => {
	await deployer.deploy(Migrations);
	const exchangeAddress = network === 'development'
		? (await deployer.deploy(ExchangeMock) && ExchangeMock.address)
		: zeroExExchangeAddresses[network];
	if (!exchangeAddress)
		throw new Error(`No 0x exchange address for network ${network}`);
	await deployer.deploy(ZeroExFeeWrapper,exchangeAddress);
};
