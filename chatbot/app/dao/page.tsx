'use client';

import { useState } from 'react';
import { useDAO } from '@/lib/hooks/use-dao';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { VoteChoice } from '@/lib/contracts/dao-contracts';
import FaultyTerminal from '@/components/FaultyTerminal';

export default function DAOPage() {
  const {
    daoStatus,
    isConnected,
    address,
    chainId,
    devMode,
    setDevMode,
    isDevConnected,
    isJoining,
    isWritePending,
    isConfirming,
    isConfirmed,
    joinDAO,
    authenticateFeedback,
    contestAuthentication,
    voteOnContestation,
  } = useDAO();

  // Form states for mock functions
  const [stakeAmount, setStakeAmount] = useState('');
  const [agentId, setAgentId] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [feedbackIndex, setFeedbackIndex] = useState('');
  const [authId, setAuthId] = useState('');
  const [voteChoice, setVoteChoice] = useState<VoteChoice>(VoteChoice.Legitimate);

  const handleJoinDAO = async () => {
    await joinDAO();
  };

  const handleAuthenticateFeedback = async () => {
    if (!agentId || !clientAddress || !feedbackIndex || !stakeAmount) {
      alert('Please fill in all fields');
      return;
    }
    await authenticateFeedback(
      parseInt(agentId),
      clientAddress,
      parseInt(feedbackIndex),
      stakeAmount
    );
  };

  const handleContestAuthentication = async () => {
    if (!authId || !stakeAmount) {
      alert('Please fill in all fields');
      return;
    }
    await contestAuthentication(parseInt(authId), stakeAmount);
  };

  const handleVoteOnContestation = async () => {
    if (!authId || !stakeAmount) {
      alert('Please fill in all fields');
      return;
    }
    await voteOnContestation(parseInt(authId), voteChoice, stakeAmount);
  };

  return (
    <div className="min-h-screen pt-20 relative">
      <div className="fixed inset-0 z-0">
        <FaultyTerminal
          scale={2.2}
          gridMul={[2, 1]}
          digitSize={1.7}
          timeScale={0.1}
          pause={false}
          scanlineIntensity={0.2}
          glitchAmount={1}
          flickerAmount={1}
          noiseAmp={1}
          chromaticAberration={0}
          dither={0}
          curvature={0.11}
          tint="#52744E"
          mouseReact={false}
          mouseStrength={0.3}
          pageLoadAnimation={false}
          brightness={0.2}
        />
      </div>

      <div className="w-full py-6 px-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="content-card mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold">CompassDAO</h1>
              {isDevConnected && (
                <div className="flex items-center gap-2 px-3 py-1 bg-green-900/30 border border-green-500/50 rounded-full">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 text-sm font-medium">DEV MODE</span>
                </div>
              )}
            </div>
            <p className="text-lg text-gray-300 mb-6">
              A decentralized autonomous organization for authenticating ERC-8004 agent feedback through stake-based consensus.
              Members stake COMPASS tokens to authenticate feedback with contestation and voting mechanisms.
            </p>
          </div>

          {/* Wallet Connection Status */}
          {!isConnected ? (
            <div className="content-card mb-8">
              <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
              <p className="text-gray-300 mb-4">
                Please connect your wallet to view your DAO status and participate in governance.
              </p>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-400 text-sm font-medium mb-1">Required Network</p>
                <p className="text-blue-300 text-sm">Arbitrum Sepolia (Chain ID: 421614)</p>
                <p className="text-blue-200 text-xs mt-1">Make sure your wallet is connected to the correct network</p>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Note: Wallet connection may not work in localhost development environment.
              </p>
              
              {/* Development Mode Toggle */}
              <div className="border-t border-gray-700 pt-4">
                <h3 className="text-lg font-semibold mb-3">Development Mode</h3>
                <p className="text-gray-300 mb-4">
                  Enable development mode to simulate a connected wallet and view the full DAO interface.
                </p>
                <div className="flex items-center gap-4">
                  <Button
                    onClick={() => setDevMode(!devMode)}
                    className={`px-6 py-2 ${
                      devMode 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : 'bg-gray-600 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {devMode ? 'Disable' : 'Enable'} Development Mode
                  </Button>
                  {devMode && (
                    <div className="flex items-center gap-2 text-green-400">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm">Development mode active</span>
                    </div>
                  )}
                </div>
                {devMode && (
                  <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                    <p className="text-green-400 text-sm">
                      <strong>Simulated wallet:</strong> {address}
                    </p>
                    <p className="text-green-300 text-xs mt-1">
                      This allows you to view the full DAO interface without a real wallet connection.
                    </p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Network Status */}
              {isConnected && !isDevConnected && (
                <div className="content-card mb-8">
                  <h2 className="text-2xl font-bold mb-4">Network Status</h2>
                  <div className={`p-4 rounded-lg border ${
                    chainId === 421614 
                      ? 'bg-green-900/20 border-green-500/30' 
                      : 'bg-red-900/20 border-red-500/30'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        chainId === 421614 ? 'bg-green-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`font-medium ${
                        chainId === 421614 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {chainId === 421614 ? 'Correct Network' : 'Wrong Network'}
                      </span>
                    </div>
                    <p className={`text-sm ${
                      chainId === 421614 ? 'text-green-300' : 'text-red-300'
                    }`}>
                      Current: {chainId === 421614 ? 'Arbitrum Sepolia' : `Chain ID ${chainId}`}
                    </p>
                    {chainId !== 421614 && (
                      <p className="text-red-200 text-xs mt-1">
                        Please switch to Arbitrum Sepolia to interact with the DAO
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* DAO Status Card */}
              <div className="content-card mb-8">
                <h2 className="text-2xl font-bold mb-6">DAO Status</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Membership</h3>
                    <div className="flex items-center gap-2">
                      <Badge variant={daoStatus.isMember ? "default" : "secondary"}>
                        {daoStatus.isMember ? "Member" : "Not a Member"}
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">COMPASS Balance</h3>
                    <p className="text-xl font-bold text-green-400">
                      {daoStatus.isLoading ? "Loading..." : `${daoStatus.compassBalance} COMPASS`}
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Total Members</h3>
                    <p className="text-xl font-bold text-green-400">
                      {daoStatus.isLoading ? "Loading..." : daoStatus.memberCount.toLocaleString()}
                    </p>
                  </div>

                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Treasury Balance</h3>
                    <p className="text-xl font-bold text-green-400">
                      {daoStatus.isLoading ? "Loading..." : `${daoStatus.treasuryBalance} COMPASS`}
                    </p>
                  </div>
                </div>

                {/* Join DAO Button */}
                {!daoStatus.isMember && (
                  <div className="border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-semibold mb-4">Join the DAO</h3>
                    <p className="text-gray-300 mb-4">
                      Become a DAO member to participate in feedback authentication and governance.
                      You'll receive initial COMPASS tokens upon joining.
                    </p>
                    <Button
                      onClick={handleJoinDAO}
                      disabled={isJoining || isWritePending || isConfirming || (isConnected && !isDevConnected && chainId !== 421614)}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      {isJoining || isWritePending || isConfirming
                        ? (isConfirming ? "Confirming..." : "Joining...")
                        : "Join DAO"
                      }
                    </Button>
                    {isConfirmed && (
                      <p className="text-green-400 mt-2">Successfully joined the DAO!</p>
                    )}
                    {isConnected && !isDevConnected && chainId !== 421614 && (
                      <p className="text-red-400 mt-2 text-sm">
                        Please switch to Arbitrum Sepolia network to join the DAO
                      </p>
                    )}
                  </div>
                )}

                {/* Error Display */}
                {daoStatus.error && (
                  <div className="mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                    <p className="text-red-400">Error: {daoStatus.error}</p>
                  </div>
                )}
              </div>

              {/* Member Dashboard */}
              {daoStatus.isMember && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Staking Section */}
                  <div className="content-card">
                    <h3 className="text-xl font-bold mb-4">Authenticate Feedback</h3>
                    <p className="text-gray-300 mb-4">
                      Stake COMPASS tokens to authenticate ERC-8004 agent feedback.
                      This action will be executed on-chain.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="agentId">Agent ID</Label>
                        <Input
                          id="agentId"
                          value={agentId}
                          onChange={(e) => setAgentId(e.target.value)}
                          placeholder="Enter agent ID"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="clientAddress">Client Address</Label>
                        <Input
                          id="clientAddress"
                          value={clientAddress}
                          onChange={(e) => setClientAddress(e.target.value)}
                          placeholder="0x..."
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="feedbackIndex">Feedback Index</Label>
                        <Input
                          id="feedbackIndex"
                          value={feedbackIndex}
                          onChange={(e) => setFeedbackIndex(e.target.value)}
                          placeholder="Enter feedback index"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="stakeAmount">Stake Amount (COMPASS)</Label>
                        <Input
                          id="stakeAmount"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="Enter amount to stake"
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={handleAuthenticateFeedback}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Authenticate Feedback
                      </Button>
                    </div>
                  </div>

                  {/* Contest Section */}
                  <div className="content-card">
                    <h3 className="text-xl font-bold mb-4">Contest Authentication</h3>
                    <p className="text-gray-300 mb-4">
                      Contest a pending authentication by staking equal tokens.
                      This action will be executed on-chain.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="contestAuthId">Authentication ID</Label>
                        <Input
                          id="contestAuthId"
                          value={authId}
                          onChange={(e) => setAuthId(e.target.value)}
                          placeholder="Enter authentication ID"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contestStakeAmount">Contest Stake (COMPASS)</Label>
                        <Input
                          id="contestStakeAmount"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="Enter stake amount"
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={handleContestAuthentication}
                        className="w-full bg-orange-600 hover:bg-orange-700 text-white"
                      >
                        Contest Authentication
                      </Button>
                    </div>
                  </div>

                  {/* Voting Section */}
                  <div className="content-card">
                    <h3 className="text-xl font-bold mb-4">Vote on Contestation</h3>
                    <p className="text-gray-300 mb-4">
                      Vote on contested authentications to determine the outcome.
                      This action will be executed on-chain.
                    </p>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="voteAuthId">Authentication ID</Label>
                        <Input
                          id="voteAuthId"
                          value={authId}
                          onChange={(e) => setAuthId(e.target.value)}
                          placeholder="Enter authentication ID"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="voteChoice">Vote Choice</Label>
                        <select
                          id="voteChoice"
                          value={voteChoice}
                          onChange={(e) => setVoteChoice(Number(e.target.value) as VoteChoice)}
                          className="mt-1 w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white"
                        >
                          <option value={VoteChoice.Legitimate}>Legitimate</option>
                          <option value={VoteChoice.NotLegitimate}>Not Legitimate</option>
                        </select>
                      </div>
                      <div>
                        <Label htmlFor="voteStakeAmount">Vote Stake (COMPASS)</Label>
                        <Input
                          id="voteStakeAmount"
                          value={stakeAmount}
                          onChange={(e) => setStakeAmount(e.target.value)}
                          placeholder="Enter stake amount"
                          className="mt-1"
                        />
                      </div>
                      <Button
                        onClick={handleVoteOnContestation}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                      >
                        Cast Vote
                      </Button>
                    </div>
                  </div>

                  {/* Active Authentications */}
                  <div className="content-card">
                    <h3 className="text-xl font-bold mb-4">Active Authentications</h3>
                    {isDevConnected ? (
                      <div className="space-y-3">
                        <p className="text-gray-300 mb-4">
                          Development mode: Showing mock active authentications.
                        </p>
                        <div className="space-y-3">
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-orange-500/30">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-orange-400">Authentication #123</h4>
                              <Badge variant="secondary">Pending</Badge>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">Agent ID: 456 • Stake: 1,000 COMPASS</p>
                            <p className="text-xs text-gray-400">Time remaining: 18h 32m</p>
                          </div>
                          <div className="bg-gray-800/50 rounded-lg p-4 border border-blue-500/30">
                            <div className="flex justify-between items-start mb-2">
                              <h4 className="font-semibold text-blue-400">Authentication #124</h4>
                              <Badge variant="outline">Contested</Badge>
                            </div>
                            <p className="text-sm text-gray-300 mb-2">Agent ID: 789 • Stake: 2,500 COMPASS</p>
                            <p className="text-xs text-gray-400">Voting ends in: 2h 15m</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-gray-300 mb-4">
                          Currently, there are no active authentications to display.
                          This would show pending feedback authentications in a real implementation.
                        </p>
                        <div className="bg-gray-800/50 rounded-lg p-4 text-center">
                          <p className="text-gray-400">No active authentications</p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
