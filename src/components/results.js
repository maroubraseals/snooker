import React, { useState, useEffect } from 'react';
import supabase from './supabase'; // Import your Supabase client
import '../style/players.css';

const Results = () => {
    const [draws, setDraws] = useState([]);
    const [selectedDraw, setSelectedDraw] = useState(null);
    const [error, setError] = useState(null);
    const [visibleDraws, setVisibleDraws] = useState(5); // Number of draws to initially display
    const [showMore, setShowMore] = useState(true);
    const [selectedDrawName, setSelectedDrawName] = useState(true);
    const [showHandicap, setShowHandicap] = useState(false); // State to control handicap visibility

    useEffect(() => {
        fetchDraws();
    }, []);

    const toggleHandicap = () => {
        setShowHandicap(!showHandicap); // Toggle handicap visibility
    };
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

    const handleDrawSelect = (draw) => {
        try {
            const drawData = typeof draw.draw === 'string' ? JSON.parse(draw.draw) : draw.draw;
            const draw_name = draw.draw_name;
            setSelectedDraw(drawData);
            setSelectedDrawName(draw_name); // Storing the draw ID in state
        } catch (error) {
            console.error("Error parsing draw data:", error);
            setSelectedDraw(null);
            setSelectedDrawName(null); // Clearing the draw ID if an error occurs
            setError("Failed to parse draw data");
        }
    };

    const handleShowMore = () => {
        setVisibleDraws(prevVisibleDraws => prevVisibleDraws + 5);
        if (visibleDraws + 5 >= draws.length) {
            setShowMore(false);
        }
    };

    const renderDraw = () => {
        if (!selectedDraw) {
            return <h2>Select a draw to view</h2>;
        }

        if (!Array.isArray(selectedDraw)) {
            return <p>Error: Draw data is not in the expected format</p>;
        }

        return (
            <div className="bracket-container">
                {selectedDraw.map((round, roundIndex) => (
                    <Round key={roundIndex} round={round} roundIndex={roundIndex} showHandicap={showHandicap} />
                ))}
            </div>
        );
    };
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

                                    // Check if both Player 1 and Player 2 have valid strings for player names
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
                                    return null; // Return null to skip rendering this row
                                })}
                            </React.Fragment>
                        ))}

                    </tbody>
                </table>
            </div>
        );
    };


    return (
        <div>
            <h2>Tournament List</h2>
            {error && <p>{error}</p>}
            <div className="small-table-container"> {/* Updated classname here */}
                <table>
                    <thead>
                        <tr>
                            <th className="table-header">Name</th>
                            <th className="table-header">Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {draws
                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) // Sort draws by date descending
                            .slice(0, visibleDraws)
                            .map((draw, index) => (
                                <tr key={draw.draw_name} onClick={() => handleDrawSelect(draw)}>
                                    <td className="table-data">{draw.draw_name}</td>
                                    <td className="table-data">{new Date(draw.created_at).toLocaleDateString()}</td>
                                </tr>
                            ))}
                    </tbody>
                </table>
            </div>
            {showMore && <button className="button" onClick={handleShowMore}>Show More</button>}

            <div>
                <div className="same-row">
                    <h2>{selectedDrawName}</h2>
                    <button onClick={toggleHandicap}>{showHandicap ? 'Hide' : 'Show'} Handicap</button>
                </div>
                {renderDraw()}
                <div>
                    {renderDrawDetails()}
                </div>
            </div>
        </div>
    );
};

const Round = React.memo(({ round, roundIndex, showHandicap }) => {
    return (
        <div className="round-container" style={{ marginBottom: `${20 * roundIndex}px` }}>
            <h3>Round {round.round}</h3>
            {round.matches.map((match, matchIndex) => (
                <Match key={matchIndex} match={match} showHandicap={showHandicap} />
            ))}
        </div>
    );
});


const Match = React.memo(({ match, showHandicap }) => {
    return (
        <div className="match-container">
            {match.subBoxes.map((subBox, subBoxIndex) => (
                <SubBox key={subBoxIndex} subBox={subBox} showHandicap={showHandicap} />
            ))}
        </div>
    );
});

const SubBox = React.memo(({ subBox, showHandicap }) => {
    return (
        <div className="sub-box">
            <span>
                {subBox.playerName} {showHandicap && subBox.handicap !== '' && `[${subBox.handicap}]`}
            </span>
            <input
                className="score-input"
                type="text"
                value={subBox.score || ''}
                placeholder="Score"
                readOnly
            />
        </div>
    );
});


export default Results;
