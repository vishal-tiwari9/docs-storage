// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/CapsuleRegistry.sol";

contract CapsuleRegistryTest is Test {
    CapsuleRegistry reg;
    address admin = address(0xAA);

    function setUp() public {
        reg = new CapsuleRegistry();
        vm.prank(reg.deployer());
        reg.addAdmin(admin);
    }

    function testCreateCapsule() public {
        vm.prank(admin);
        uint256 id = reg.createCapsule("QmCID1");
        assertEq(id, 0);

        (string memory cid,,) = reg.getCapsule(id);
        assertEq(cid, "QmCID1");
    }

    function testOnlyAdminReverts() public {
        vm.expectRevert(CapsuleRegistry.NotAdmin.selector);
        reg.createCapsule("X");
    }
}
