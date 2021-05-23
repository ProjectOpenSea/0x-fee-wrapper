const Migrations = artifacts.require("Migrations");
// const TestERC20 = artifacts.require("TestERC20");
// const TestERC20 = artifacts.require("TestERC20");
// const TestERC20 = artifacts.require("TestERC20");
// const ExchangeMock = artifacts.require("ExchangeMock");

module.exports = async (deployer,network) => {
	await deployer.deploy(Migrations);
	// if (network === 'development') {
	// 	await deployer.deploy(TestERC20);
	// 	await deployer.deploy(ExchangeMock);
	// }
};
