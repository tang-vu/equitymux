// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/EquityMuxReceiptRegistry.sol";

/// Deploy with:
///   forge script script/Deploy.s.sol --rpc-url $BSC_RPC --broadcast --verify
/// Requires DEPLOYER_PRIVATE_KEY in env — never hardcode.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast(vm.envUint("DEPLOYER_PRIVATE_KEY"));
        new EquityMuxReceiptRegistry();
        vm.stopBroadcast();
    }
}
