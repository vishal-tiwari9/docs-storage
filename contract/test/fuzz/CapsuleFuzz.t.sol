// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/CapsuleRegistry.sol";

contract CapsuleFuzz is Test {
    CapsuleRegistry reg;

    function setUp() public {
        reg = new CapsuleRegistry();
    }

    function testFuzzCreateCapsule(string calldata cid) public {
        vm.prank(reg.deployer());
        uint256 id = reg.createCapsule(cid);

        (string memory stored,,) = reg.getCapsule(id);
        assertEq(stored, cid);
    }
}
