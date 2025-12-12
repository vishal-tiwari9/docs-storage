// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Capsule Registry - Stores IPFS CIDs for Capsules (Allotments)
/// @notice Only admins can create/update capsules.
/// @dev QR generation is frontend-only (using the capsule ID in URL).
   contract CapsuleRegistry {
    // ----------------- ERRORS -----------------
    error NotAdmin();
    error InvalidCapsule();

    // ----------------- STATE -----------------
    /// @notice Tracks which addresses are admins.
    /// @dev true = admin; false = normal user.
    mapping(address => bool) public admins;

    /// @notice Struct storing one capsule's metadata.
    /// @param cid IPFS folder CID (string)
    /// @param createdAt timestamp
    /// @param updatedAt timestamp
    struct Capsule {
        string cid;
        uint256 createdAt;
        uint256 updatedAt;
    }

    /// @notice Mapping of capsuleId → Capsule data.
    mapping(uint256 => Capsule) public capsules;

    /// @notice Auto-increment capsule ID.
    uint256 public nextId;

    /// @notice Contract deployer stored permanently as creator.
    address public immutable deployer;

    // ----------------- EVENTS -----------------
    event AdminAdded(address indexed admin);
    event CapsuleCreated(uint256 indexed id, string cid);
    event CapsuleUpdated(uint256 indexed id, string cid);

    // ----------------- MODIFIERS -----------------
    modifier onlyAdmin() {
        if (!admins[msg.sender]) revert NotAdmin();
        _;
    }

    // ----------------- CONSTRUCTOR -----------------
    constructor() {
        deployer = msg.sender;
        admins[msg.sender] = true; // deployer = first admin
        emit AdminAdded(msg.sender);
    }

    // ----------------- ADMIN MANAGEMENT -----------------

    /// @notice Add new admin.
    /// @dev Only existing admin can add others.
    function addAdmin(address newAdmin) external onlyAdmin {
        admins[newAdmin] = true;
        emit AdminAdded(newAdmin);
    }

    // ----------------- CAPSULE LOGIC -----------------

    /// @notice Create a new capsule.
    /// @param cid IPFS folder CID (contains metadata.json + files)
    /// @return id Newly created capsule ID
    function createCapsule(string calldata cid) external onlyAdmin returns (uint256 id) {
        id = nextId;

        capsules[id] = Capsule({cid: cid, createdAt: block.timestamp, updatedAt: block.timestamp});

        unchecked {
            nextId = id + 1;
        }

        emit CapsuleCreated(id, cid);
    }

    /// @notice Update an existing capsule's metadata.
    /// @param id Capsule ID
    /// @param cid New IPFS CID
    function updateCapsule(uint256 id, string calldata cid) external onlyAdmin {
        if (id >= nextId) revert InvalidCapsule();

        capsules[id].cid = cid;
        capsules[id].updatedAt = block.timestamp;

        emit CapsuleUpdated(id, cid);
    }

    /// @notice Fetch capsule
    function getCapsule(uint256 id) external view returns (Capsule memory) {
        if (id >= nextId) revert InvalidCapsule();
        return capsules[id];
    }
}
