
import React, { useState, useEffect } from 'react';
import supabase from './supabase'; // Import your Supabase client

const MatchData = () => {
    const [draws, setDraws] = useState([]);
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [error, setError] = useState(null);
    const [visibleDraws, setVisibleDraws] = useState(5); // Number of draws to initially display
    const [showMore, setShowMore] = useState(true);
    const [selectedDrawId, setSelectedDrawId] = useState(null);
    const [selectedDrawName, setSelectedDrawName] = useState(null);
    const [sendData, setSendData] = useState(false);
    const [completeData, setCompleteData] = useState(false);
    const [loading, setLoading] = useState(false);
    const [bestOf, setBestOf] = useState([]);
    const [frameScores, setFrameScores] = useState([]);

    useEffect(() => {
        fetchDraws();
    }, []);

    // Fetch draws from Supabase
    const fetchDraws = async () => {
        try {
            const { data, error } = await supabase.from('knockoutdraw').select('*');
            if (error) {
                throw error;
            }
            setDraws(data);
        } catch (error) {
            console.error('Error fetching draws:', error);
            setError('Failed to fetch draw data');
        }
    };


    // Handle draw selection
    const handleDrawSelect = async (draw) => {
        try {
            const drawData = typeof draw.draw === 'string' ? JSON.parse(draw.draw) : draw.draw;
            setSelectedDraw(drawData);
            setSelectedDrawId(draw.id);
            setSelectedDrawName(draw.draw_name);
            setError(null);

            // Fetch bestOf for the selected draw based on draw.id
            setLoading(true);
            const { data, error } = await supabase
                .from('knockoutdraw')
                .select('best_of')
                .eq('id', draw.id)
                .single();

            setLoading(false);

            if (error) {
                throw error;
            }

            if (data) {
                setBestOf(data.best_of || []);
                console.log('bestOf', bestOf);

            } else {
                setBestOf([]);
            }

        } catch (error) {
            console.error("Error handling draw select:", error);
            setSelectedDraw(null);
            setSelectedDrawId(null);
            setSelectedDrawName(null);
            setError("Failed to handle draw selection");
        }
    };

    // Show more draws
    const handleShowMore = () => {
        setVisibleDraws(prevVisibleDraws => prevVisibleDraws + 5);
        if (visibleDraws + 5 >= draws.length) {
            setShowMore(false);
        }
    };

    // Sort draws by date in descending order
    const sortDrawsByDateDescending = (draws) => {
        return draws.slice().sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    };

    // Render the selected draw
    const renderDraw = () => {
        if (!selectedDraw) {
            return <p>Select a draw to view</p>;
        }

        if (!Array.isArray(selectedDraw)) {
            return <p>Error: Draw data is not in the expected format</p>;
        }

        return (
            <div>
                <div className="bracket-container">
                    {selectedDraw.map((round, roundIndex) => (
                        <Round key={roundIndex} round={round} roundIndex={roundIndex} updateScores={updateScores} bestOf={bestOf} />
                    ))}
                </div>
                {renderDrawDetails()}
                <div>
                    <button onClick={updateScoresToDB} disabled={loading}>
                        {loading ? "Loading..." : "Update Scores"}
                    </button>
                    {sendData && <p>Success message: Scores Updated!</p>}
                    {error && <p>Error message: {error}</p>}
                </div>
                <div>
                    <button onClick={submitScore} disabled={loading}>
                        {loading ? "Loading..." : "Complete Tournament"}
                    </button>
                    {completeData && <p>Success message: Tournament Completed</p>}
                    {error && <p>Error message: {error}</p>}
                </div>
            </div>
        );
    };

    // Render draw details in a table
    const renderDrawDetails = () => {
        if (!selectedDraw) {
            return null;
        }

        return (
            <div>
                <h2>Draw Details</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Round</th>
                            <th>Match</th>
                            <th>Player 1</th>
                            <th>Player 1 Score</th>
                            <th>Player 2</th>
                            <th>Player 2 Score</th>
                        </tr>
                    </thead>
                    <tbody>
                        {selectedDraw.map((round, roundIndex) => (
                            <React.Fragment key={roundIndex}>
                                {roundIndex > 0 && (
                                    <tr key={`round-break-${roundIndex}`}>
                                        <td colSpan="6" style={{ textAlign: 'center', fontWeight: 'bold' }}>Round Break</td>
                                    </tr>
                                )}
                                {round.matches.map((match, matchIndex) => {
                                    const player1 = match.subBoxes[0];
                                    const player2 = match.subBoxes[1];
                                    if (player1 && player1.playerName && player2 && player2.playerName) {
                                        return (
                                            <tr key={`${roundIndex}-${matchIndex}`}>
                                                <td>{round.round}</td>
                                                <td>{matchIndex + 1}</td>
                                                <td>{player1.playerName}</td>
                                                <td>{player1.score}</td>
                                                <td>{player2.playerName}</td>
                                                <td>{player2.score}</td>
                                            </tr>
                                        );
                                    }
                                    return null;
                                })}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    // Submit scores to the database
    const submitScore = async () => {
        if (!selectedDraw) {
            console.error("No draw selected to update");
            return;
        }
        setLoading(true);

        const matchesData = [];

        const getPlayerIdByName = async (playerName) => {
            try {
                const { data, error } = await supabase.from('players').select('id').eq('name', playerName);
                if (error) {
                    throw error;
                }
                return data[0]?.id;
            } catch (error) {
                console.error("Error fetching player ID:", error.message);
                return null;
            }
        };

        for (const round of selectedDraw) {
            for (const match of round.matches) {
                const player1 = match.subBoxes[0];
                const player2 = match.subBoxes[1];

                if (player1 && player1.playerName && player2 && player2.playerName && player1.score !== undefined && player2.score !== undefined) {
                    const player1Id = await getPlayerIdByName(player1.playerName);
                    const player2Id = await getPlayerIdByName(player2.playerName);

                    const matchData = {
                        drawid: selectedDrawId,
                        round: round.round,
                        player1id: player1Id,
                        player2id: player2Id,
                        player1score: player1.score,
                        player2score: player2.score
                    };

                    matchesData.push(matchData);
                }
            }
        }

        for (const match of matchesData) {
            try {
                const { error } = await supabase.from('matches').insert([match]);
                if (error) {
                    throw error;
                }
                setCompleteData(true);
                setLoading(false);
            } catch (error) {
                console.error("Error submitting match data:", error.message);
            }
        }
    };

    // Update scores in the selected draw
    const updateScores = async (updatedSubBox, roundIndex, matchIndex, subBoxIndex) => {
        const updatedDraw = [...selectedDraw];
        const updatedMatch = { ...updatedDraw[roundIndex].matches[matchIndex] };
        const updatedSubBoxes = [...updatedMatch.subBoxes];
        updatedSubBoxes[subBoxIndex] = updatedSubBox;
        updatedMatch.subBoxes = updatedSubBoxes;
        updatedDraw[roundIndex].matches[matchIndex] = updatedMatch;

        const allScoresEntered = updatedDraw[roundIndex].matches[matchIndex].subBoxes.every(player => player.score !== '');

        if (allScoresEntered || updatedDraw[roundIndex].matches[matchIndex].subBoxes.length === 1) {
            const player1 = updatedDraw[roundIndex].matches[matchIndex].subBoxes[0];
            const player2 = updatedDraw[roundIndex].matches[matchIndex].subBoxes[1];

            if (player1 && player2 && player1.score !== undefined && player2.score !== undefined) {
                const player1Score = parseInt(player1.score);
                const player2Score = parseInt(player2.score);

                const winnerIndex = player1Score > player2Score ? 0 : 1;
                const loserIndex = winnerIndex === 0 ? 1 : 0;

                updatedDraw[roundIndex].matches[matchIndex].subBoxes[winnerIndex].isWinner = true;
                updatedDraw[roundIndex].matches[matchIndex].subBoxes[loserIndex].isWinner = false;

                if (roundIndex < updatedDraw.length - 1) {
                    const nextRoundIndex = roundIndex + 1;
                    const nextMatchIndex = Math.floor(matchIndex / 2);
                    const nextSubBoxIndex = matchIndex % 2;

                    if (nextMatchIndex < updatedDraw[nextRoundIndex].matches.length) {
                        updatedDraw[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex] = { ...updatedDraw[roundIndex].matches[matchIndex].subBoxes[winnerIndex] };
                        updatedDraw[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].score = '';
                        updatedDraw[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].isWinner = false;
                    }
                }
            } else if (updatedDraw[roundIndex].matches[matchIndex].subBoxes.length === 1) {
                if (roundIndex < updatedDraw.length - 1) {
                    const nextRoundIndex = roundIndex + 1;
                    const nextMatchIndex = Math.floor(matchIndex / 2);
                    const nextSubBoxIndex = matchIndex % 2;

                    updatedDraw[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex] = { ...updatedDraw[roundIndex].matches[matchIndex].subBoxes[0] };
                    updatedDraw[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].score = '';
                    updatedDraw[nextRoundIndex].matches[nextMatchIndex].subBoxes[nextSubBoxIndex].isWinner = false;
                }
            }
        }

        setSelectedDraw(updatedDraw);
    };

    // Update scores to the database
    const updateScoresToDB = async () => {
        if (!selectedDraw) {
            console.error("No draw selected to update");
            return;
        }

        try {
            setLoading(true);
            setError(null);
            const { error } = await supabase.from('knockoutdraw').update({ draw: JSON.stringify(selectedDraw) }).match({ id: selectedDrawId });
            if (error) {
                throw error;
            }
            setSendData(true);
        } catch (error) {
            console.error("Error updating draw:", error.message);
            setError("Failed to update draw");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            <h1>Draws List</h1>
            {error && <p>{error}</p>}
            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Tournament</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortDrawsByDateDescending(draws).slice(0, visibleDraws).map((draw, index) => (
                            <tr key={index} onClick={() => handleDrawSelect(draw)}>
                                <td>{draw.draw_name}</td>
                                <td>{new Date(draw.created_at).toLocaleDateString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {showMore && <button className="button" onClick={handleShowMore}>Show More</button>}
            <div className="same-row">
                <h2>{selectedDrawName}</h2>
            </div>
            <div>
                {renderDraw()}
            </div>
        </div>
    );
};

const Round = ({ round, roundIndex, updateScores, bestOf }) => {
    return (
        <div className="round-container" style={{ marginBottom: `${20 * roundIndex}px` }}>
            <h3>Round {round.round} (Best of: {bestOf[roundIndex]})</h3>
            {round.matches.map((match, matchIndex) => (
                <Match key={matchIndex} match={match} roundIndex={roundIndex} matchIndex={matchIndex} updateScores={updateScores} />
            ))}
        </div>
    );
};


const Match = ({ match, roundIndex, matchIndex, updateScores }) => {
    const [showFrameScores, setShowFrameScores] = useState(false);
    const [frameScoresData, setFrameScoresData] = useState(null);

    const handleShowFrameScores = async () => {
        if (showFrameScores) {
            setShowFrameScores(false);
            setFrameScoresData(null);
        } else {
            setShowFrameScores(true);
            const { data, error } = await supabase
                .from('framescores')
                .select('*')
                .eq('match_id', match.id); // Assuming you have a match_id in framescores table
            if (error) {
                console.error('Error fetching frame scores:', error);
            } else {
                setFrameScoresData(data || []);
            }
        }
    };

    return (
        <div className="match-container">
            {match.subBoxes.map((subBox, subBoxIndex) => (
                <SubBox key={subBoxIndex} subBox={subBox} roundIndex={roundIndex} matchIndex={matchIndex} subBoxIndex={subBoxIndex} updateScores={updateScores} />
            ))}
            <button onClick={handleShowFrameScores}>Toggle Frame Scores</button>
            {showFrameScores && (
                <div>
                    {frameScoresData ? (
                        <FrameScoreInput matchId={match.id} frameScores={frameScoresData} />
                    ) : (
                        <p>No frame scores available.</p>
                    )}
                </div>
            )}
        </div>
    );
};


const SubBox = ({ subBox, roundIndex, matchIndex, subBoxIndex, updateScores }) => {
    const handleChange = (e) => {
        const newScore = e.target.value;
        const updatedSubBox = { ...subBox, score: newScore };
        updateScores(updatedSubBox, roundIndex, matchIndex, subBoxIndex);
    };

    return (
        <div className="sub-box">
            <span>
                {subBox.playerName} {subBox.handicap !== '' && `[${subBox.handicap}]`}
            </span>
            <input
                className="score-input"
                type="text"
                value={subBox.score || ''}
                onChange={handleChange}
                placeholder="Score"
            />
        </div>
    );
};
const FrameScoreInput = ({ matchId, frameScores }) => {
    const [scores, setScores] = useState([...frameScores]);

    const handleScoreChange = (index, e) => {
        const newScores = [...scores];
        newScores[index] = parseInt(e.target.value) || 0; // Ensure it's a number
        setScores(newScores);
    };

    const handleSaveScores = async () => {
        // Save scores to database
        
    };

    return (
        <div>
            <h4>Frame Scores</h4>
            {scores.map((score, index) => (
                <div key={index}>
                    <label>Frame {index + 1}</label>
                    <input type="number" value={score} onChange={(e) => handleScoreChange(index, e)} />
                </div>
            ))}
            <button onClick={handleSaveScores}>Save Scores</button>
        </div>
    );
};


export default MatchData;
