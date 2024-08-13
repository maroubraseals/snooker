


import React, { useEffect, useState } from 'react';
import supabase from '../supabase';
import './tournament.css';

function Tournament({ groups, players, startDate, tournamentName, prevStep }) {
  const [roundRobinResults, setRoundRobinResults] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({ player1: '', player2: '' });
  const [tournamentId, setTournamentId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const results = generateRoundRobin(groups, players);
    assignMatchDates(results, startDate, tournamentName);
    setRoundRobinResults(results);
  }, [groups, players, startDate, tournamentName]);

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
            result: 'Pending',
          });
        }
      }
      // Rotate array to generate new matchups, keeping the first player fixed
      players.splice(1, 0, players.pop());
    }
    return schedule;
  };
  
  

  const assignMatchDates = (results, startDate, tournamentName) => {
    if (!startDate || !Array.isArray(results)) return;
  
    const start = new Date(startDate);
    // Align to the next Tuesday
    start.setDate(start.getDate() + ((2 - start.getDay() + 7) % 7));
  
    let currentDate = new Date(start);
    const maxMatchesPerDate = 8;
    let groupIndex = 0;
  
    while (true) {
      let allGroupsProcessed = true;
  
      results.forEach((groupResult, index) => {
        if (index !== groupIndex) return;
  
        const groupMatches = groupResult.matches;
        const matchesCount = groupMatches.length;
        let matchesScheduled = 0;
  
        for (let i = 0; i < matchesCount; i++) {
          if (!groupMatches[i].matchDate) {
            groupMatches[i].matchDate = currentDate.toISOString().split('T')[0];
            matchesScheduled++;
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
  
  

  const handleMatchClick = (groupIndex, matchIndex) => {
    setSelectedMatch({ groupIndex, matchIndex });
  };

  const handleScoreChange = (e) => {
    const { name, value } = e.target;
    setScores({ ...scores, [name]: value });
  };

  const handleScoreSubmit = () => {
    const updatedResults = [...roundRobinResults];
    const match = updatedResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex];
    match.score1 = Number(scores.player1);
    match.score2 = Number(scores.player2);

    if (match.score1 > match.score2) {
      match.result = `${match.player1} wins`;
    } else if (match.score1 < match.score2) {
      match.result = `${match.player2} wins`;
    } else {
      match.result = 'Tie';
    }

    setRoundRobinResults(updatedResults);
    setSelectedMatch(null);
    setScores({ player1: '', player2: '' });
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
  

  return (
    <div>
      <h2>Save Tournament</h2>
      <button onClick={handleSaveTournament}  disabled={loading}>
      {loading ? 'Saving...' : 'Save'}
      </button>

      <h2>Round Robin Results</h2>
      {roundRobinResults.map((groupResult, groupIndex) => (
        <div key={groupIndex}>
          <h3>Group {groupResult.group}</h3>
          <table border="1">
            <thead>
              <tr>
                <th>Match Number</th>
                <th>Player 1</th>
                <th>Player 2</th>
                <th>Match Date</th>
                <th>Score 1</th>
                <th>Score 2</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {groupResult.matches.map((match, matchIndex) => (
                <tr key={matchIndex} onClick={() => handleMatchClick(groupIndex, matchIndex)}>
                  <td>{match.matchNumber}</td>
                  <td>{match.player1} [{match.handicap1}]</td>
                  <td>{match.player2} [{match.handicap2}]</td>
                  <td>{match.matchDate}</td>
                  <td>{match.score1 !== null ? match.score1 : ''}</td>
                  <td>{match.score2 !== null ? match.score2 : ''}</td>
                  <td>{match.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {selectedMatch !== null && (
        <div className="modal">
          <h2>Enter Scores</h2>
          <p>
            {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player1} vs{' '}
            {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player2}
          </p>
          <label>
            Score for {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player1}:
            <input
              type="number"
              name="player1"
              value={scores.player1}
              onChange={handleScoreChange}
            />
          </label>
          <br />
          <label>
            Score for {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player2}:
            <input
              type="number"
              name="player2"
              value={scores.player2}
              onChange={handleScoreChange}
            />
          </label>
          <br />
          <button onClick={handleScoreSubmit}>Submit Scores</button>
          <button onClick={() => setSelectedMatch(null)}>Cancel</button>
        </div>
      )}

      <button onClick={prevStep}>Back</button>
    </div>
  );
}

export default Tournament;
