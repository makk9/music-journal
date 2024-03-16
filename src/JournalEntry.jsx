import React, { useState, useEffect } from "react";
import "./JournalEntry.css";
import vinylIcon from "./animated-vinyl.png";

/** TODO:
 * Add attaching image capability to entry
 */

function getDefaultEntryTitle() {
  const dateOptions = { weekday: "long", year: "numeric", month: "short", day: "numeric" };
  const timeOptions = { hour: "numeric", minute: "2-digit", hour12: true };
  const currentDate = new Date();
  const dateString = currentDate.toLocaleDateString("en-US", dateOptions);
  const timeString = currentDate.toLocaleTimeString("en-US", timeOptions);

  return `${dateString} at ${timeString}`;
}

function JournalEntry({ currentTrack, refreshJournalEntries, activeEntry, isCreatingNewEntry, setIsCreatingNewEntry, linkedTrack, isMusicPlaying }) {
  const [entryTitle, setEntryTitle] = useState(getDefaultEntryTitle);
  const [entryText, setEntryText] = useState("");
  const [imageURL, setImageURL] = useState("");

  const vinylClass = `vinyl-icon ${isMusicPlaying ? "vinyl-spinning" : "vinyl-paused"}`;

  useEffect(() => {
    if (isCreatingNewEntry) {
      setEntryTitle(getDefaultEntryTitle);
      setEntryText("");
      setImageURL("");
      setIsCreatingNewEntry(false); // want to reset back to false after we have already reset journal state
    }
  }, [isCreatingNewEntry, setIsCreatingNewEntry]);

  // When activeEntry changes, populate the state if it's not null
  useEffect(() => {
    if (activeEntry) {
      setEntryTitle(activeEntry.entryTitle);
      setEntryText(activeEntry.entryText);
      setImageURL(activeEntry.imageURL);
    }
  }, [activeEntry]);

  async function handleSave() {
    // For updating an existing journal entry
    if (activeEntry) {
      // Call Put Journal Entry Endpoint that updates journal entry
      const journalResponse = await fetch(`/journal/${activeEntry.entryID}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        params: JSON.stringify({
          entryID: activeEntry.entryID,
        }),
        body: JSON.stringify({
          entryTitle,
          entryText,
          imageURL,
        }),
      });

      if (!journalResponse.ok) {
        throw new Error("Failed to save journal entry");
      }

      alert("Journal entry updated!");
    } 
    // User is creating and adding a new journal entry
    else {
      try {
        // Call Add Track Endpoint
        const trackResponse = await fetch("/track", {
          method: "POST",
          headers: {
            // header for Express to correctly parse req body
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            spotifyTrackID: currentTrack.id,
            trackTitle: currentTrack.name,
            artist: currentTrack.artists.map((artist) => artist.name).join(", "),
            album: currentTrack.album.name,
          }),
        });

        if (!trackResponse.ok) {
          throw new Error("Failed to add linked track");
        }

        // Call Add Journal Entry Endpoint
        const journalResponse = await fetch("/journal", {
          method: "POST",
          headers: {
            // header for Express to correctly parse req body
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            trackID: currentTrack.id,
            journalCover: currentTrack.album.images[0].url,
            entryTitle,
            entryText,
            imageURL,
          }),
        });

        if (!journalResponse.ok) {
          throw new Error("Failed to save journal entry");
        }

        // refreshJournalEntries(); // refresh journal collection
        // // Handle the response, clear the text & image area, give user feedback
        // setEntryTitle(getDefaultEntryTitle);
        // setEntryText("");
        // setImageURL("");
        alert("Journal entry saved!");
      } catch (error) {
        // Handle error state, provide user feedback
        console.error("Error saving journal entry:", error);
        alert("Error saving journal entry.");
      }
    }
    refreshJournalEntries(); // refresh journal collection
    // Handle the response, clear the text & image area, give user feedback
    setEntryTitle(getDefaultEntryTitle);
    setEntryText("");
    setImageURL("");
  }

  return (
    <>
      <div className="journal-entry">
        <input
          className="journal-entry-title"
          type="text"
          value={entryTitle}
          onChange={(e) => setEntryTitle(e.target.value)}
          aria-label="Entry Title"
        />
        <textarea
          value={entryText}
          onChange={(e) => {
            setEntryText(e.target.value);
            // hardcoding image value for now
            setImageURL("Batman.jpg");
          }}
          placeholder="Write your journal entry here..."
        />
        <button onClick={handleSave}>Save Entry</button>
        <div className="journal-entry-vinyl">
          <img src={vinylIcon} alt="Vinyl" className={vinylClass} />
          <div className="track-hover-info">
            {linkedTrack // Check if linkedTrack is not null
              ? `${linkedTrack.trackTitle} by ${linkedTrack.artist}`
              : currentTrack && currentTrack.name.length > 1 // Default to currentTrack if linkedTrack is null
              ? `${currentTrack.name} by ${currentTrack.artists.map((artist) => artist.name).join(", ")}`
              : "No track linked"}
          </div>
        </div>
      </div>
    </>
  );
}

export default JournalEntry;
