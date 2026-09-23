// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import {Script} from "forge-std/Script.sol";
import {EvidenceAnchor} from "../src/EvidenceAnchor.sol";

/// @notice Deployment script. A broadcast is intentional and must only use published, official network settings.
contract DeployEvidenceAnchor is Script {
    function run() external returns (EvidenceAnchor evidenceAnchor) {
        vm.startBroadcast();
        evidenceAnchor = new EvidenceAnchor();
        vm.stopBroadcast();
    }
}
