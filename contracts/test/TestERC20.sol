pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestERC20 is ERC20("Test20", "TST20") {
	constructor () public {
	}

	function mint(address to, uint256 value) public returns (bool) {
		_mint(to, value);
		return true;
	}
}
