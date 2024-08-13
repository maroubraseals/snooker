import React, { useEffect, useState } from 'react';
import supabase from '../supabase';
import { startOfWeek, addWeeks, format } from 'date-fns';
import './matchesDisplay.css'; // Assuming you have a separate CSS file

function RoundHome() {
    const [draws, setDraws] = useState([]);
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [hasKnockoutDraw, setHasKnockoutDraw] = useState(false);
    const [roundRobinResults, setRoundRobinResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [knockoutRounds, setKnockoutRounds] = useState([]);
    const [visibleCount, setVisibleCount] = useState(2);
    const [combinedMatches, setCombinedMatches] = useState([]);
    const [closeMatches, setCloseMatches] = useState([]);
    const [futureMatches, setFutureMatches] = useState([]);
    const [selectedDrawName, setSelectedDrawName] = useState('N/A');
    const [selectedDrawDate, setSelectedDrawDate] = useState('N/A');
    const [expandedPlayer, setExpandedPlayer] = useState(null);

    const handleShowMore = () => {
        setVisibleCount((prevCount) => prevCount + 2);
    };



    useEffect(() => {
        fetchDraws();
    }, []);


    useEffect(() => {
        if (combinedMatches.length > 0) {
            const today = new Date();
            const startOfWeekToday = startOfWeek(today, { weekStartsOn: 1 });
            const endOfWeekToday = addWeeks(startOfWeekToday, 1);
            const startOfNextWeek = addWeeks(startOfWeekToday, 1);
            const endOfNextWeek = addWeeks(startOfNextWeek, 1);

            const close = combinedMatches.filter(match => {
                const matchDate = new Date(match.matchDate);
                return matchDate >= startOfWeekToday && matchDate < endOfWeekToday;
            });

            const future = combinedMatches.filter(match => {
                const matchDate = new Date(match.matchDate);
                return matchDate >= startOfNextWeek && matchDate < endOfNextWeek;
            });

            setCloseMatches(close);
            setFutureMatches(future);
        }
    }, [combinedMatches]);




    const fetchDraws = async () => {
        setLoading(true);
        setError(''); // Clear previous error

        try {
            const { data, error } = await supabase
                .from('roundrobin')
                .select('id, name, start') // Fetch id, name, and start columns
                .order('start', { ascending: false }); // Order by start date in descending order
            if (error) throw error;

            // Set the fetched draws
            setDraws(data);

            // Check if there are any draws
            if (data.length > 0) {
                const latestDraw = data[0]; // The latest draw

                // Directly set the selected draw details
                setSelectedDraw(latestDraw.id);
                setSelectedDrawName(latestDraw.name);
                setSelectedDrawDate(latestDraw.start);

                // Fetch details for the latest draw
                fetchDrawDetails(latestDraw.id);
            } else {
                // Handle case where no draws are available
                setSelectedDraw('N/A');
                setSelectedDrawName('N/A');
                setSelectedDrawDate('N/A');
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
                .select('roundrobin, knockout, start, name') // Fetch both roundrobin and knockout columns
                .eq('id', drawId)
                .single();
            if (error) throw error;

            setRoundRobinResults(data.roundrobin);
            setSelectedDrawName(data.name);
            setSelectedDrawDate(data.start);
            if (data.knockout && data.knockout.length > 0) {
                setKnockoutRounds(data.knockout);
                setHasKnockoutDraw(true);
            } else {
                setKnockoutRounds([]);
                setHasKnockoutDraw(false);
            }

            // Combine round-robin results into a single table, sort by matchDate
            const combined = data.roundrobin.flatMap(group => group.matches);
            combined.sort((a, b) => new Date(a.matchDate) - new Date(b.matchDate));
            setCombinedMatches(combined);
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
                <div className="draw-details">
                    <h2>Round Robin Results : {selectedDrawName}({selectedDrawDate})</h2>
                    {/* Display standings tables */}
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
                                                    <td>{player.displayName}</td>
                                                    <td>{player.totalwin}</td>
                                                    <td>{player.totalloss}</td>
                                                    <td>{player.tie}</td>
                                                    <td onClick={() => handleCellClick(player.name, 'breaks')}>
                                                        {expandedPlayer?.playerName === player.name && expandedPlayer.type === 'breaks' ? (
                                                            player.latestMatch.breaks.map((breaks, matchIndex) => (
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

                    <div>
                        {/* Display matches close to current date */}
                        {closeMatches.length > 0 && (
                            <div className="matches-close-date">
                                <h3>Current Week</h3>
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
                                        {closeMatches.map((match, index) => (
                                            <tr key={index}>
                                                <td>{new Date(match.matchDate).toLocaleDateString()}</td>
                                                <td>{match.matchNumber}</td>
                                                <td>{match.player1} [{match.handicap1}]</td>
                                                <td>{match.score1 !== null ? match.score1 : ''}</td>
                                                <td>{match.player2} [{match.handicap2}]</td>
                                                <td>{match.score2 !== null ? match.score2 : ''}</td>
                                                <td>{match.result}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* Display matches after the current date */}
                        {futureMatches.length > 0 && (
                            <div className="matches-after-date">
                                <h3>Next Week</h3>
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
                                        {futureMatches.map((match, index) => (
                                            <tr key={index}>
                                                <td>{new Date(match.matchDate).toLocaleDateString()}</td>
                                                <td>{match.matchNumber}</td>
                                                <td>{match.player1} [{match.handicap1}]</td>
                                                <td>{match.score1 !== null ? match.score1 : ''}</td>
                                                <td>{match.player2} [{match.handicap2}]</td>
                                                <td>{match.score2 !== null ? match.score2 : ''}</td>
                                                <td>{match.result}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Display combined group table */}
                    <div className="combined-table">
                        <h3>All Group Matches</h3>
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
                                {combinedMatches.reduce((acc, match, index) => {
                                    // Compare current match date with the previous date
                                    const isNewDate = acc.lastDate !== match.matchDate;

                                    // Add a break row if date has changed
                                    if (isNewDate && acc.lastDate !== null) {
                                        acc.rows.push(
                                            <tr key={`break-${index}`} className="date-break-row">
                                                <td colSpan="7" className="date-break-text">End of Day: {acc.lastDate}</td>
                                            </tr>
                                        );
                                    }

                                    // Update the last processed date
                                    acc.lastDate = match.matchDate;

                                    // Add the current match row
                                    acc.rows.push(
                                        <tr key={index}>
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


                    {/* Display knockout draw */}
                    {hasKnockoutDraw && (
                        <div className="knockout-draw">
                            <h3>Knockout Draw</h3>
                            {knockoutRounds.length > 0 && renderBracket()}
                        </div>
                    )}


                </div>
            )}
        </div>
    );
}

export default RoundHome;
