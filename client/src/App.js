import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { Trophy, Play, Square, Clock, Crown } from 'lucide-react';
import './App.css';

const API_BASE_URL = 'http://localhost:5001/api';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
  color: white;
`;

const Title = styled.h1`
  font-size: 3rem;
  margin: 0;
  text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  margin: 10px 0 0 0;
  opacity: 0.9;
`;

const ControlsContainer = styled.div`
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 30px;
  flex-wrap: wrap;
`;

const TimeWindowButtons = styled.div`
  display: flex;
  gap: 10px;
  background: rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 25px;
  backdrop-filter: blur(10px);
`;

const TimeButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: ${props => props.active ? 'rgba(255,255,255,0.3)' : 'transparent'};
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  
  &:hover {
    background: rgba(255,255,255,0.2);
  }
`;

const GeneratorControls = styled.div`
  display: flex;
  gap: 10px;
  background: rgba(255,255,255,0.1);
  padding: 10px;
  border-radius: 25px;
  backdrop-filter: blur(10px);
`;

const ControlButton = styled.button`
  padding: 10px 20px;
  border: none;
  border-radius: 20px;
  background: ${props => props.variant === 'start' ? '#4CAF50' : '#f44336'};
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    opacity: 0.8;
    transform: translateY(-2px);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;

const LeaderboardContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  background: rgba(255,255,255,0.95);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  backdrop-filter: blur(10px);
`;

const LeaderboardTitle = styled.h2`
  text-align: center;
  margin-bottom: 30px;
  color: #333;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const HouseList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const HouseItem = styled.div`
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 15px;
  background: ${props => {
    const colors = {
      'Gryff': 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
      'Slyth': 'linear-gradient(135deg, #228B22 0%, #006400 100%)',
      'Raven': 'linear-gradient(135deg, #4169E1 0%, #0000CD 100%)',
      'Huff': 'linear-gradient(135deg, #FFB6C1 0%, #FF69B4 100%)'
    };
    return colors[props.house] || '#f0f0f0';
  }};
  color: white;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  }
`;

const HouseRank = styled.div`
  font-size: 2rem;
  font-weight: bold;
  margin-right: 20px;
  min-width: 50px;
  text-align: center;
`;

const HouseInfo = styled.div`
  flex: 1;
`;

const HouseName = styled.h3`
  margin: 0 0 5px 0;
  font-size: 1.5rem;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
`;

const HousePoints = styled.div`
  font-size: 1.2rem;
  opacity: 0.9;
`;

const HouseEvents = styled.div`
  font-size: 0.9rem;
  opacity: 0.8;
`;

const CrownIcon = styled(Crown)`
  position: absolute;
  top: 10px;
  right: 15px;
  opacity: ${props => props.show ? 1 : 0};
  transition: opacity 0.3s ease;
`;

const StatusIndicator = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 10px 20px;
  border-radius: 25px;
  background: ${props => props.running ? '#4CAF50' : '#f44336'};
  color: white;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
`;

function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [timeWindow, setTimeWindow] = useState('all');
  const [isGeneratorRunning, setIsGeneratorRunning] = useState(false);
  const [ws, setWs] = useState(null);
  const [loading, setLoading] = useState(false);

  // WebSocket connection
  useEffect(() => {
    const websocket = new WebSocket('ws://localhost:5000');
    
    websocket.onopen = () => {
      console.log('WebSocket connected');
      setWs(websocket);
    };
    
    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'new_point') {
        // Refresh leaderboard when new points are added
        fetchLeaderboard();
      }
    };
    
    websocket.onclose = () => {
      console.log('WebSocket disconnected');
      setWs(null);
    };
    
    return () => {
      websocket.close();
    };
  }, []);

  // Fetch leaderboard data
  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/leaderboard?timeWindow=${timeWindow}`);
      const data = await response.json();
      setLeaderboard(data.leaderboard || []);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  // Fetch generator status
  const fetchGeneratorStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/generator/status`);
      const data = await response.json();
      setIsGeneratorRunning(data.running);
    } catch (error) {
      console.error('Error fetching generator status:', error);
    }
  }, []);

  // Start data generator
  const startGenerator = async () => {
    try {
      await fetch(`${API_BASE_URL}/generator/start`, { method: 'POST' });
      setIsGeneratorRunning(true);
    } catch (error) {
      console.error('Error starting generator:', error);
    }
  };

  // Stop data generator
  const stopGenerator = async () => {
    try {
      await fetch(`${API_BASE_URL}/generator/stop`, { method: 'POST' });
      setIsGeneratorRunning(false);
    } catch (error) {
      console.error('Error stopping generator:', error);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchLeaderboard();
    fetchGeneratorStatus();
  }, [fetchLeaderboard, fetchGeneratorStatus]);

  // Refresh when time window changes
  useEffect(() => {
    fetchLeaderboard();
  }, [timeWindow, fetchLeaderboard]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isGeneratorRunning) {
        fetchLeaderboard();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [isGeneratorRunning, fetchLeaderboard]);

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getTimeWindowLabel = (window) => {
    const labels = {
      '5min': 'Last 5 Minutes',
      '1hour': 'Last Hour',
      'all': 'All Time'
    };
    return labels[window] || window;
  };

  return (
    <AppContainer>
      <StatusIndicator running={isGeneratorRunning}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'white' }} />
        {isGeneratorRunning ? 'Live' : 'Paused'}
      </StatusIndicator>
      
      <Header>
        <Title>
          <Trophy size={48} />
          Hogwarts House Cup
        </Title>
        <Subtitle>Real-time Leaderboard</Subtitle>
      </Header>

      <ControlsContainer>
        <TimeWindowButtons>
          <Clock size={20} />
          {['5min', '1hour', 'all'].map(window => (
            <TimeButton
              key={window}
              active={timeWindow === window}
              onClick={() => setTimeWindow(window)}
            >
              {getTimeWindowLabel(window)}
            </TimeButton>
          ))}
        </TimeWindowButtons>

        <GeneratorControls>
          <ControlButton
            variant="start"
            onClick={startGenerator}
            disabled={isGeneratorRunning}
          >
            <Play size={16} />
            Start Live Updates
          </ControlButton>
          <ControlButton
            variant="stop"
            onClick={stopGenerator}
            disabled={!isGeneratorRunning}
          >
            <Square size={16} />
            Stop Updates
          </ControlButton>
        </GeneratorControls>
      </ControlsContainer>

      <LeaderboardContainer>
        <LeaderboardTitle>
          <Trophy size={32} />
          Current Rankings - {getTimeWindowLabel(timeWindow)}
        </LeaderboardTitle>

        {loading ? (
          <LoadingSpinner>Loading leaderboard...</LoadingSpinner>
        ) : (
          <HouseList>
            {leaderboard.map((house, index) => (
              <HouseItem key={house.house} house={house.house}>
                <HouseRank>{getRankIcon(index + 1)}</HouseRank>
                <HouseInfo>
                  <HouseName>{house.house}</HouseName>
                  <HousePoints>{house.points.toLocaleString()} points</HousePoints>
                  <HouseEvents>{house.events} events</HouseEvents>
                </HouseInfo>
                <CrownIcon show={index === 0} size={24} />
              </HouseItem>
            ))}
          </HouseList>
        )}
      </LeaderboardContainer>
    </AppContainer>
  );
}

export default App;