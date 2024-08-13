import React, { useEffect, useState } from 'react';

function KnockoutBracket({ rounds, onMatchClick, onScoreSubmit }) {
    const [knockoutScores, setKnockoutScores] = useState({ player1Score: '', player2Score: '' });

  return (
    <div>
      <h2>Knockout Rounds</h2>
      {rounds.map((round, roundIndex) => (
        <div key={roundIndex}>
          <h3>Round {roundIndex + 1}</h3>
          {round.matches.map((match, matchIndex) => (
            <div key={matchIndex} onClick={() => onMatchClick(roundIndex, matchIndex)}>
              <p>{match.player1?.name || 'TBD'} vs {match.player2?.name || 'TBD'}</p>
              {(match.score1 !== undefined || match.score2 !== undefined) && (
                <form onSubmit={onScoreSubmit}>
                  <input
                    type="number"
                    name="player1Score"
                    value={match.score1 || ''}
                    onChange={(e) => setKnockoutScores({ ...knockoutScores, player1Score: e.target.value })}
                    placeholder="Score for player 1"
                  />
                  <input
                    type="number"
                    name="player2Score"
                    value={match.score2 || ''}
                    onChange={(e) => setKnockoutScores({ ...knockoutScores, player2Score: e.target.value })}
                    placeholder="Score for player 2"
                  />
                  <button type="submit">Submit Scores</button>
                </form>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export default KnockoutBracket;
