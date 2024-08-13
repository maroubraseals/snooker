import React, { useEffect, useState } from 'react';
import supabase from '../supabase';
import './tournament.css';

function Tournament({ groups, players, startDate, tournamentName, prevStep }) {
  const [roundRobinResults, setRoundRobinResults] = useState([]);
  const [tournamentId, setTournamentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [maxMatchesPerDate, setMaxMatchesPerDate] = useState(8);
  const [matchesPerDatePerPlayer, setMatchesPerDatePerPlayer] = useState(2);
  const [isSchedulingManual, setIsSchedulingManual] = useState(false);

  useEffect(() => {
    const results = generateRoundRobin(groups, players);
    assignMatchDates(results, startDate, tournamentName, maxMatchesPerDate, matchesPerDatePerPlayer);
    setRoundRobinResults(results);
  }, [groups, players, startDate, tournamentName, maxMatchesPerDate, matchesPerDatePerPlayer]);

  const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  };

  const generateRoundRobin = (groups, players) => {
    const results = [];
    const shuffledPlayers = shuffleArray([...players]);
  
    let index = 0;
    groups.forEach((groupSize, groupIndex) => {
      const groupPlayers = shuffledPlayers.slice(index, index + groupSize);
      index += groupSize;
      const schedule = createRoundRobinSchedule(groupPlayers);
      results.push({ group: groupIndex + 1, matches: schedule });
    });
  
    return results;
  };

  const createRoundRobinSchedule = (players) => {
    const schedule = [];
    const numPlayers = players.length;
  
    // Check if there's an odd number of players
    if (numPlayers % 2 !== 0) {
      players.push({ name: 'Bye', handicap: 0 }); // Add a dummy player for odd number of players
    }
  
    const numRounds = numPlayers - 1;
    const half = numPlayers / 2;
  
    for (let round = 0; round < numRounds; round++) {
      for (let i = 0; i < half; i++) {
        const player1 = players[i];
        const player2 = players[numPlayers - 1 - i];
  
        // Ensure that a player isn't matched against themselves
        if (player1.name !== player2.name) {
          schedule.push({
            matchDate: null,
            matchNumber: schedule.length + 1,
            player1: player1.name,
            player2: player2.name,
            handicap1: player1.handicap,
            handicap2: player2.handicap,
            score1: null,
            score2: null,
            frame1: null,
            frame2: null,
            breaks1:null,
            breaks2:null,
            result: 'Pending',
          });
        }
      }
      // Rotate array to generate new matchups, keeping the first player fixed
      players.splice(1, 0, players.pop());
    }
    return schedule;
  };

  const assignMatchDates = (results, startDate, tournamentName, maxMatchesPerDate, matchesPerDatePerPlayer) => {
    if (!startDate || !Array.isArray(results)) return;

    const start = new Date(startDate);
    // Align to the next Tuesday
    start.setDate(start.getDate() + ((2 - start.getDay() + 7) % 7));
  
    let currentDate = new Date(start);
    let groupIndex = 0;
    let playerMatchCount = {}; // Track number of matches each player has per date

    while (true) {
      let allGroupsProcessed = true;
  
      results.forEach((groupResult, index) => {
        if (index !== groupIndex) return;
  
        const groupMatches = groupResult.matches;
        const matchesCount = groupMatches.length;
        let matchesScheduled = 0;
  
        for (let i = 0; i < matchesCount; i++) {
          const match = groupMatches[i];
          if (!match.matchDate) {
            const player1Matches = playerMatchCount[match.player1] || {};
            const player2Matches = playerMatchCount[match.player2] || {};
  
            const player1Count = player1Matches[currentDate.toISOString().split('T')[0]] || 0;
            const player2Count = player2Matches[currentDate.toISOString().split('T')[0]] || 0;
  
            if (player1Count < matchesPerDatePerPlayer && player2Count < matchesPerDatePerPlayer) {
              match.matchDate = currentDate.toISOString().split('T')[0];
              player1Matches[currentDate.toISOString().split('T')[0]] = player1Count + 1;
              player2Matches[currentDate.toISOString().split('T')[0]] = player2Count + 1;
              playerMatchCount[match.player1] = player1Matches;
              playerMatchCount[match.player2] = player2Matches;
              matchesScheduled++;
            }
          }
  
          if (matchesScheduled === maxMatchesPerDate) break;
        }
  
        if (matchesScheduled > 0) {
          allGroupsProcessed = false;
        }
      });
  
      if (allGroupsProcessed) break;
  
      // Move to the next week
      currentDate.setDate(currentDate.getDate() + 7);
      // Alternate group index
      groupIndex = (groupIndex + 1) % results.length;
    }
  };

  const handleSaveTournament = async () => {
    if (!startDate) {
      alert('Start date is missing.');
      return;
    }
    setLoading(true);
    setError(''); // Clear previous error
  
    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .insert([{ roundrobin: roundRobinResults, start: startDate, name: tournamentName }])
        .select();
  
      if (error) {
        setError('Error saving round robin results. Please try again.');
        console.error('Error saving round robin results:', error);
        return;
      }
  
      if (data && Array.isArray(data) && data.length > 0) {
        setTournamentId(data[0].id);
      } else {
        setError('Unexpected response format or no data returned from Supabase');
        console.error('Unexpected response format or no data returned from Supabase');
      }
    } catch (error) {
      setError('Unexpected error occurred. Please try again.');
      console.error('Unexpected error:', error);
    }
  
    setLoading(false);
  };

  const handleManualScheduling = () => {
    setIsSchedulingManual(true);
  };

  const handleMaxMatchesChange = (e) => {
    setMaxMatchesPerDate(Number(e.target.value));
  };

  const handleMatchesPerDatePerPlayerChange = (e) => {
    setMatchesPerDatePerPlayer(Number(e.target.value));
  };

  return (
    <div>
      <h1>{tournamentName}</h1>
      {isSchedulingManual && (
        <div>
          <label>
            Max Matches Per Date:
            <input
              type="number"
              value={maxMatchesPerDate}
              onChange={handleMaxMatchesChange}
              min="1"
            />
          </label>
          <label>
            Matches Per Date Per Player:
            <input
              type="number"
              value={matchesPerDatePerPlayer}
              onChange={handleMatchesPerDatePerPlayerChange}
              min="1"
            />
          </label>
        </div>
      )}
      <button onClick={handleManualScheduling}>
        {isSchedulingManual ? 'Update Schedule' : 'Manual Scheduling'}
      </button>
      <button onClick={handleSaveTournament} disabled={loading}>
        {loading ? 'Saving...' : 'Save Tournament'}
      </button>
      {error && <p className="error">{error}</p>}
      {roundRobinResults.map((groupResult, groupIndex) => (
        <div key={groupIndex}>
          <h2>Group {groupResult.group}</h2>
          <table>
            <thead>
              <tr>
                <th>Match #</th>
                <th>Date</th>
                <th>Player 1</th>
                <th>Player 2</th>
              </tr>
            </thead>
            <tbody>
              {groupResult.matches.map((match, matchIndex) => (
                <tr key={matchIndex}>
                  <td>{match.matchNumber}</td>
                  <td>{match.matchDate}</td>
                  <td>{match.player1}</td>
                  <td>{match.player2}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

export default Tournament;
