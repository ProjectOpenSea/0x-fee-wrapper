const ExchangeMock = artifacts.require('ExchangeMock');
const TestERC20 = artifacts.require('TestERC20');
const TestERC721 = artifacts.require('TestERC721');
const ZeroExFeeWrapper = artifacts.require('ZeroExFeeWrapper');

const BN = require('bn.js');
const {makeOrder,encodeAssetData,proxyIds} = require('./util');

contract('ZeroExFeeWrapper',accounts => {

	const deploy = async (list) => {
		return await Promise.all(list.map(list => list.new()));
	};

	it('exchanges tokens',async () => {
		const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
		const wrapper = await ZeroExFeeWrapper.new(exchange.address);
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

		await wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",[],erc20.address,{from:deployer});

		assert.equal((await erc20.balanceOf(accountA)).toNumber(),paymentAssetAmount);
		assert.equal(await erc721.ownerOf(tokenId),accountB);
	})

	it('transfers fees',async () => {
		const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
		const wrapper = await ZeroExFeeWrapper.new(exchange.address);
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

		await wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",[],erc20.address,{from:deployer});

		assert.equal((await erc20.balanceOf(deployer)).toNumber(),paymentAssetFee);
	})

	it('disburses fees',async () => {
		const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
		const wrapper = await ZeroExFeeWrapper.new(exchange.address);
		const [deployer,accountA,accountB,accountC,accountD] = accounts;
		const [erc20Proxy,erc721Proxy] = await Promise.all([exchange.getAssetProxy(proxyIds.erc20),exchange.getAssetProxy(proxyIds.erc721)]);
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		const feeAmountForC = 30;
		const feeAmountForD = 20;

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
			feeRecipientAddress: wrapper.address,
			makerFeeAssetData: rightFeeAssetData,
			makerFee: paymentAssetFee			
			});

		const feeData = [
			{recipient: accountC, paymentTokenAmount: feeAmountForC},
			{recipient: accountD, paymentTokenAmount: feeAmountForD}
		];

		await wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",feeData,erc20.address,{from:deployer});

		assert.equal((await erc20.balanceOf(accountC)).toNumber(),feeAmountForC);
		assert.equal((await erc20.balanceOf(accountD)).toNumber(),feeAmountForD);
	})
})
