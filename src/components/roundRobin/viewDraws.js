import React, { useEffect, useState } from 'react';
import supabase from '../supabase';

function ViewDraws() {
  const [draws, setDraws] = useState([]);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [hasKnockoutDraw, setHasKnockoutDraw] = useState(false);
  const [roundRobinResults, setRoundRobinResults] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [scores, setScores] = useState({ player1: '', player2: '' });
  const [frameScores, setFrameScores] = useState({ player1: '', player2: '' });
  const [breakScores, setBreakScores] = useState({ player1: '', player2: '' });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [topPlayersCount, setTopPlayersCount] = useState(1); // Default to top 1 player
  const [knockoutRounds, setKnockoutRounds] = useState([]);
  const [currentKnockoutMatch, setCurrentKnockoutMatch] = useState(null);
  const [knockoutScores, setKnockoutScores] = useState({ player1Score: '', player2Score: '' });
  const [visibleCount, setVisibleCount] = useState(5);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const handleShowMore = () => {
    setVisibleCount((prevCount) => prevCount + 5);
  };

  useEffect(() => {
    fetchDraws();
  }, []);

  const fetchDraws = async () => {
    setLoading(true);
    setError(''); // Clear previous error

    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .select('id, name, start') // Fetch id, name, and start columns
        .order('start', { ascending: false }); // Order by start date in descending order
      if (error) throw error;
      setDraws(data);
      if (data.length > 0) {
        const latestDraw = data[0]; // The latest draw
        setSelectedDraw(latestDraw.id);
        fetchDrawDetails(latestDraw.id); // Fetch details for the latest draw
      }
    } catch (error) {
      setError('Error fetching draws.');
      console.error('Error fetching draws:', error);
    } finally {
      setLoading(false);
    }
  };



  const fetchDrawDetails = async (drawId) => {
    setLoading(true);
    setError(''); // Clear previous error

    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .select('roundrobin, knockout') // Fetch both roundrobin and knockout columns
        .eq('id', drawId)
        .single();
      if (error) throw error;

      setRoundRobinResults(data.roundrobin);

      if (data.knockout && data.knockout.length > 0) {
        setKnockoutRounds(data.knockout);
        setHasKnockoutDraw(true);
      } else {
        setKnockoutRounds([]);
        setHasKnockoutDraw(false);
      }
    } catch (error) {
      setError('Error fetching draw details.');
      console.error('Error fetching draw details:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleDrawSelect = (drawId) => {
    fetchDrawDetails(drawId);
    setSelectedDraw(drawId);
  };

  const handleMatchClick = (groupIndex, matchIndex) => {
    setSelectedMatch({ groupIndex, matchIndex });
  };


  const handleFrameScoreChange = (e) => {
    const { name, value } = e.target;
    setFrameScores({ ...frameScores, [name]: value });
  };

  const handleBreakScoreChange = (e) => {
    const { name, value } = e.target;
    setBreakScores({ ...breakScores, [name]: value });
  };

  const handleFrameScoreSubmit = async (e) => {
    e.preventDefault();

    const scores1 = frameScores.player1.split(',').map(Number);
    const scores2 = frameScores.player2.split(',').map(Number);

    if (scores1.length !== scores2.length || scores1.some(isNaN) || scores2.some(isNaN)) {
      setError('Frame scores must be valid numbers and have the same length.');
      return;
    }

    let score1 = 0;
    let score2 = 0;

    scores1.forEach((score, index) => {
      if (score > scores2[index]) score1 += 1;
      else if (score < scores2[index]) score2 += 1;
    });

    const updatedResults = [...roundRobinResults];
    const currentMatch = updatedResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex];

    currentMatch.frame1 = frameScores.player1;
    currentMatch.frame2 = frameScores.player2;
    currentMatch.breaks1 = breakScores.player1; // Assuming you have similar structure for break scores
    currentMatch.breaks2 = breakScores.player2;
    currentMatch.score1 = score1;
    currentMatch.score2 = score2;

    if (score1 > score2) {
      currentMatch.result = `${currentMatch.player1} wins`;
    } else if (score1 < score2) {
      currentMatch.result = `${currentMatch.player2} wins`;
    } else {
      currentMatch.result = 'Tie';
    }

    const updateHandicaps = (match, player, adjustment) => {
      if (match.player1 === player) {
        match.handicap1 = Math.max(-25, Math.min(25, (match.handicap1 || 0) + adjustment));
      }
      if (match.player2 === player) {
        match.handicap2 = Math.max(-25, Math.min(25, (match.handicap2 || 0) + adjustment));
      }
    };

    updatedResults.forEach((group) => {
      group.matches.forEach((match, index) => {
        if (index > selectedMatch.matchIndex) {
          if (match.player1 === currentMatch.player1 || match.player2 === currentMatch.player1) {
            updateHandicaps(match, currentMatch.player1, currentMatch.result === `${currentMatch.player1} wins` ? -1 : 1);
          }
          if (match.player1 === currentMatch.player2 || match.player2 === currentMatch.player2) {
            updateHandicaps(match, currentMatch.player2, currentMatch.result === `${currentMatch.player2} wins` ? -1 : 1);
          }
        }
      });
    });

    console.log('Updated Results:', updatedResults);

    setRoundRobinResults(updatedResults);
    setSelectedMatch(null);
    setFrameScores({ player1: '', player2: '' });
    setBreakScores({ player1: '', player2: '' });

    await updateRoundRobinResults(selectedDraw, updatedResults);
  };

  const updateRoundRobinResults = async (drawId, results) => {
    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .update({ roundrobin: results })
        .eq('id', drawId);
      if (error) throw error;
      console.log('Round robin results updated:', data);
    } catch (error) {
      setError('Error updating round robin results.');
      console.error('Error updating round robin results:', error);
    }
  };


  const handleCellClick = (playerName, type) => {
    // Check if the clicked cell matches the currently expanded details
    if (expandedPlayer && expandedPlayer.playerName === playerName && expandedPlayer.type === type) {
      // If the same cell is clicked, close the details
      setExpandedPlayer(null);
    } else {
      // Otherwise, open the details for the clicked player and type
      setExpandedPlayer({ playerName, type });
    }
  };
  
  const calculateStandings = (groupResults) => {
    const standings = {};
    const playerHandicaps = {};
    const matchDetails = {};
  
    groupResults.matches.forEach(match => {
      // Track the latest handicap values for each player
      if (match.player1) {
        playerHandicaps[match.player1] = match.handicap1;
      }
      if (match.player2) {
        playerHandicaps[match.player2] = match.handicap2;
      }
  
      // Initialize matchDetails for players if not already initialized
      if (!matchDetails[match.player1]) {
        matchDetails[match.player1] = { frames: [], highestBreak: 0, breaks: [] };
      }
      if (!matchDetails[match.player2]) {
        matchDetails[match.player2] = { frames: [], highestBreak: 0, breaks: [] };
      }
  
      // Safely handle null or undefined values
      const frames1 = (match.frame1 || '').split(',').map(Number);
      const frames2 = (match.frame2 || '').split(',').map(Number);
      const breaks1 = (match.breaks1 || '').split(',').map(Number);
      const breaks2 = (match.breaks2 || '').split(',').map(Number);
  
      // Update match details with frame scores and highest breaks
      matchDetails[match.player1].frames.push(frames1);
      matchDetails[match.player1].breaks.push(breaks1);
      matchDetails[match.player1].highestBreak = Math.max(matchDetails[match.player1].highestBreak, ...breaks1);
      matchDetails[match.player2].frames.push(frames2);
      matchDetails[match.player2].breaks.push(breaks2);
      matchDetails[match.player2].highestBreak = Math.max(matchDetails[match.player2].highestBreak, ...breaks2);
    });
  
    groupResults.matches.forEach(match => {
      const { player1, player2, score1, score2, result } = match;
  
      if (!standings[player1]) {
        standings[player1] = { name: player1, handicap: 0, totalwin: 0, totalloss: 0, tie: 0 };
      }
      if (!standings[player2]) {
        standings[player2] = { name: player2, handicap: 0, totalwin: 0, totalloss: 0, tie: 0 };
      }
  
      if (result === `${player1} wins`) {
        standings[player1].totalwin += 1;
        standings[player2].totalloss += 1;
      } else if (result === `${player2} wins`) {
        standings[player2].totalwin += 1;
        standings[player1].totalloss += 1;
      } else if (result === 'Tie') {
        standings[player1].tie += 1;
        standings[player2].tie += 1;
      }
    });
  
    Object.keys(standings).forEach(playerName => {
      if (playerHandicaps[playerName] !== undefined) {
        standings[playerName].handicap = playerHandicaps[playerName];
      }
  
      standings[playerName].latestMatch = matchDetails[playerName] || { frames: [], highestBreak: 0, breaks: [] };
    });
  
    const standingsList = Object.values(standings).map(player => ({
      ...player,
      displayName: `${player.name} [${player.handicap}]`
    }));
  
    // Sort by total wins, total losses, total ties, and then highest break
    return standingsList.sort((a, b) => {
      if (b.totalwin !== a.totalwin) {
        return b.totalwin - a.totalwin;
      }
      if (a.totalloss !== b.totalloss) {
        return a.totalloss - b.totalloss;
      }
      if (a.tie !== b.tie) {
        return b.tie - a.tie;
      }
      // Tie-breaker by highest break
      return b.latestMatch.highestBreak - a.latestMatch.highestBreak;
    });
  };


  const handleTopPlayersChange = (e) => {
    setTopPlayersCount(Number(e.target.value));
  };

  const generateKnockoutDraw = async () => {
    const playerHandicaps = {};

    // Calculate the latest handicap for each player
    roundRobinResults.forEach(groupResult => {
      groupResult.matches.forEach(match => {
        if (match.player1) {
          playerHandicaps[match.player1] = match.handicap1;
        }
        if (match.player2) {
          playerHandicaps[match.player2] = match.handicap2;
        }
      });
    });

    // Fetch the top players from each group and calculate standings
    const groupStandings = roundRobinResults.map(groupResult =>
      calculateStandings(groupResult)
        .sort((a, b) => b.totalwin - a.totalwin || a.totalloss - b.totalloss)
        .slice(0, topPlayersCount)
    );

    const knockoutDraw = [];

    if (groupStandings.length === 1) {
      // If there is only one group, pair the top players against each other
      const group = groupStandings[0];
      if (group.length < topPlayersCount) {
        console.error("Not enough players to generate knockout draw");
        return;
      }
      for (let i = 0; i < Math.floor(topPlayersCount / 2); i++) {
        knockoutDraw.push({
          player1: { ...group[i], handicap: playerHandicaps[group[i].name] || group[i].handicap },
          player2: { ...group[topPlayersCount - 1 - i], handicap: playerHandicaps[group[topPlayersCount - 1 - i].name] || group[topPlayersCount - 1 - i].handicap }
        });
      }
      if (topPlayersCount % 2 !== 0) {
        knockoutDraw.push({
          player1: { ...group[Math.floor(topPlayersCount / 2)], handicap: playerHandicaps[group[Math.floor(topPlayersCount / 2)].name] || group[Math.floor(topPlayersCount / 2)].handicap },
          player2: null  // Placeholder for later assignment
        });
      }
    } else if (groupStandings.length >= 2) {
      // Handle even and odd number of groups
      let totalPlayers = 0;
      groupStandings.forEach(group => totalPlayers += group.length);

      if (totalPlayers < 2 * topPlayersCount) {
        console.error("Not enough players in the groups to generate knockout draw");
        return;
      }

      for (let i = 0; i < topPlayersCount; i++) {
        if (groupStandings.length % 2 !== 0 && i === topPlayersCount - 1) {
          knockoutDraw.push({
            player1: { ...groupStandings[0][i], handicap: playerHandicaps[groupStandings[0][i].name] || groupStandings[0][i].handicap },
            player2: null  // Placeholder for later assignment
          });
        } else {
          knockoutDraw.push({
            player1: { ...groupStandings[0][i], handicap: playerHandicaps[groupStandings[0][i].name] || groupStandings[0][i].handicap },
            player2: { ...groupStandings[1][topPlayersCount - 1 - i], handicap: playerHandicaps[groupStandings[1][topPlayersCount - 1 - i].name] || groupStandings[1][topPlayersCount - 1 - i].handicap }
          });
        }
      }
    } else {
      console.error("Not enough groups to generate knockout draw");
      return;
    }

    // Generate knockout rounds
    const rounds = createKnockoutRounds(knockoutDraw);
    setKnockoutRounds(rounds);

    // Save knockout rounds to database
    try {
      await saveKnockoutResults(rounds);
    } catch (error) {
      console.error("Error saving knockout results:", error);
    }

    // Update handicap_round for all players in round robin matches
    const handicapUpdates = [];

    roundRobinResults.forEach(groupResult => {
      groupResult.matches.forEach(match => {
        if (match.player1) {
          handicapUpdates.push(
            supabase
              .from('players')
              .update({ handicap_round: playerHandicaps[match.player1] || match.handicap1 })
              .eq('name', match.player1)
          );
        }
        if (match.player2) {
          handicapUpdates.push(
            supabase
              .from('players')
              .update({ handicap_round: playerHandicaps[match.player2] || match.handicap2 })
              .eq('name', match.player2)
          );
        }
      });
    });

    try {
      await Promise.all(handicapUpdates);
    } catch (error) {
      console.error("Error updating player handicaps:", error);
    }

  };



  const saveKnockoutResults = async (rounds) => {
    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .update({ knockout: rounds })
        .eq('id', selectedDraw); // Assuming `selectedDraw` is the current draw ID
      if (error) throw error;
      console.log('Knockout results saved:', data);
    } catch (error) {
      setError('Error saving knockout results.');
      console.error('Error saving knockout results:', error);
    }
  };

  const createKnockoutRounds = (initialMatches) => {
    let rounds = [];
    let currentRound = initialMatches;

    while (currentRound.length > 1) {
      rounds.push({ matches: currentRound });
      const nextRound = Array(Math.ceil(currentRound.length / 2)).fill({ matches: [] });
      currentRound = nextRound.map(() => ({ player1: null, player2: null, score1: '', score2: '' }));
    }

    rounds.push({ matches: currentRound }); // Add the final match round
    return rounds;
  };

  const handleKnockoutMatchClick = (roundIndex, matchIndex) => {
    const match = knockoutRounds[roundIndex].matches[matchIndex];
    setCurrentKnockoutMatch({ roundIndex, matchIndex });
    setKnockoutScores({
      player1Score: match.score1 || '',
      player2Score: match.score2 || ''
    });
  };

  const handleKnockoutScoreSubmit = async (e) => {
    e.preventDefault();

    const score1 = Number(knockoutScores.player1Score);
    const score2 = Number(knockoutScores.player2Score);

    if (isNaN(score1) || isNaN(score2) || score1 < 0 || score2 < 0) {
      setError('Scores must be valid non-negative numbers.');
      return;
    }

    const updatedKnockoutRounds = [...knockoutRounds];
    const match = updatedKnockoutRounds[currentKnockoutMatch.roundIndex].matches[currentKnockoutMatch.matchIndex];

    // Update the match scores
    match.score1 = score1;
    match.score2 = score2;

    // Determine the winner
    if (score1 > score2) {
      match.result = `${match.player1.name} wins`;
      match.winner = match.player1;
    } else if (score1 < score2) {
      match.result = `${match.player2.name} wins`;
      match.winner = match.player2;
    } else {
      match.result = 'Tie';
      match.winner = null;
    }

    // Advance the winner to the next round
    if (currentKnockoutMatch.roundIndex < knockoutRounds.length - 1) {
      const nextRound = updatedKnockoutRounds[currentKnockoutMatch.roundIndex + 1].matches;
      const nextMatchIndex = Math.floor(currentKnockoutMatch.matchIndex / 2);
      if (!nextRound[nextMatchIndex]) {
        nextRound[nextMatchIndex] = {};
      }
      if (currentKnockoutMatch.matchIndex % 2 === 0) {
        nextRound[nextMatchIndex].player1 = match.winner;
      } else {
        nextRound[nextMatchIndex].player2 = match.winner;
      }
    }

    setKnockoutRounds(updatedKnockoutRounds);
    setCurrentKnockoutMatch(null);
    setKnockoutScores({ player1Score: '', player2Score: '' });

    // Optionally, update the results in Supabase
    await updateKnockoutResults(updatedKnockoutRounds);
  };

  const updateKnockoutResults = async (updatedRounds) => {
    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .update({ knockout: updatedRounds })
        .eq('id', selectedDraw); // Assuming `selectedDraw` is the current draw ID
      if (error) throw error;
      console.log('Knockout results updated:', data);
    } catch (error) {
      setError('Error updating knockout results.');
      console.error('Error updating knockout results:', error);
    }
  };

  const renderBracket = () => (
    <div className="bracket-container">
      {knockoutRounds.map((roundData, roundIndex) => (
        <div key={roundIndex} className="round-container" style={{ marginBottom: `${20 * roundIndex}px` }}>
          <h3>Round {roundIndex + 1}</h3>
          {roundData.matches.map((match, matchIndex) => (
            <div
              key={matchIndex}
              className="match-container"
              onClick={() => handleKnockoutMatchClick(roundIndex, matchIndex)} // Click to open score entry
              style={{ cursor: 'pointer' }} // Indicate clickable item
            >
              <div className="match-info">
                <div className="player-info">
                  <div className="player">
                    {match.player1 ? (
                      <>
                        <span>{match.player1.name}</span>
                        <span> - Handicap: {match.player1.handicap}</span>
                        <span> - Score: {match.score1 !== null ? match.score1 : 'N/A'}</span>
                      </>
                    ) : (
                      'TBD'
                    )}
                  </div>
                  <div className="player">
                    {match.player2 ? (
                      <>
                        <span>{match.player2.name}</span>
                        <span> - Handicap: {match.player2.handicap}</span>
                        <span> - Score: {match.score2 !== null ? match.score2 : 'N/A'}</span>
                      </>
                    ) : (
                      'TBD'
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );


  const updateHandicapRoundForPlayers = async () => {
    // Fetch all players from the Supabase database
    let { data: players, error } = await supabase
      .from('players')
      .select('name');

    if (error) {
      console.error("Error fetching players from the database:", error);
      return;
    }

    // Create a set of player names from the database
    const playerNamesFromDB = new Set(players.map(player => player.name));

    // Calculate the latest handicap for each player in the round robin results
    const playerHandicaps = {};
    roundRobinResults.forEach(groupResult => {
      groupResult.matches.forEach(match => {
        if (match.player1 && playerNamesFromDB.has(match.player1)) {
          playerHandicaps[match.player1] = match.handicap1;
        }
        if (match.player2 && playerNamesFromDB.has(match.player2)) {
          playerHandicaps[match.player2] = match.handicap2;
        }
      });
    });

    // Update the handicap_round for matched players in the database
    const handicapUpdates = [];
    for (const [playerName, latestHandicap] of Object.entries(playerHandicaps)) {
      handicapUpdates.push(
        supabase
          .from('players')
          .update({ handicap_round: latestHandicap })
          .eq('name', playerName)
      );
    }

    try {
      await Promise.all(handicapUpdates);
    } catch (error) {
      console.error("Error updating player handicaps:", error);
    }
  };
  const handleGenerateKnockout = async () => {
    await generateKnockoutDraw();
    await updateHandicapRoundForPlayers();
  };

  return (
    <div>
      <h2>Available Round Robin Draws</h2>
      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <div className="draws-select-container">
        <select className="select" onChange={(e) => handleDrawSelect(e.target.value)} value={selectedDraw || ''}>
          <option value="">Select a draw</option>
          {draws.slice(0, visibleCount).map((draw) => (
            <option key={draw.id} value={draw.id}>
              {draw.name} - {new Date(draw.start).toLocaleDateString()}
            </option>
          ))}
        </select>
        {visibleCount < draws.length && (
          <button className="show-more-button" onClick={handleShowMore}>Show More</button>
        )}
      </div>

      {selectedDraw && (
        <div>
          <h2>Round Robin Results - Draw {selectedDraw}</h2>

          {/* Display standings for all groups first */}
          <div>
  {roundRobinResults.map((groupResult, groupIndex) => (
    <div key={groupIndex}>
      <h3>Standings - Group {groupResult.group}</h3>
      <table border="1">
        <thead>
          <tr>
            <th>Ranking</th>
            <th>Name</th>
            <th>Total Wins</th>
            <th>Total Losses</th>
            <th>Ties</th>
            <th>Frame Scores</th>
            <th>Highest Break</th>
          </tr>
        </thead>
        <tbody>
          {calculateStandings(groupResult).map((player, index) => (
            <tr key={player.name}>
              <td>{index + 1}</td>
              <td>{player.displayName}</td>
              <td>{player.totalwin}</td>
              <td>{player.totalloss}</td>
              <td>{player.tie}</td>
              <td onClick={() => handleCellClick(player.name, 'frames')}>
                {expandedPlayer?.playerName === player.name && expandedPlayer.type === 'frames' ? (
                  player.latestMatch.frames.map((frames, matchIndex) => (
                    <div key={matchIndex}>Match {matchIndex + 1}: {frames.join(', ')}</div>
                  ))
                ) : (
                  'View Frames'
                )}
              </td>
              <td onClick={() => handleCellClick(player.name, 'breaks')}>
                {expandedPlayer?.playerName === player.name && expandedPlayer.type === 'breaks' ? (
                  player.latestMatch.breaks.map((breaks, matchIndex) => (
                    <div key={matchIndex}>Match {matchIndex + 1}: {breaks.join(', ')}</div>
                  ))
                ) : (
                  player.latestMatch.highestBreak
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  ))}
</div>

          {/* Display group tables */}
          {roundRobinResults.map((groupResult, groupIndex) => (
            <div key={groupIndex}>
              <h3>Group {groupResult.group}</h3>
              <table border="1">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Match Number</th>
                    <th>Player 1</th>
                    <th>Score 1</th>
                    <th>Player 2</th>
                    <th>Score 2</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {groupResult.matches.reduce((acc, match, matchIndex) => {
                    const isNewDate = acc.lastDate !== match.matchDate;

                    if (isNewDate && acc.lastDate !== null) {
                      acc.rows.push(
                        <tr key={`break-${matchIndex}`} className="date-break-row">
                          <td colSpan="7" className="date-break-text">End of Day: {acc.lastDate}</td>
                        </tr>
                      );
                    }

                    acc.lastDate = match.matchDate;

                    acc.rows.push(
                      <tr key={matchIndex} onClick={() => handleMatchClick(groupIndex, matchIndex)}>
                        <td>{match.matchDate}</td>
                        <td>{match.matchNumber}</td>
                        <td>{match.player1} [{match.handicap1}]</td>
                        <td>{match.score1 !== null ? match.score1 : ''}</td>
                        <td>{match.player2} [{match.handicap2}]</td>
                        <td>{match.score2 !== null ? match.score2 : ''}</td>
                        <td>{match.result}</td>
                      </tr>
                    );

                    return acc;
                  }, { rows: [], lastDate: null }).rows}
                </tbody>
              </table>
            </div>
          ))}
          {selectedMatch && (
            <div className="modal">

              <form onSubmit={handleFrameScoreSubmit}>
                <h3>Enter Frame Scores</h3>
                <div>
                  Frame Scores: {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player1}:

                  <input
                    type="text"
                    name="player1"
                    value={frameScores.player1}
                    onChange={handleFrameScoreChange}
                    placeholder="Player 1 Frame Scores (comma separated)"
                  />
                </div>
                <div>
                  Break: {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player1}:

                  <input
                    type="text"
                    name="player1"
                    value={breakScores.player1}
                    onChange={handleBreakScoreChange}
                    placeholder="Player 1 Break Scores (comma separated)"
                  />
                </div>
                <div>
                  Frame Scores: {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player2}:

                  <input
                    type="text"
                    name="player2"
                    value={frameScores.player2}
                    onChange={handleFrameScoreChange}
                    placeholder="Player 2 Frame Scores (comma separated)"
                  />
                </div>
                <div>
                  Break: {roundRobinResults[selectedMatch.groupIndex].matches[selectedMatch.matchIndex].player2}:

                  <input
                    type="text"
                    name="player2"
                    value={breakScores.player2}
                    onChange={handleBreakScoreChange}
                    placeholder="Player 2 Break Scores (comma separated)"
                  />
                </div>
                <button type="submit">Submit Frame Scores</button>
                <button onClick={() => setSelectedMatch(null)}>Cancel</button>

              </form>
            </div>

          )}

          <div>
            <h3>Generate Knockout Draw</h3>
            <label>
              Select Top Players:
              <select value={topPlayersCount} onChange={handleTopPlayersChange}>
                <option value={1}>Top 1</option>
                <option value={2}>Top 2</option>
                <option value={4}>Top 4</option>
                <option value={4}>Top 8</option>
              </select>
            </label>
            <button onClick={handleGenerateKnockout}>Generate Knockout Draw</button>

            {knockoutRounds.length > 0 && renderBracket()}

            {currentKnockoutMatch && (
              <div className="modal">
                <h2>Enter Scores for Match {currentKnockoutMatch.matchIndex + 1}</h2>
                <p>
                  {knockoutRounds[currentKnockoutMatch.roundIndex].matches[currentKnockoutMatch.matchIndex].player1?.name} vs.
                  {knockoutRounds[currentKnockoutMatch.roundIndex].matches[currentKnockoutMatch.matchIndex].player2?.name}
                </p>
                <form onSubmit={handleKnockoutScoreSubmit}>
                  <label>
                    Score for {knockoutRounds[currentKnockoutMatch.roundIndex].matches[currentKnockoutMatch.matchIndex].player1?.name}:
                    <input
                      type="number"
                      name="player1Score"
                      value={knockoutScores.player1Score}
                      onChange={(e) => setKnockoutScores({ ...knockoutScores, player1Score: e.target.value })}
                    />
                  </label>
                  <br />
                  <label>
                    Score for {knockoutRounds[currentKnockoutMatch.roundIndex].matches[currentKnockoutMatch.matchIndex].player2?.name}:
                    <input
                      type="number"
                      name="player2Score"
                      value={knockoutScores.player2Score}
                      onChange={(e) => setKnockoutScores({ ...knockoutScores, player2Score: e.target.value })}
                    />
                  </label>
                  <br />
                  <button type="submit">Submit Scores</button>
                  <button type="button" onClick={() => setCurrentKnockoutMatch(null)}>Cancel</button>
                </form>
                {error && <p className="error">{error}</p>}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

}

export default ViewDraws;

