import React, { useState, useEffect, useCallback } from 'react';
import supabase from './supabase'; // Import your Supabase client
import '../style/ongoing.css';

const Ongoing = () => {
  const [selectedDraw, setSelectedDraw] = useState(null);
  const [error, setError] = useState(null);
  const [selectedDrawName, setSelectedDrawName] = useState(null);
  const [showHandicap, setShowHandicap] = useState(false); // State to track handicap visibility

  const fetchDraws = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('knockoutdraw').select('*').order('created_at', { ascending: false }).limit(1);
      if (error) {
        throw error;
      }
      if (data.length > 0) {
        handleDrawSelect(data[0]); // Select the latest draw
      }
    } catch (error) {
      console.error('Error fetching draws:', error);
      setError('Failed to fetch draw data');
    }
  }, []);

  useEffect(() => {
    fetchDraws();
  }, [fetchDraws]);

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

  const toggleHandicap = () => {
    setShowHandicap(!showHandicap); // Toggle handicap visibility
  };

  const renderDraw = () => {
    if (!selectedDraw) {
      return <p>Error!</p>;
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

  return (
    <div>
      {error && <p>{error}</p>}
      <div>
        <div className="same-row">
          <h2>{selectedDrawName}</h2>
          <button onClick={toggleHandicap}>{showHandicap ? 'Hide' : 'Show'} Handicap</button>
        </div>
        {renderDraw()}
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

export default Ongoing;
