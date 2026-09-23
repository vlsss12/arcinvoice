// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/// @title EvidenceAnchor
/// @notice An immutable, minimal registry for SHA-256 digests of public-safe QA evidence packs.
/// @dev This contract deliberately has no owner, roles, token logic, upgrade path, or value-handling path.
contract EvidenceAnchor {
    /// @notice Public metadata for a digest anchored once on this deployment.
    struct Anchor {
        address submitter;
        uint64 anchoredAt;
    }

    /// @notice Emitted once when a previously unseen evidence digest is anchored.
    /// @param evidenceDigest SHA-256 digest of a reviewed, public-safe evidence payload.
    /// @param submitter Account that submitted the anchor transaction.
    /// @param anchoredAt Block timestamp at which the digest was anchored.
    event EvidenceAnchored(
        bytes32 indexed evidenceDigest, address indexed submitter, uint64 anchoredAt
    );

    error EmptyDigest();
    error EvidenceAlreadyAnchored(bytes32 evidenceDigest);
    error ValueNotAccepted();
    error UnknownCall();

    mapping(bytes32 evidenceDigest => Anchor anchor) private anchors;

    /// @notice Stores a digest once and makes its existence independently verifiable.
    /// @dev Only hash a report that is safe to make permanently public. This contract cannot delete data.
    /// @param evidenceDigest A 32-byte SHA-256 digest, represented as bytes32.
    function anchor(bytes32 evidenceDigest) external returns (uint64 anchoredAt) {
        if (evidenceDigest == bytes32(0)) revert EmptyDigest();
        if (anchors[evidenceDigest].anchoredAt != 0) {
            revert EvidenceAlreadyAnchored(evidenceDigest);
        }

        anchoredAt = uint64(block.timestamp);
        anchors[evidenceDigest] = Anchor({submitter: msg.sender, anchoredAt: anchoredAt});

        emit EvidenceAnchored(evidenceDigest, msg.sender, anchoredAt);
    }

    /// @notice Reads the public anchor state for a digest without modifying chain state.
    function getAnchor(bytes32 evidenceDigest)
        external
        view
        returns (bool exists, address submitter, uint64 anchoredAt)
    {
        Anchor memory evidenceAnchor = anchors[evidenceDigest];
        exists = evidenceAnchor.anchoredAt != 0;
        return (exists, evidenceAnchor.submitter, evidenceAnchor.anchoredAt);
    }

    /// @notice Convenience check for clients that only need the existence result.
    function isAnchored(bytes32 evidenceDigest) external view returns (bool) {
        return anchors[evidenceDigest].anchoredAt != 0;
    }

    receive() external payable {
        revert ValueNotAccepted();
    }

    fallback() external payable {
        revert UnknownCall();
    }
}
