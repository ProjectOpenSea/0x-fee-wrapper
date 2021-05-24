pragma solidity 0.8.0;
pragma abicoder v2;

import "../lib/ReentrancyGuard.sol";
import "../lib/LibOrder.sol";
import "../lib/LibFillResults.sol";
import "../lib/ArrayUtils.sol";

contract ExchangeMock is ReentrancyGuard {
	bytes4 _erc20 = hex"f47261b0";
	bytes4 _erc721 = hex"02571792";
	bytes4 _erc1155 = hex"a7cb5fb7";

	function getAssetProxy(bytes4 assetProxyId)
		external
		view
		returns (address assetProxy)
	{
		return address(this);
	}

	function matchOrders(
		LibOrder.Order memory leftOrder,
		LibOrder.Order memory rightOrder,
		bytes memory leftSignature,
		bytes memory rightSignature
		)
		public
		payable
		reentrancyGuard
		returns (LibFillResults.MatchedFillResults memory matchedFillResults)
	{
		transferTokens(leftOrder.makerAssetData,leftOrder.makerAddress,rightOrder.makerAddress,leftOrder.makerAssetAmount);
		transferTokens(rightOrder.makerAssetData,rightOrder.makerAddress,leftOrder.makerAddress,rightOrder.makerAssetAmount);
		if (leftOrder.makerFee > 0)
			transferTokens(leftOrder.makerFeeAssetData,leftOrder.makerAddress,leftOrder.feeRecipientAddress,leftOrder.makerFee);
		if (rightOrder.makerFee > 0)
			transferTokens(rightOrder.makerFeeAssetData,rightOrder.makerAddress,rightOrder.feeRecipientAddress,rightOrder.makerFee);
		if (leftOrder.takerFee > 0)
			transferTokens(leftOrder.takerFeeAssetData,leftOrder.takerAddress,leftOrder.feeRecipientAddress,leftOrder.takerFee);
		if (rightOrder.takerFee > 0)
			transferTokens(rightOrder.takerFeeAssetData,rightOrder.takerAddress,rightOrder.feeRecipientAddress,rightOrder.takerFee);
		// refund final balance
		return matchedFillResults;
	}

	function extractBytes4(bytes memory data)
		internal
		pure
		returns (bytes4)
	{
		require(data.length >= 4,"Data too short");
		return bytes4(data[0]) | (bytes4(data[1]) >> 8) | (bytes4(data[2]) >> 16) | (bytes4(data[3]) >> 24);
	}

	function transferTokens(bytes memory assetData,address from, address to, uint256 amount)
		internal
	{
		bytes4 proxyId = extractBytes4(assetData);
		if (proxyId == _erc20)
			transferERC20(assetData,from,to,amount);
		else if (proxyId == _erc721)
			transferERC721(assetData,from,to);
		else if (proxyId == _erc1155)
			transferERC1155(assetData,from,to,amount);
		else
			revert("Unknown proxyID standard");
	}

	function transferERC20(bytes memory assetData,address from, address to, uint256 amount)
		private
	{
		(address contractAddress) = abi.decode(ArrayUtils.arrayDrop(assetData,4), (address));
		(bool success,) = contractAddress.call(abi.encodeWithSignature("transferFrom(address,address,uint256)",from,to,amount));
		require(success,"ERC20 transfer failed");
	}

	function transferERC721(bytes memory assetData,address from, address to)
		private
	{
		(address contractAddress, uint256 tokenId) = abi.decode(ArrayUtils.arrayDrop(assetData,4), (address,uint256));
		(bool success,) = contractAddress.call(abi.encodeWithSignature("transferFrom(address,address,uint256)",from,to,tokenId));
		require(success,"ERC721 transfer failed");
	}

	function transferERC1155(bytes memory assetData,address from, address to, uint256 amount)
		private
	{
		(address contractAddress, uint256[] memory tokenIds, uint256[] memory amounts, bytes memory extra) = abi.decode(ArrayUtils.arrayDrop(assetData,4), (address,uint256[],uint256[],bytes));
		require(tokenIds.length > 0,"No token IDs");
		(bool success,) = contractAddress.call(abi.encodeWithSignature("safeTransferFrom(address,address,uint256,uint256,bytes)",from,to,tokenIds[0],amount,extra));
		require(success,"ERC1155 transfer failed");
	}
}