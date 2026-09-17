// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.24;

/// @title EquityMuxReceiptRegistry
/// @notice Commit execution-receipt evidence to BSC. Holds NO funds and NO
///         custody — it is a notary, not a vault. Event-based commitment keeps
///         it cheap; an append-only mapping guards against hash overwrite.
contract EquityMuxReceiptRegistry {
    event ReceiptCommitted(
        bytes32 indexed receiptHash,
        bytes32 indexed policyHash,
        bytes32 indexed intentHash,
        address executor,
        bytes32 executionTxHash,
        uint256 timestamp
    );

    /// @notice receiptHash => block timestamp of first commitment (0 = none)
    mapping(bytes32 => uint256) public committedAt;

    error ZeroHash();
    error AlreadyCommitted(bytes32 receiptHash);

    /// @notice Commit a receipt bundle. Reverts on zero receipt hash or a
    ///         duplicate receiptHash (receipts are unique artifacts).
    function commit(
        bytes32 receiptHash,
        bytes32 policyHash,
        bytes32 intentHash,
        bytes32 executionTxHash
    ) external {
        if (receiptHash == bytes32(0)) revert ZeroHash();
        if (committedAt[receiptHash] != 0) revert AlreadyCommitted(receiptHash);
        committedAt[receiptHash] = block.timestamp;
        emit ReceiptCommitted(
            receiptHash, policyHash, intentHash, msg.sender, executionTxHash, block.timestamp
        );
    }

    /// @notice True when a receipt hash has been committed.
    function isCommitted(bytes32 receiptHash) external view returns (bool) {
        return committedAt[receiptHash] != 0;
    }
}
