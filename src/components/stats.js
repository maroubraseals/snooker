import React, { useState, useEffect } from 'react';
import supabase from './supabase'; // Import your Supabase client
import PlayerChart from './chartrenderer'; // Import your PlayerChart component


const Stats = () => {
    const [playersData, setPlayersData] = useState([]);
    const [matchesData, setMatchesData] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [selectedPlayer, setSelectedPlayer] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: players, error: playersError } = await supabase.from('players').select('*');
            if (playersError) {
                throw playersError;
            }

            const { data: matches, error: matchesError } = await supabase.from('matches').select('*');
            if (matchesError) {
                throw matchesError;
            }

            setPlayersData(players);
            setMatchesData(matches);
        } catch (error) {
            setError('Error fetching data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const sortedPlayersData = [...playersData].sort((a, b) => a.handicap - b.handicap);

    const getPlayerWins = (playerId, matchesData) => {
        // Find matches where the player participated
        const playerMatches = matchesData.filter(matches => matches.player1id === playerId || matches.player2id === playerId);
        // Calculate total score
        let totalScore = 0;
        playerMatches.forEach(matches => {
            if (matches.player1id === playerId) {
                totalScore += matches.player1score;
            }
            if (matches.player2id === playerId) {
                totalScore += matches.player2score;
            }
        });
        return totalScore;
    };
    const getPlayerLosses = (playerId, matchesData) => {
        let losses = 0;
        matchesData.forEach(match => {
            if (match.player1id === playerId) {
                losses += match.player2score;
            } else if (match.player2id === playerId) {
                losses += match.player1score;
            }
        });
        return losses;
    };

    const getPlayerMatchWins = (playerId, matchesData) => {
        let wins = 0;
        matchesData.forEach(match => {
            if (match.player1id === playerId && match.player1score > match.player2score) {
                wins++;
            } else if (match.player2id === playerId && match.player2score > match.player1score) {
                wins++;
            }
        });
        return wins;
    };

    const getPlayerMatchLosses = (playerId, matchesData) => {
        let losses = 0;
        matchesData.forEach(match => {
            if (match.player1id === playerId && match.player1score < match.player2score) {
                losses++;
            } else if (match.player2id === playerId && match.player2score < match.player1score) {
                losses++;
            }
        });
        return losses;
    };
    const getTotalFramesPlayed = (playerId, matchesData) => {
        let totalFramesPlayed = 0;
        matchesData.forEach(match => {
            if (match.player1id === playerId) {
                totalFramesPlayed += match.player1score + match.player2score;
            } else if (match.player2id === playerId) {
                totalFramesPlayed += match.player1score + match.player2score;
            }
        });
        return totalFramesPlayed;
    };

    const getTotalMatchesPlayed = (playerId, matchesData) => {
        let totalMatchesPlayed = 0;
        matchesData.forEach(match => {
            if (match.player1id === playerId || match.player2id === playerId) {
                totalMatchesPlayed++;
            }
        });
        return totalMatchesPlayed;
    };


    const handlePlayerClick = playerId => {
        setSelectedPlayer(prevSelectedPlayer => (prevSelectedPlayer === playerId ? null : playerId));
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    if (error) {
        return <div>Error: {error}</div>;
    }

    
return (
    <div>
        <h1>Players Data</h1>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Player Name</th>
                    <th>Handicap</th>
                    <th>Frame Played</th>
                    <th>Frame Won</th>
                    <th>Frame Lost</th>
                    <th>Match Played</th>
                    <th>Match Win</th>
                    <th>Match Lost</th>                  
                </tr>
            </thead>
            <tbody>
                {sortedPlayersData.map((player, index) => (
                    <tr key={player.id}>
                        <td>{index+1}</td>
                        <td onClick={() => handlePlayerClick(player.id)}>
                            {player.name}
                            {selectedPlayer === player.id && (
                                <PlayerChart
                                    playerName={player.name}
                                    playerStats={[
                                        getTotalFramesPlayed(player.id, matchesData),
                                        getPlayerWins(player.id, matchesData),
                                        getPlayerLosses(player.id, matchesData),
                                        '',
                                        getTotalMatchesPlayed(player.id, matchesData),
                                        getPlayerMatchWins(player.id, matchesData),
                                        getPlayerMatchLosses(player.id, matchesData)
                                    ]}
                                />
                            )}
                        </td>
                        <td>{player.handicap}</td>
                        <td>{getTotalFramesPlayed(player.id, matchesData)}</td>
                        <td>{getPlayerWins(player.id, matchesData)}</td>
                        <td>{getPlayerLosses(player.id, matchesData)}</td>                   
                        <td>{getTotalMatchesPlayed(player.id, matchesData)}</td>
                        <td>{getPlayerMatchWins(player.id, matchesData)}</td>
                        <td>{getPlayerMatchLosses(player.id, matchesData)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

    
};

export default Stats;
