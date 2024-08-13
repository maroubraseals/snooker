import React from 'react';
import '../style/drawDetails.css'; // Import the CSS file

const DrawDetails = ({ selectedDraw, updateScores, handleMatchSelection }) => {
    const renderDrawDetails = (draw) => {
        return draw.map((round, roundIndex) => (
            <React.Fragment key={roundIndex}>
                {roundIndex > 0 && (
                    <tr key={`round-break-${roundIndex}`}>
                        <td colSpan="6" className="round-break">Round Break</td>
                    </tr>
                )}
                {round.matches.map((match, matchIndex) => {
                    const player1 = match.subBoxes[0];
                    const player2 = match.subBoxes[1];
                    if (player1 && player1.playerName && player2 && player2.playerName) {
                        return (
                            <tr key={`${roundIndex}-${matchIndex}`} onClick={() => handleMatchSelection(match)} className="match-row">
                                <td>{round.round}</td>
                                <td>{matchIndex + 1}</td>
                                <td>{player1.playerName}</td>
                                <td>
                                    {player1.frameWins}
                                    <button onClick={() => updateScores(player1, roundIndex, matchIndex, 0)} className="edit-score-button">Edit</button>
                                </td>
                                <td>{player2.playerName}</td>
                                <td>
                                    {player2.frameWins}
                                    <button onClick={() => updateScores(player2, roundIndex, matchIndex, 1)} className="edit-score-button">Edit</button>
                                </td>
                            </tr>
                        );
                    }
                    return null;
                })}
            </React.Fragment>
        ));
    };

    return (
        <div className="draw-details">
            <h2 className="draw-details-heading">Draw Details</h2>
            <table className="draw-details-table">
                <thead>
                    <tr>
                        <th>Round</th>
                        <th>Match</th>
                        <th>Player 1</th>
                        <th>Player 1 Wins</th>
                        <th>Player 2</th>
                        <th>Player 2 Wins</th>
                    </tr>
                </thead>
                <tbody>
                    {renderDrawDetails(selectedDraw)}
                </tbody>
            </table>
        </div>
    );
};

export default DrawDetails;
