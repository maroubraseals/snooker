import React, { useState, useEffect } from 'react';
import supabase from './supabase';
import '../components/roundRobin/matchesDisplay.css';

const PlayersForm = () => {
    const [name, setName] = useState('');
    const [handicap, setHandicap] = useState(0);
    const [handicap_round, setLeagueHandicap] = useState(0);

    const [availability, setAvailability] = useState(false);
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [editPlayerId, setEditPlayerId] = useState(null);

    useEffect(() => {
        fetchPlayers();
    }, []);

    const fetchPlayers = async () => {
        setLoading(true);
        setError('');
        try {
            const { data, error } = await supabase.from('players').select('*');
            if (error) throw error;

            // Sort players alphabetically by name
            const sortedPlayers = data.sort((a, b) => a.name.localeCompare(b.name));
            setPlayers(sortedPlayers);
        } catch (error) {
            setError('Error fetching players: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!name || handicap === '') {
            setError('Name and Handicap are required.');
            return;
        }

        // Check for duplicate player if not in edit mode
        if (!editMode && players.some(player => player.name === name)) {
            setError('Player with this name already exists.');
            return;
        }

        try {
            if (editMode) {
                const { data, error } = await supabase
                    .from('players')
                    .update({ name, handicap_round, handicap, availability })
                    .eq('id', editPlayerId);

                if (error) throw error;

                setSuccess('Player updated successfully!');
                setEditMode(false);
                setEditPlayerId(null);
            } else {
                const { data, error } = await supabase.from('players').insert([
                    { name, handicap_round, handicap, availability },
                ]);

                if (error) throw error;

                setSuccess('Player added successfully!');
            }

            setName('');
            setLeagueHandicap(0);
            setHandicap(0);
            setAvailability(false);
            fetchPlayers();
        } catch (error) {
            setError('Error saving player data: ' + error.message);
        }
    };

    const handleEdit = (player) => {
        setName(player.name);
        setLeagueHandicap(player.handicap_round);
        setHandicap(player.handicap);
        setAvailability(player.availability);
        setEditPlayerId(player.id);
        setEditMode(true);
    };

    const handleAvailabilityToggle = async (playerId, newAvailability) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('players')
                .update({ availability: newAvailability })
                .eq('id', playerId);

            if (error) throw error;

            fetchPlayers();
        } catch (error) {
            console.error('Error updating availability:', error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="players-container">
            <h2>{editMode ? 'Edit Player' : 'Add New Player'}</h2>
            <form onSubmit={handleSubmit} className="players-form">
                {error && <p className="error-message">{error}</p>}
                {success && <p className="success-message">{success}</p>}
                <label className="form-label">
                    Name:
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="form-input"
                        required
                    />
                </label>
                <br />
                <label className="form-label">
                    League Handicap:
                    <input
                        type="number"
                        value={handicap_round}
                        onChange={(e) => setLeagueHandicap(Number(e.target.value))}
                        className="form-input"
                        required
                    />
                </label>
                <br />
                <label className="form-label">
                    Handicap:
                    <input
                        type="number"
                        value={handicap}
                        onChange={(e) => setHandicap(Number(e.target.value))}
                        className="form-input"
                        required
                    />
                </label>
                <br />
                <label className="form-label">
                    Availability:
                    <input
                        type="checkbox"
                        checked={availability}
                        onChange={(e) => setAvailability(e.target.checked)}
                        className="form-checkbox"
                    />
                </label>
                <br />
                <button type="submit" className="submit-button">{editMode ? 'Update' : 'Submit'}</button>
                {editMode && (
                    <button
                        type="button"
                        className="cancel-button"
                        onClick={() => {
                            setEditMode(false);
                            setEditPlayerId(null);
                            setName('');
                            setHandicap(0);
                            setAvailability(false);
                        }}
                    >
                        Cancel
                    </button>
                )}
            </form>

            <h2 className="players-list-title">Players List</h2>
            {loading ? (
                <div>Loading...</div>
            ) : (
                <table className="group-table">
                    <thead>
                        <tr>
                            <th >Index</th>
                            <th >Name</th>
                            <th >League Handicap</th>
                            <th >Handicap</th>
                            <th >Availability</th>
                            <th >Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {players.map((player, index) => (
                            <tr key={player.id} >
                                <td >{index + 1}</td>
                                <td >{player.name}</td>
                                <td >{player.handicap_round}</td>
                                <td >{player.handicap}</td>
                                <td >
                                    <input
                                        type="checkbox"
                                        checked={player.availability}
                                        onChange={(e) =>
                                            handleAvailabilityToggle(player.id, e.target.checked)
                                        }
                                        className="form-checkbox"
                                    />
                                </td>
                                <td >
                                    <button
                                        className="edit-button"
                                        onClick={() => handleEdit(player)}
                                    >
                                        Edit
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default PlayersForm;
