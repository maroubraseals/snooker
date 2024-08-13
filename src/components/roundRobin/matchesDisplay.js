

import React, { useState, useEffect } from 'react';
import supabase from '../supabase';
import './matchesDisplay.css';

function MatchesDisplay() {
  const [draws, setDraws] = useState([]);
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [hasKnockoutDraw, setHasKnockoutDraw] = useState(false);
  const [roundRobinResults, setRoundRobinResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [knockoutRounds, setKnockoutRounds] = useState([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [selectedGroup, setSelectedGroup] = useState('all');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showPlayerMatches, setShowPlayerMatches] = useState(false);
  const [expandedPlayer, setExpandedPlayer] = useState(null);

  const handlePlayerNameClick = (playerName) => {
    if (selectedPlayer === playerName) {
      setShowPlayerMatches(!showPlayerMatches);
    } else {
      setSelectedPlayer(playerName);
      setShowPlayerMatches(true);
    }
  };

  const getPlayerMatches = (playerName) => {
    return filteredRoundRobinResults.flatMap(groupResult =>
      groupResult.matches.filter(match =>
        match.player1 === playerName || match.player2 === playerName
      )
    );
  };

  const handleShowMore = () => {
    setVisibleCount((prevCount) => prevCount + 5);
  };

  const handleDrawSelect = (drawId) => {
    fetchDrawDetails(drawId);
    setSelectedDraw(drawId);
  };

  const handleGroupFilterChange = (event) => {
    const selected = event.target.value;
    console.log('Selected group:', selected); // Log the selected group
    setSelectedGroup(selected);
  };

  useEffect(() => {
    fetchDraws();
  }, []);

  const fetchDraws = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .select('id, name, start')
        .order('start', { ascending: false });
      if (error) throw error;

      console.log('Fetched draws:', data); // Log fetched draws
      setDraws(data);

      if (data.length > 0) {
        const latestDraw = data[0];
        setSelectedDraw(latestDraw.id);
        fetchDrawDetails(latestDraw.id);
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
    setError('');
    try {
      const { data, error } = await supabase
        .from('roundrobin')
        .select('roundrobin, knockout')
        .eq('id', drawId)
        .single();
      if (error) throw error;
      console.log('Fetched draw details:', data); // Check the data structure
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


  const filteredRoundRobinResults = roundRobinResults.filter(groupResult =>
    selectedGroup === 'all' || groupResult.group === Number(selectedGroup)
  );


  // Function to handle clicks on frame scores and highest break cells
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


  const renderBracket = () => (
    <div className="bracket-container">
      {knockoutRounds.map((roundData, roundIndex) => (
        <div key={roundIndex} className="round-container">
          <h3>Round {roundIndex + 1}</h3>
          {roundData.matches.map((match, matchIndex) => (
            <div
              key={matchIndex}
              className="match-container"
            >
              <div className="match-info">
                <div className="player-info">
                  <div className="player">
                    <div className="player-name">
                      {match.player1 ? `${match.player1.name} [${match.player1.handicap}]` : 'TBD'}
                    </div>
                    <div className="player-score">{match.score1 !== null ? `Score: ${match.score1}` : 'Score: N/A'}</div>
                  </div>
                  <div className="vs">VS</div>
                  <div className="player">
                    <div className="player-name">
                      {match.player2 ? `${match.player2.name} [${match.player2.handicap}]` : 'TBD'}
                    </div>
                    <div className="player-score">{match.score2 !== null ? `Score: ${match.score2}` : 'Score: N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="matches-display">
      {loading && <div className="loading">Loading...</div>}
      {error && <p className="error">{error}</p>}

      <div className="draws-select-container">
        <select onChange={(e) => handleDrawSelect(e.target.value)} value={selectedDraw || ''}>
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
        <div className="group-filter-container">
          <label htmlFor="group-filter">Filter by Group:</label>
          <select id="group-filter" onChange={handleGroupFilterChange} value={selectedGroup}>
            <option value="all">All Groups</option>
            {roundRobinResults.map(groupResult => (
              <option key={groupResult.group} value={groupResult.group}>
                Group {groupResult.group}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedDraw && (
        <div className="draw-details">
          <h2>Round Robin Results - Draw {selectedDraw}</h2>
          <div className="matches-display">
            <div className="standings-tables">
              {roundRobinResults.map((groupResult, groupIndex) => (
                <div key={groupIndex}>
                  <h3>Standings - Group {groupResult.group}</h3>
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th>Rank</th>
                        <th>Name</th>
                        <th>Wins</th>
                        <th>Losses</th>
                        <th>Ties</th>
                        <th>H.Break</th>
                        <th>Frames</th>
                      </tr>
                    </thead>
                    <tbody>
                      {calculateStandings(groupResult).map((player, index) => (
                        <tr key={player.name}>
                          <td>{index + 1}</td>
                          <td onClick={() => handlePlayerNameClick(player.name)} className="clickable">
                            {player.displayName}
                          </td>                                                    
                          <td>{player.totalwin}</td>
                          <td>{player.totalloss}</td>
                          <td>{player.tie}</td>
                          <td onClick={() => handleCellClick(player.name, 'breaks')}>
                            {expandedPlayer?.playerName === player.name && expandedPlayer.type === 'breaks' ? (
                              player.latestMatch.braks.map((breaks, matchIndex) => (
                                <div key={matchIndex}>Match {matchIndex + 1}: {breaks.join(', ')}</div>
                              ))

                            ) : (
                              player.latestMatch.highestBreak
                            )}
                          </td>
                          <td onClick={() => handleCellClick(player.name, 'frames')}>
                            {expandedPlayer?.playerName === player.name && expandedPlayer.type === 'frames' ? (
                              player.latestMatch.frames.map((frames, matchIndex) => (
                                <div key={matchIndex}>Match {matchIndex + 1}: {frames.join(', ')}</div>
                              ))
                            ) : (
                              'View'
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>


          {selectedPlayer && showPlayerMatches && (
            <div className="player-matches">
              <h3>Matches for {selectedPlayer}</h3>
              <table className="matches-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Match Number</th>
                    <th>Selected Player</th>
                    <th>Score</th>
                    <th>Opponent</th>
                    <th>Score</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {getPlayerMatches(selectedPlayer).map((match, index) => (
                    <tr key={index}>
                      <td>{match.matchDate}</td>
                      <td>{match.matchNumber}</td>
                      <td>{match.player1 === selectedPlayer ? `${match.player1} [${match.handicap1}]` : `${match.player2} [${match.handicap2}]`}</td>
                      <td>{match.player1 === selectedPlayer ? match.score1 : match.score2}</td>
                      <td>{match.player1 === selectedPlayer ? match.player2 : match.player1}</td>
                      <td>{match.player1 === selectedPlayer ? match.score2 : match.score1}</td>
                      <td>{match.result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredRoundRobinResults.map((groupResult, groupIndex) => (
            <div key={groupIndex} className="group-table">
              <h3>Group {groupResult.group}</h3>
              <table className="matches-table">
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
                      <tr key={matchIndex}>
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

          <div className="knockout-draw">
            <h3>Knockout Draw</h3>
            {knockoutRounds.length > 0 && renderBracket()}
          </div>
        </div>
      )}
    </div>
  );

}

export default MatchesDisplay;
