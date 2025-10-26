// Contract ABIs for DAO functionality
export const COMPASS_TOKEN_ABI = [
  {
    "inputs": [{"internalType": "uint256", "name": "initialSupply", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "MAX_SUPPLY",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "address", "name": "spender", "type": "address"}],
    "name": "allowance",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "spender", "type": "address"}, {"internalType": "uint256", "name": "value", "type": "uint256"}],
    "name": "approve",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
    "name": "balanceOf",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "burnFrom",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "daoContract",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [{"internalType": "uint8", "name": "", "type": "uint8"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}, {"internalType": "string", "name": "reason", "type": "string"}],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "_daoContract", "type": "address"}],
    "name": "setDAOContract",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [{"internalType": "string", "name": "", "type": "string"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "value", "type": "uint256"}],
    "name": "transfer",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "value", "type": "uint256"}],
    "name": "transferFrom",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "from", "type": "address"}, {"internalType": "address", "name": "to", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
    "name": "transferFromDAO",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "newOwner", "type": "address"}],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const FEEDBACK_AUTHENTICATION_DAO_ABI = [
  {
    "inputs": [
      {"internalType": "address", "name": "_compassToken", "type": "address"},
      {"internalType": "address", "name": "_reputationRegistry", "type": "address"},
      {"internalType": "uint256", "name": "_initialTreasury", "type": "uint256"}
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AUTHENTICATION_PERIOD",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "MEMBER_TOKEN_DIVISOR",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "VOTING_PERIOD",
    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {"internalType": "uint256", "name": "agentId", "type": "uint256"},
      {"internalType": "address", "name": "clientAddress", "type": "address"},
      {"internalType": "uint64", "name": "feedbackIndex", "type": "uint64"},
      {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"}
    ],
    "name": "authenticateFeedback",
    "outputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}],
    "name": "finalizeAuthentication",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}],
    "name": "finalizeContestation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}],
    "name": "getContestation",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "contester", "type": "address"},
          {"internalType": "uint256", "name": "contestStake", "type": "uint256"},
          {"internalType": "uint256", "name": "voteStartTime", "type": "uint256"},
          {"internalType": "uint256", "name": "legitimateStake", "type": "uint256"},
          {"internalType": "uint256", "name": "notLegitimateStake", "type": "uint256"},
          {"internalType": "bool", "name": "isActive", "type": "bool"}
        ],
        "internalType": "struct IFeedbackAuthenticationDAO.Contestation",
        "name": "contest",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMemberCount",
    "outputs": [{"internalType": "uint256", "name": "memberCount", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}],
    "name": "getPendingAuthentication",
    "outputs": [
      {
        "components": [
          {"internalType": "address", "name": "staker", "type": "address"},
          {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"},
          {"internalType": "uint256", "name": "startTime", "type": "uint256"},
          {"internalType": "uint256", "name": "pausedAt", "type": "uint256"},
          {"internalType": "uint256", "name": "agentId", "type": "uint256"},
          {"internalType": "address", "name": "clientAddress", "type": "address"},
          {"internalType": "uint64", "name": "feedbackIndex", "type": "uint64"},
          {
            "components": [
              {"internalType": "enum IFeedbackAuthenticationDAO.AuthenticationStatus", "name": "status", "type": "uint8"}
            ],
            "internalType": "enum IFeedbackAuthenticationDAO.AuthenticationStatus",
            "name": "status",
            "type": "uint8"
          }
        ],
        "internalType": "struct IFeedbackAuthenticationDAO.PendingAuthentication",
        "name": "auth",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}, {"internalType": "address", "name": "voter", "type": "address"}],
    "name": "getVote",
    "outputs": [
      {
        "components": [
          {
            "components": [
              {"internalType": "enum IFeedbackAuthenticationDAO.VoteChoice", "name": "choice", "type": "uint8"}
            ],
            "internalType": "enum IFeedbackAuthenticationDAO.VoteChoice",
            "name": "choice",
            "type": "uint8"
          },
          {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"},
          {"internalType": "bool", "name": "hasVoted", "type": "bool"}
        ],
        "internalType": "struct IFeedbackAuthenticationDAO.Vote",
        "name": "vote",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTreasuryBalance",
    "outputs": [{"internalType": "uint256", "name": "balance", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "agentId", "type": "uint256"}, {"internalType": "address", "name": "clientAddress", "type": "address"}, {"internalType": "uint64", "name": "feedbackIndex", "type": "uint64"}],
    "name": "isAuthenticatedFeedback",
    "outputs": [{"internalType": "bool", "name": "isAuthenticated", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "member", "type": "address"}],
    "name": "isMember",
    "outputs": [{"internalType": "bool", "name": "isMember", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "joinDAO",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}, {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"}],
    "name": "contestAuthentication",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "uint256", "name": "authId", "type": "uint256"}, {"internalType": "uint8", "name": "choice", "type": "uint8"}, {"internalType": "uint256", "name": "stakeAmount", "type": "uint256"}],
    "name": "voteOnContestation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
