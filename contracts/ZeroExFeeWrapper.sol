pragma solidity 0.8.0;
pragma abicoder v2;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./lib/ReentrancyGuard.sol";
import "./lib/LibOrder.sol";

contract ZeroExFeeWrapper is ReentrancyGuard {
	mapping(address => bool) _owners;
	address _exchange;

	struct FeeData {
		address recipient;
		uint256 paymentTokenAmount;
	}

	constructor(address exchange)
	{
		_owners[msg.sender] = true;
		_exchange = exchange;
	}

	modifier ownerOnly()
	{
		require(_owners[msg.sender],"Owner only");
		_;
	}

	function setOwner(address owner,bool isOwner)
		external
		ownerOnly
	{
		_owners[owner] = isOwner;
	}

	function isOwner(address owner)
		external
		view
		returns (bool)
	{
		return _owners[owner];
	}

	function setExchange(address exchange)
		external
		ownerOnly
	{
		_exchange = exchange;
	}

	function getExchange()
		external
		view
		returns (address)
	{
		return _exchange;
	}

	function proxyCall(address target,bytes calldata callData)
		external
		payable
		ownerOnly
		returns (bytes memory)
	{
		(bool success, bytes memory result) = target.call{value: msg.value}(callData);
		return result;
	}

	function matchOrders(
		LibOrder.Order memory leftOrder,
		LibOrder.Order memory rightOrder,
		bytes memory leftSignature,
		bytes memory rightSignature,
		FeeData[] memory feeData,
		address paymentTokenAddress
		)
		external
		payable
		reentrancyGuard
		ownerOnly
		returns (bytes memory)
	{
		if (leftOrder.senderAddress != address(0x0)) {
			require(leftOrder.senderAddress == address(this),"leftOrder.senderAddress has to be 0x0 or the wrapper address");
		}
		if (rightOrder.senderAddress != address(0x0)) {
			require(rightOrder.senderAddress == address(this),"rightOrder.senderAddress has to be 0x0 or the wrapper address");
		}
		bool transferFees = paymentTokenAddress != address(0x0) && feeData.length > 0;
		uint256 currentFeeBalance;
		if (transferFees) {
			require(leftOrder.feeRecipientAddress == address(this) || rightOrder.feeRecipientAddress == address(this),"Neither order has a fee recipient");
			currentFeeBalance = ERC20(paymentTokenAddress).balanceOf(address(this));
		}
		(bool success, bytes memory result) = _exchange.call{value: msg.value}(abi.encodeWithSignature("matchOrders((address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes,bytes,bytes),(address,address,address,address,uint256,uint256,uint256,uint256,uint256,uint256,bytes,bytes,bytes,bytes),bytes,bytes)",leftOrder,rightOrder,leftSignature,rightSignature));
		require(success,"matchOrders failed");
		if (transferFees) {
			for (uint index = 0 ; index < feeData.length ; ++index) {
				require(ERC20(paymentTokenAddress).transfer(feeData[index].recipient, feeData[index].paymentTokenAmount),"Transfer failed");
			}
			require(ERC20(paymentTokenAddress).balanceOf(address(this)) == currentFeeBalance,"Did not transfer the exact payment fee amount");
		}
		return result;
	}
}
