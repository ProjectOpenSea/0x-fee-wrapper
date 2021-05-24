const Web3 = require('web3');
const web3 = new Web3();
const BN = require('bn.js');

const NULL_ADDRESS = '0x0000000000000000000000000000000000000000';

const requiredOrderFields = ["makerAddress","senderAddress","makerAssetAmount","takerAssetAmount","makerAssetData","takerAssetData"];

function makeOrder(order) {
	const missingFields = requiredOrderFields.filter(field => !order.hasOwnProperty(field));
	if (missingFields.length)
		throw new Error(`Missing fields: ${missingFields.join(', ')}`);
	return Object.assign({
		takerAddress: NULL_ADDRESS,
		feeRecipientAddress: NULL_ADDRESS,
		makerFee: 0,
		takerFee: 0,
		expirationTimeSeconds: new BN('115792089237316195423570985008687907853269984665640564039457584007913129639935'),
		salt: 0,
		makerFeeAssetData: "0x",
		takerFeeAssetData: "0x"
	},order);
}

const proxyIds = {
	erc20: "0xf47261b0",
	erc721: "0x02571792",
	erc1155: "0xa7cb5fb7"
}

function encodeAssetData(type,data) {
	switch (type) {
		case 'erc20':
			return proxyIds.erc20 + web3.eth.abi.encodeParameters(['address'],[data.contractAddress]).substr(2);
		case 'erc721':
			return proxyIds.erc721 + web3.eth.abi.encodeParameters(['address','uint256'],[data.contractAddress,data.tokenId]).substr(2);
		case 'erc1155':
			return proxyIds.erc1155 + web3.eth.abi.encodeParameters(['address','uint256[]','uint256[]','bytes'],[data.contractAddress,[data.tokenId],[data.tokenAmount],data.extra || "0x"]).substr(2);
	}
	throw new Error(`Unknown type ${type}`);
}

module.exports = {makeOrder,encodeAssetData, proxyIds};
