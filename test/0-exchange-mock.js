const ExchangeMock = artifacts.require('ExchangeMock');
const TestERC20 = artifacts.require('TestERC20');
const TestERC721 = artifacts.require('TestERC721');

const BN = require('bn.js');
const {makeOrder,encodeAssetData} = require('./util');

contract('ExchangeMock',accounts => {

	const deploy = async (list) => {
		return await Promise.all(list.map(list => list.new()));
	};

	it('exchanges tokens',async () => {
	const [exchange,erc20,erc721] = await deploy([ExchangeMock,TestERC20,TestERC721]);
	const paymentAssetAmount = 2000;
	const tokenId = 5;
	await Promise.all([erc20.mint(accounts[1],paymentAssetAmount),erc721.mint(accounts[2],tokenId)]);
	await Promise.all([erc20.approve(exchange.address,paymentAssetAmount,{from:accounts[1]}),erc721.setApprovalForAll(exchange.address,true,{from:accounts[2]})]);

	const leftAssetData = encodeAssetData('erc20',{contractAddress: erc20.address});
	const rightAssetData = encodeAssetData('erc721',{contractAddress: erc721.address, tokenId});

	const leftOrder = makeOrder({
		senderAddress: accounts[0],
		makerAddress: accounts[1],
		makerAssetData: leftAssetData,
		makerAssetAmount: paymentAssetAmount,
		takerAssetData: rightAssetData,
		takerAssetAmount: 1,
		});

	const rightOrder = makeOrder({
		senderAddress: accounts[0],
		makerAddress: accounts[2],
		makerAssetData: rightAssetData,
		makerAssetAmount: 1,
		takerAssetData: leftAssetData,
		takerAssetAmount: paymentAssetAmount,
		});

	console.log(leftOrder)

	console.log((await erc20.balanceOf(accounts[1])).toString())
	await exchange.matchOrders(leftOrder,rightOrder,"0x","0x");


	console.log((await erc20.balanceOf(accounts[1])).toString())
	console.log(exchange.address);
	})
})
