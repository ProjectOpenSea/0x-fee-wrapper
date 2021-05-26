const ExchangeMock = artifacts.require('ExchangeMock');
const TestERC20 = artifacts.require('TestERC20');
const TestERC721 = artifacts.require('TestERC721');
const ZeroExFeeWrapper = artifacts.require('ZeroExFeeWrapper');

const BN = require('bn.js');
const {NULL_ADDRESS,assertIsRejected,makeOrder,encodeAssetData,proxyIds} = require('./util');

contract('ZeroExFeeWrapper',accounts => {

	const deploy = async (list) => {
		return await Promise.all(list.map(list => list.new()));
	};

	const prepareBasicTest = async (options) => {
		const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
		const wrapper = await ZeroExFeeWrapper.new(exchange.address);
		const {accountA,accountB,tokenId,paymentAssetAmount,paymentAssetFee = 0} = options;
		const [erc20Proxy,erc721Proxy] = await Promise.all([exchange.getAssetProxy(proxyIds.erc20),exchange.getAssetProxy(proxyIds.erc721)]);
		await Promise.all([erc721.mint(accountA,tokenId),erc20.mint(accountB,paymentAssetAmount + paymentAssetFee)]);
		await Promise.all([erc721.setApprovalForAll(erc721Proxy,true,{from:accountA}),erc20.approve(erc20Proxy,paymentAssetAmount + paymentAssetFee,{from:accountB})]);
		return {exchange,wrapper,erc20,erc721};
	};

	it('allows owners to add new owners',async () => {
		const [deployer,accountA] = accounts;
		const wrapper = await ZeroExFeeWrapper.new(NULL_ADDRESS);
		await wrapper.setOwner(accountA,true,{from:deployer});
		assert.isTrue(await wrapper.isOwner(accountA));
	});

	it('does not allow non-owners to add new owners',async () => {
		const [,accountA,accountB] = accounts;
		const wrapper = await ZeroExFeeWrapper.new(NULL_ADDRESS);
		return assertIsRejected(
			wrapper.setOwner(accountA,true,{from:accountB}),
			/Owner only/
		);
	});
	
	it('allows owners to change the exchange address',async () => {
		const [deployer] = accounts;
		const wrapper = await ZeroExFeeWrapper.new(NULL_ADDRESS);
		const bogusAddress = "0x0000000000000000000000000000000000000101";
		await wrapper.setExchange(bogusAddress,{from:deployer});
		assert.equal(await wrapper.getExchange(),bogusAddress);
	});

	it('does not allow non-owners to change the exchange address',async () => {
		const [,accountA] = accounts;
		const wrapper = await ZeroExFeeWrapper.new(NULL_ADDRESS);
		const bogusAddress = "0x0000000000000000000000000000000000000101";
		return assertIsRejected(
			wrapper.setExchange(bogusAddress,{from:accountA}),
			/Owner only/
		)
	});

	it('does not allow non-owners to call matchOrders',async () => {
		const [,accountA,accountB] = accounts;
		const wrapper = await ZeroExFeeWrapper.new(NULL_ADDRESS);

		const order = makeOrder({
			makerAddress: accountA,
			makerAssetData: "0x",
			makerAssetAmount: 1,
			takerAssetData: "0x",
			takerAssetAmount: 1,
			});
		
		await assertIsRejected(
			wrapper.matchOrders(order,order,"0x","0x",[],NULL_ADDRESS,{from:accountB}),
			/Owner only/
		);
	});

	it('exchanges tokens',async () => {
		const [deployer,accountA,accountB] = accounts;
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const {wrapper,erc20,erc721} = await prepareBasicTest({
			accountA,
			accountB,
			tokenId,
			paymentAssetAmount
		});

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
			makerAddress: accountB,
			makerAssetData: rightAssetData,
			makerAssetAmount: paymentAssetAmount,
			takerAssetData: leftAssetData,
			takerAssetAmount: 1,
			});

		await wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",[],erc20.address,{from:deployer});

		assert.equal((await erc20.balanceOf(accountA)).toNumber(),paymentAssetAmount);
		assert.equal(await erc721.ownerOf(tokenId),accountB);
	});

	it('transfers fees',async () => {
		const [deployer,accountA,accountB] = accounts;
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		const {wrapper,erc20,erc721} = await prepareBasicTest({
			accountA,
			accountB,
			tokenId,
			paymentAssetAmount,
			paymentAssetFee
		});

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});
		const rightFeeAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
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
	});

	it('disburses fees',async () => {
		const [deployer,accountA,accountB,accountC,accountD] = accounts;
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		const feeAmountForC = 20;
		const feeAmountForD = 30;
		const {wrapper,erc20,erc721} = await prepareBasicTest({
			accountA,
			accountB,
			tokenId,
			paymentAssetAmount,
			paymentAssetFee
		});

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});
		const rightFeeAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
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
	});

	it('does not allow fees to remain',async () => {
		const [deployer,accountA,accountB,accountC,accountD] = accounts;
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		const feeAmountForC = 20;
		const feeAmountForD = 20;
		const {wrapper,erc20,erc721} = await prepareBasicTest({
			accountA,
			accountB,
			tokenId,
			paymentAssetAmount,
			paymentAssetFee
		});

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});
		const rightFeeAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
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

		return assertIsRejected(
			wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",feeData,erc20.address,{from:deployer}),
			/Did not transfer the exact payment fee amount/
		);
	});

	it('does not pay out more fees than it received',async () => {
		const [deployer,accountA,accountB,accountC,accountD] = accounts;
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		const feeAmountForC = 20;
		const feeAmountForD = 300;
		const {wrapper,erc20,erc721} = await prepareBasicTest({
			accountA,
			accountB,
			tokenId,
			paymentAssetAmount,
			paymentAssetFee
		});

		const surplusBalance = 5000;
		await erc20.mint(wrapper.address,surplusBalance); // Give the wrapper a surplus of the payment asset token.

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});
		const rightFeeAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
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

		await assertIsRejected(
			wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",feeData,erc20.address,{from:deployer}),
			/Did not transfer the exact payment fee amount/
		);
		assert.equal(await erc20.balanceOf(wrapper.address),surplusBalance);
	});

	it('requires the feeRecipientAddress to be set to the wrapper (if any)',async () => {
		const [deployer,accountA,accountB,accountC,accountD,accountE] = accounts;
		const tokenId = 5;
		const paymentAssetAmount = 2000;
		const paymentAssetFee = 50;
		const feeAmountForC = 20;
		const feeAmountForD = 30;
		const {wrapper,erc20,erc721} = await prepareBasicTest({
			accountA,
			accountB,
			tokenId,
			paymentAssetAmount,
			paymentAssetFee
		});

		const leftAssetData = encodeAssetData('erc721',{contractAddress: erc721.address,tokenId});
		const rightAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});
		const rightFeeAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});

		const leftOrder = makeOrder({
			makerAddress: accountA,
			makerAssetData: leftAssetData,
			makerAssetAmount: 1,
			takerAssetData: rightAssetData,
			takerAssetAmount: paymentAssetAmount,
			});

		const rightOrder = makeOrder({
			makerAddress: accountB,
			makerAssetData: rightAssetData,
			makerAssetAmount: paymentAssetAmount,
			takerAssetData: leftAssetData,
			takerAssetAmount: 1,
			feeRecipientAddress: accountE,
			makerFeeAssetData: rightFeeAssetData,
			makerFee: paymentAssetFee			
			});

		const feeData = [
			{recipient: accountC, paymentTokenAmount: feeAmountForC},
			{recipient: accountD, paymentTokenAmount: feeAmountForD}
		];

		await assertIsRejected(
			wrapper.matchOrders(leftOrder,rightOrder,"0x","0x",feeData,erc20.address,{from:deployer}),
			/rightOrder\.feeRecipientAddress is not equal to the wrapper address/
		);
	});
});
