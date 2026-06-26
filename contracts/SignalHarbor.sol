// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SignalHarbor {
    mapping(address => uint256) public userPulses;
    mapping(address => uint256) public userSwitches;
    mapping(address => uint256) public userStamps;

    uint256 public totalPulses;
    uint256 public totalSwitches;
    uint256 public totalStamps;

    event SignalPulsed(address indexed user, uint256 userPulses, uint256 totalPulses);
    event SwitchFlipped(address indexed user, uint256 userSwitches, uint256 totalSwitches);
    event PassStamped(address indexed user, uint256 userStamps, uint256 totalStamps);

    function pulseSignal() external {
        unchecked {
            userPulses[msg.sender] += 1;
            totalPulses += 1;
        }

        emit SignalPulsed(msg.sender, userPulses[msg.sender], totalPulses);
    }

    function flipSwitch() external {
        unchecked {
            userSwitches[msg.sender] += 1;
            totalSwitches += 1;
        }

        emit SwitchFlipped(msg.sender, userSwitches[msg.sender], totalSwitches);
    }

    function stampPass() external {
        unchecked {
            userStamps[msg.sender] += 1;
            totalStamps += 1;
        }

        emit PassStamped(msg.sender, userStamps[msg.sender], totalStamps);
    }
}
