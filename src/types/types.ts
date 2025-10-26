export interface Market {
    question: string;
    optionA: string;
    optionB: string;
    endTime: bigint;
    outcome: number; // 0: UNRESOLVED, 1: OPTION_A, 2: OPTION_B, 3: INVALID
    totalOptionAShares: bigint;
    totalOptionBShares: bigint;
    resolved: boolean;
    feesForCreator: bigint;
}

// New oracle resolution system types
export enum ResolutionStatus {
    PENDING = 0,
    AWAITING_PROPOSAL = 1,
    DISPUTE_WINDOW = 2,
    IN_DISPUTE = 3,
    JURY_VOTING = 4,
    FINALIZED = 5
}

export enum MarketOutcome {
    UNRESOLVED = 0,
    OPTION_A = 1,
    OPTION_B = 2,
    INVALID = 3
}

export interface MarketResolution {
    status: ResolutionStatus;
    proposer: string;
    proposedOutcome: MarketOutcome;
    disputer: string;
    disputedOutcome: MarketOutcome;
    disputeWindowEnd: bigint;
    votingEnd: bigint;
    votesForProposer: bigint;
    votesForDisputer: bigint;
}

export interface JurorStake {
    stake: bigint;
    unlockTime: bigint;
}

// Deprecated - keeping for backwards compatibility
export interface VoteCounts {
    optionAVotes: number;
    optionBVotes: number;
    invalidVotes: number;
}

export interface MultisigStatus {
    voteCounts: VoteCounts;
    isExpired: boolean;
    isResolved: boolean;
    canVote: boolean;
    hasVoted: boolean;
}