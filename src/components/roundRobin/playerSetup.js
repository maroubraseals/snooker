import React, { useState, useEffect } from 'react';
import supabase from '../supabase';

function PlayerSetup({ numPlayers, setPlayers, nextStep, prevStep }) {
  const [players, setPlayersList] = useState([]);
  const [selectedPlayers, setSelectedPlayers] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch player data from Supabase
    const fetchPlayers = async () => {
      setLoading(true);
      setError(''); // Clear previous error

      const { data, error } = await supabase
        .from('players')
        .select('name, handicap_round');

      if (error) {
        setError('Error fetching players.');
        console.error('Error fetching players:', error);
        setLoading(false);
        return;
      }

      if (data.length === 0) {
        setError('No players found.');
        setLoading(false);
        return;
      }

      // Rename `round_handicap` to `handicap` in the fetched data
      const playersWithHandicap = data.map(player => ({
        ...player,
        handicap: player.handicap_round
      }));

      setPlayersList(playersWithHandicap);
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  const handleCheckboxChange = (player) => {
    setSelectedPlayers(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (newSelected.has(player)) {
        newSelected.delete(player);
      } else {
        newSelected.add(player);
      }
      return newSelected;
    });
  };

  const handleSubmit = () => {
    if (selectedPlayers.size !== numPlayers) {
      alert(`Please select exactly ${numPlayers} players.`);
      return;
    }

    setLoading(true);
    setError(''); // Clear previous error

    setPlayers(Array.from(selectedPlayers));
    setLoading(false);
    nextStep();
  };

  return (
    <div>
      {loading && <div className="loading">Loading...</div>}
      {error && <p className="error">{error}</p>}

      <h2>Select Players</h2>
      {players.map((player, index) => (
        <div key={index}>
          <label>
            <input
              type="checkbox"
              checked={selectedPlayers.has(player)}
              onChange={() => handleCheckboxChange(player)}
              disabled={loading}
            />
            {player.name} (Handicap: {player.handicap})
          </label>
        </div>
      ))}
      <button onClick={prevStep} disabled={loading}>Back</button>
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? 'Processing...' : 'Generate League'}
      </button>
    </div>
  );
}

export default PlayerSetup;
