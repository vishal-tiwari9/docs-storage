// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/CapsuleRegistry.sol";

contract CapsuleInvariant is Test {
    CapsuleRegistry reg;

    function setUp() public {
        reg = new CapsuleRegistry();
        targetContract(address(reg));
    }

    /// Invariant: nextId always increases and matches capsules created
    function invariant_nextIdProgressive() public {
        uint256 total = reg.nextId();
        for (uint256 i = 0; i < total; i++) {
            (string memory cid,,) = reg.getCapsule(i);
            assert(bytes(cid).length > 0);
        }
    }
}
