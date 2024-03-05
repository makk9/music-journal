import React, { useState } from 'react';
import './JournalEntry.css';

/** TODO: 
 * Add attaching image capability to entry
 * Journal Entry Title
 */
function JournalEntry({ currentTrack }) {
    const [entryTitle, setEntryTitle] = useState(function () {
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' };
        const timeOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
        const currentDate = new Date();
        const dateString = currentDate.toLocaleDateString('en-US', dateOptions);
        const timeString = currentDate.toLocaleTimeString('en-US', timeOptions);
      
        return `${dateString} at ${timeString}`;
      });
    const [entryText, setEntryText] = useState('');
    const [imageURL, setImageURL] = useState('');

    const handleSave = async () => {
        try {
            const journalResponse = await fetch('/journal', {
                method: 'POST',
                headers: {
                    // header for Express to correctly parse req body
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    trackID: currentTrack.id, 
                    entryTitle,
                    entryText, 
                    imageURL }),
            });

            if (!journalResponse.ok) {
                throw new Error('Failed to save journal entry');
            }

            const trackResponse = await fetch('/track', {
                method: 'POST',
                headers: {
                    // header for Express to correctly parse req body
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    spotifyTrackID: currentTrack.id, 
                    trackTitle: currentTrack.name, 
                    artist: currentTrack.artists[0].name, 
                    album: currentTrack.album.name }),
            });

            if (!trackResponse.ok) {
                throw new Error('Failed to add linked track');
            }

            // Handle the response, clear the text & image area, give user feedback
            setEntryText('');
            setImageURL('');
            alert('Journal entry saved!');
        } catch (error) {
            // Handle error state, provide user feedback
            console.error('Error saving journal entry:', error);
            alert('Error saving journal entry.');
        }
    };

    return (
        <>
        <div className="journal-entry">
            <input
                type="text"
                value={entryTitle}
                onChange={(e) => setEntryTitle(e.target.value)}
                className="journal-entry-title"
                aria-label="Entry Title"
            />
            <textarea
                value={entryText}
                onChange={(e) =>  {
                    setEntryText(e.target.value);
                    // hardcoding image value for now
                    setImageURL('Batman.jpg');
                }}
                placeholder="Write your journal entry here..."
            />
            <button onClick={handleSave}>Save Entry</button>
        </div>
        </>
    );
}

export default JournalEntry;
