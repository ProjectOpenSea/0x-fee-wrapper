const ExchangeMock = artifacts.require('ExchangeMock');
const TestERC20 = artifacts.require('TestERC20');
const TestERC721 = artifacts.require('TestERC721');

const {makeOrder,encodeAssetData,proxyIds} = require('./util');

contract.skip('ExchangeMock',accounts => {

	const deploy = async (list) => {
		return await Promise.all(list.map(list => list.new()));
	};

	it('exchanges tokens',async () => {
		const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
		const [deployer,accountA,accountB] = accounts;
		const [erc20Proxy,erc721Proxy] = await Promise.all([exchange.getAssetProxy(proxyIds.erc20),exchange.getAssetProxy(proxyIds.erc721)]);
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		await Promise.all([erc721.mint(accountA,tokenId),erc20.mint(accountB,paymentAssetAmount)]);
		await Promise.all([erc721.setApprovalForAll(erc721Proxy,true,{from:accountA}),erc20.approve(erc20Proxy,paymentAssetAmount,{from:accountB})]);

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			senderAddress: deployer,
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
			senderAddress: deployer,
			makerAddress: accountB,
			makerAssetData: rightAssetData,
			makerAssetAmount: paymentAssetAmount,
			takerAssetData: leftAssetData,
			takerAssetAmount: 1,
			});

		await exchange.matchOrders(leftOrder,rightOrder,"0x","0x",{from:deployer});

		assert.equal((await erc20.balanceOf(accountA)).toNumber(),paymentAssetAmount);
		assert.equal(await erc721.ownerOf(tokenId),accountB);
	});

	it('transfers fees',async () => {
		const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
		const [deployer,accountA,accountB] = accounts;
		const [erc20Proxy,erc721Proxy] = await Promise.all([exchange.getAssetProxy(proxyIds.erc20),exchange.getAssetProxy(proxyIds.erc721)]);
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		await Promise.all([erc721.mint(accountA,tokenId),erc20.mint(accountB,paymentAssetAmount + paymentAssetFee)]);
		await Promise.all([erc721.setApprovalForAll(erc721Proxy,true,{from:accountA}),erc20.approve(erc20Proxy,paymentAssetAmount + paymentAssetFee,{from:accountB})]);

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const rightFeeAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			senderAddress: deployer,
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
			senderAddress: deployer,
			makerAddress: accountB,
			makerAssetData: rightAssetData,
			makerAssetAmount: paymentAssetAmount,
			takerAssetData: leftAssetData,
			takerAssetAmount: 1,
			feeRecipientAddress: deployer,
			makerFeeAssetData: rightFeeAssetData,
			makerFee: paymentAssetFee			
			});

		await exchange.matchOrders(leftOrder,rightOrder,"0x","0x",{from:deployer});

		assert.equal((await erc20.balanceOf(deployer)).toNumber(),paymentAssetFee);
	});
});
