pragma solidity 0.8.0;

contract ReentrancyGuard {
	bool reentrancyLock = false;

	modifier reentrancyGuard {
		require(!reentrancyLock, "Reentrancy detected");
		reentrancyLock = true;
		_;
		reentrancyLock = false;
	}
}
